
# Web Terminal Backend

This is a FastAPI-based backend that provides real terminal functionality for the Web Command Center.

## Features

- WebSocket connection for real-time command execution
- Supports most shell commands
- Maintains separate working directories for each client
- Handles command output and errors
- Changes directories using the `cd` command

## Setup

1. Install the required packages:

```bash
pip install -r requirements.txt
```

2. Run the server:

```bash
python main.py
```

The server will be available at `http://localhost:8000` with WebSocket endpoints at `ws://localhost:8000/ws/terminal`.

## Security Considerations

⚠️ **Warning**: This server executes shell commands directly on the host machine. In a production environment, you should:

- Run this in a containerized or sandboxed environment
- Add proper authentication
- Implement command whitelisting or blacklisting
- Replace the `*` in CORS with your specific frontend domain

## Limitations

- Full support for interactive commands like vim, nano, etc. is limited in a WebSocket environment
- Some terminal features that require direct TTY access may not work as expected
