
import os
import asyncio
import signal
import json
import subprocess
from datetime import datetime
from typing import Dict, List, Optional, Union

import uvicorn
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# Initialize FastAPI
app = FastAPI(title="Web Command Center Backend")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, replace with your frontend domain
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Active connections
active_connections: List[WebSocket] = []

# Command processes
command_processes: Dict[str, subprocess.Popen] = {}

class CommandRequest(BaseModel):
    command: str
    cwd: Optional[str] = "~"

async def execute_command(websocket: WebSocket, command: str, cwd: str):
    """Execute a shell command and send output to websocket."""
    try:
        # Expand home directory if needed
        if cwd.startswith('~'):
            cwd = os.path.expanduser(cwd)
        
        # Create process
        process = await asyncio.create_subprocess_shell(
            command,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
            stdin=asyncio.subprocess.PIPE,
            cwd=cwd,
            shell=True
        )
        
        # Store process for potential termination
        conn_id = id(websocket)
        command_processes[conn_id] = process
        
        # Read stdout and stderr concurrently
        stdout_task = asyncio.create_task(process.stdout.read())
        stderr_task = asyncio.create_task(process.stderr.read())
        
        # Wait for process to complete
        done, pending = await asyncio.wait(
            [stdout_task, stderr_task],
            return_when=asyncio.FIRST_COMPLETED
        )
        
        # Cancel pending tasks
        for task in pending:
            task.cancel()
        
        # Process output
        output = ""
        error = ""
        
        for task in done:
            if task is stdout_task:
                output = task.result().decode('utf-8', errors='replace')
            elif task is stderr_task:
                error = task.result().decode('utf-8', errors='replace')
        
        # Get current directory after command execution
        current_dir_process = await asyncio.create_subprocess_shell(
            "pwd",
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
            cwd=cwd,
            shell=True
        )
        current_dir_stdout, _ = await current_dir_process.communicate()
        current_dir = current_dir_stdout.decode('utf-8', errors='replace').strip()
        
        # Substitute home directory with ~
        home_dir = os.path.expanduser('~')
        if current_dir.startswith(home_dir):
            current_dir = '~' + current_dir[len(home_dir):]
        
        # Send results
        response = {
            "command": command,
            "output": output,
            "error": error,
            "cwd": current_dir,
            "timestamp": datetime.now().isoformat()
        }
        
        await websocket.send_text(json.dumps(response))
        
        # Clean up
        if conn_id in command_processes:
            del command_processes[conn_id]
        
    except Exception as e:
        # Send error
        error_response = {
            "command": command,
            "error": str(e),
            "timestamp": datetime.now().isoformat()
        }
        await websocket.send_text(json.dumps(error_response))

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    active_connections.append(websocket)
    
    conn_id = id(websocket)
    
    try:
        # Send initial message
        welcome_msg = {
            "output": "Connected to Terminal Server",
            "cwd": os.path.expanduser('~'),
            "timestamp": datetime.now().isoformat()
        }
        await websocket.send_text(json.dumps(welcome_msg))
        
        while True:
            # Receive and parse message
            data = await websocket.receive_text()
            request_data = json.loads(data)
            
            command = request_data.get("command", "")
            cwd = request_data.get("cwd", "~")
            
            # Handle special cases
            if command.lower() == "exit":
                # Close the connection
                break
            
            # Execute command
            await execute_command(websocket, command, cwd)
            
    except WebSocketDisconnect:
        print(f"Client disconnected")
    except Exception as e:
        print(f"Error: {str(e)}")
    finally:
        # Clean up
        if websocket in active_connections:
            active_connections.remove(websocket)
        
        # Terminate any running process
        if conn_id in command_processes:
            try:
                command_processes[conn_id].terminate()
                del command_processes[conn_id]
            except:
                pass

# Handle application shutdown
@app.on_event("shutdown")
async def shutdown_event():
    # Close all websocket connections
    for connection in active_connections:
        await connection.close()
    
    # Terminate all running processes
    for process in command_processes.values():
        try:
            process.terminate()
        except:
            pass

# Main entry point
if __name__ == "__main__":
    uvicorn.run("server:app", host="0.0.0.0", port=8000, reload=True)
