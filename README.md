
# Web Command Center

A simple web-based terminal that can execute commands either locally in the browser or on a remote server via WebSockets.

## Features

- Web terminal with local and server modes
- File sharing functionality (simulated without actual Supabase integration)
- Settings management for backend configurations
- Responsive design for desktop and mobile

## Project Structure

```
.
├── index.html           # Main HTML file
├── css/
│   └── styles.css       # CSS styles
├── js/
│   └── app.js           # Frontend JavaScript
├── server.py            # Python backend server (FastAPI)
└── requirements.txt     # Python dependencies
```

## Setup

### Frontend

Simply serve the HTML, CSS, and JavaScript files using any static file server. For example:

```bash
# Using Python's built-in HTTP server
python -m http.server 3000
```

Then open your browser at `http://localhost:3000`.

### Backend

1. Set up a Python virtual environment (recommended):

```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

2. Install the required dependencies:

```bash
pip install -r requirements.txt
```

3. Run the FastAPI server:

```bash
python server.py
```

The WebSocket server will be available at `ws://localhost:8000/ws`.

## Usage

1. Open the web application in your browser.
2. By default, the terminal runs in "Local Mode" which simulates a shell environment in the browser.
3. To connect to the actual backend server:
   - Go to the Settings tab
   - In the "Terminal Server" settings, ensure the WebSocket URL is set correctly (default: `ws://localhost:8000/ws`)
   - Return to the Terminal tab and toggle off "Local Mode"
4. Now you can run real commands that will be executed on the server

## Available Commands in Local Mode

- `help` - Show available commands
- `echo [text]` - Echo text
- `ls` - List directory contents (simulated)
- `cd [directory]` - Change directory (simulated)
- `pwd` - Print working directory
- `clear` - Clear the terminal
- `date` - Show the current date
- `whoami` - Show the current user
- `mkdir [directory]` - Create a directory (simulated)
- `touch [file]` - Create a file (simulated)
- `cat [file]` - Show file contents (simulated)
- `rm [file]` - Remove a file (simulated)
- `uname` - Show system information

## Notes

- The Supabase integration is simulated. In a real application, you would need to use the Supabase JavaScript client to interact with your Supabase backend.
- File uploads are simulated and don't actually store files on a server. In a production environment, you would upload files to Supabase Storage or another storage service.
