
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
import asyncio
import json
import subprocess
import os
import signal
import sys
from typing import Dict, List, Optional, Set
import logging

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Web Terminal Backend")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, replace with your frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Store active WebSocket connections
active_connections: Set[WebSocket] = set()

# Store active processes
active_processes: Dict[WebSocket, Optional[asyncio.subprocess.Process]] = {}

# Store working directories
working_directories: Dict[WebSocket, str] = {}

# Define terminal colors for pretty output
TERMINAL_COLORS = {
    "reset": "\033[0m",
    "red": "\033[31m",
    "green": "\033[32m",
    "yellow": "\033[33m",
    "blue": "\033[34m",
    "magenta": "\033[35m",
    "cyan": "\033[36m",
    "white": "\033[37m",
    "bold": "\033[1m"
}

@app.get("/")
async def root():
    """Health check endpoint."""
    return {"status": "alive", "message": "Web Terminal Backend is running"}

@app.websocket("/ws/terminal")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    active_connections.add(websocket)
    working_directories[websocket] = os.getcwd()  # Start with current working directory
    
    logger.info(f"New WebSocket connection established. Active connections: {len(active_connections)}")
    
    try:
        # Send welcome message
        await websocket.send_text(json.dumps({
            "type": "command_output",
            "output": f"{TERMINAL_COLORS['green']}Connected to terminal server. Current directory: {working_directories[websocket]}{TERMINAL_COLORS['reset']}\n"
        }))
        
        while True:
            data = await websocket.receive_text()
            try:
                message = json.loads(data)
                if message["type"] == "execute_command":
                    await process_command(websocket, message["command"])
            except json.JSONDecodeError:
                await websocket.send_text(json.dumps({
                    "type": "command_output",
                    "output": f"{TERMINAL_COLORS['red']}Error: Invalid JSON message{TERMINAL_COLORS['reset']}\n"
                }))
            except KeyError:
                await websocket.send_text(json.dumps({
                    "type": "command_output",
                    "output": f"{TERMINAL_COLORS['red']}Error: Missing required fields in message{TERMINAL_COLORS['reset']}\n"
                }))
    except WebSocketDisconnect:
        logger.info("WebSocket disconnected")
    except Exception as e:
        logger.error(f"WebSocket error: {str(e)}")
    finally:
        # Clean up on disconnect
        terminate_process(websocket)
        active_connections.remove(websocket)
        if websocket in working_directories:
            del working_directories[websocket]
        if websocket in active_processes:
            del active_processes[websocket]

async def process_command(websocket: WebSocket, command: str):
    # Special handling for cd command since it affects the shell's state
    if command.strip().startswith("cd "):
        parts = command.strip().split(maxsplit=1)
        if len(parts) > 1:
            target_dir = parts[1]
            try:
                # Handle relative paths and ~ for home directory
                if target_dir.startswith("~"):
                    target_dir = os.path.expanduser(target_dir)
                
                # Handle absolute vs relative paths
                if not os.path.isabs(target_dir):
                    full_path = os.path.join(working_directories[websocket], target_dir)
                else:
                    full_path = target_dir
                
                full_path = os.path.normpath(full_path)
                
                # Check if directory exists
                if os.path.isdir(full_path):
                    working_directories[websocket] = full_path
                    await websocket.send_text(json.dumps({
                        "type": "command_output",
                        "output": f"Changed directory to: {full_path}\n"
                    }))
                else:
                    await websocket.send_text(json.dumps({
                        "type": "command_output",
                        "output": f"{TERMINAL_COLORS['red']}cd: {target_dir}: No such directory{TERMINAL_COLORS['reset']}\n"
                    }))
            except Exception as e:
                await websocket.send_text(json.dumps({
                    "type": "command_output",
                    "output": f"{TERMINAL_COLORS['red']}cd error: {str(e)}{TERMINAL_COLORS['reset']}\n"
                }))
        return
    
    # Handle other commands by spawning a subprocess
    terminate_process(websocket)  # Terminate any existing process
    
    try:
        # Specific handling for clear command
        if command.strip() == "clear":
            await websocket.send_text(json.dumps({
                "type": "command_output",
                "output": "\033[2J\033[H"  # ANSI escape sequence to clear screen
            }))
            return
        
        # Handle pwd command directly to ensure it shows the correct directory
        if command.strip() == "pwd":
            await websocket.send_text(json.dumps({
                "type": "command_output",
                "output": f"{working_directories[websocket]}\n"
            }))
            return
        
        # For interactive commands that need PTY, we'll use a different approach
        # For demonstration, we'll just indicate that these are not fully supported
        interactive_commands = ["vim", "vi", "nano", "less", "more", "top", "htop"]
        for cmd in interactive_commands:
            if command.strip().startswith(cmd + " ") or command.strip() == cmd:
                await websocket.send_text(json.dumps({
                    "type": "command_output",
                    "output": f"{TERMINAL_COLORS['yellow']}Note: Interactive commands like '{cmd}' have limited support in WebSocket terminal.{TERMINAL_COLORS['reset']}\n"
                }))
                # We'll still try to execute it, but it might not work as expected
        
        # Execute the command
        process = await asyncio.create_subprocess_shell(
            command,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
            cwd=working_directories[websocket],
            shell=True
        )
        
        active_processes[websocket] = process
        
        # Stream output in real-time
        async def read_stream(stream, is_error=False):
            prefix = TERMINAL_COLORS['red'] if is_error else ""
            suffix = TERMINAL_COLORS['reset'] if is_error else ""
            
            while True:
                line = await stream.readline()
                if not line:
                    break
                try:
                    decoded_line = line.decode('utf-8')
                    await websocket.send_text(json.dumps({
                        "type": "command_output",
                        "output": f"{prefix}{decoded_line}{suffix}"
                    }))
                except UnicodeDecodeError:
                    # Fall back to latin-1 if utf-8 fails
                    try:
                        decoded_line = line.decode('latin-1')
                        await websocket.send_text(json.dumps({
                            "type": "command_output",
                            "output": f"{prefix}{decoded_line}{suffix}"
                        }))
                    except Exception as e:
                        await websocket.send_text(json.dumps({
                            "type": "command_output",
                            "output": f"{TERMINAL_COLORS['red']}Error decoding output: {str(e)}{TERMINAL_COLORS['reset']}\n"
                        }))
        
        # Read stdout and stderr concurrently
        await asyncio.gather(
            read_stream(process.stdout), 
            read_stream(process.stderr, is_error=True)
        )
        
        # Wait for process to complete
        exit_code = await process.wait()
        
        # Send exit code
        await websocket.send_text(json.dumps({
            "type": "command_output",
            "output": f"\nProcess exited with code {exit_code}\n"
        }))
        
        # Cleanup
        active_processes[websocket] = None
        
    except Exception as e:
        await websocket.send_text(json.dumps({
            "type": "command_output",
            "output": f"{TERMINAL_COLORS['red']}Error executing command: {str(e)}{TERMINAL_COLORS['reset']}\n"
        }))

def terminate_process(websocket: WebSocket):
    """Terminate any running process for this websocket."""
    if websocket in active_processes and active_processes[websocket]:
        try:
            process = active_processes[websocket]
            if process and process.returncode is None:
                # Try to terminate gracefully first
                process.terminate()
                # Force kill after a short delay if it's still running
                # Note: In a real implementation, you'd want to use asyncio.sleep 
                # and proper task cancellation
        except Exception as e:
            logger.error(f"Error terminating process: {str(e)}")
        active_processes[websocket] = None

@app.on_event("shutdown")
async def shutdown_event():
    """Clean up all processes on server shutdown."""
    for websocket in list(active_processes.keys()):
        terminate_process(websocket)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
