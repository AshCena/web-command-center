document.addEventListener('DOMContentLoaded', () => {
  // DOM Elements
  const tabButtons = document.querySelectorAll('.tab-button:not(.disabled)');
  const tabContents = document.querySelectorAll('.tab-pane');
  const settingsTabButtons = document.querySelectorAll('.settings-tab-button');
  const settingsPanes = document.querySelectorAll('.settings-pane');
  const terminalInput = document.getElementById('terminal-input');
  const terminalOutput = document.getElementById('terminal-output');
  const clearTerminalButton = document.getElementById('clear-terminal');
  const localModeToggle = document.getElementById('local-mode-toggle');
  const uploadFileButton = document.getElementById('upload-file');
  const fileInput = document.getElementById('file-input');
  const fileList = document.getElementById('file-list');
  const saveSupabaseSettingsButton = document.getElementById('save-supabase-settings');
  const saveTerminalSettingsButton = document.getElementById('save-terminal-settings');
  const testConnectionButton = document.getElementById('test-connection');
  const storageStatusPill = document.getElementById('storage-status');
  const terminalStatusPill = document.getElementById('terminal-status');
  
  // Application State
  let commandHistory = [];
  let historyIndex = -1;
  let isUsingLocalMode = localStorage.getItem('isUsingLocalMode') !== 'false';
  let currentDirectory = '~';
  let websocket = null;
  let files = [];
  
  // Initialize application
  init();
  
  // Initialize the application
  function init() {
    // Load settings from localStorage
    loadSettings();
    
    // Set up event listeners
    setupEventListeners();
    
    // Try to connect to WebSocket server if not in local mode
    if (!isUsingLocalMode) {
      connectToWebSocket();
    }
    
    // Add initial greeting to terminal
    addToTerminal(`Web Command Center v1.0.0`, 'output');
    addToTerminal(`Current directory: ${currentDirectory}`, 'output');
    addToTerminal(`Type 'help' to see available commands.`, 'output');
    
    // Check Supabase connection
    checkSupabaseConnection();
    
    // Load files if Supabase is connected
    if (isSupabaseConnected()) {
      loadFiles();
    }
  }
  
  // Set up event listeners
  function setupEventListeners() {
    // Tab navigation
    tabButtons.forEach(button => {
      button.addEventListener('click', () => {
        if (button.classList.contains('disabled')) return;
        
        tabButtons.forEach(btn => btn.classList.remove('active'));
        tabContents.forEach(content => content.classList.remove('active'));
        
        button.classList.add('active');
        document.getElementById(button.dataset.tab).classList.add('active');
      });
    });
    
    // Settings tab navigation
    settingsTabButtons.forEach(button => {
      button.addEventListener('click', () => {
        settingsTabButtons.forEach(btn => btn.classList.remove('active'));
        settingsPanes.forEach(pane => pane.classList.remove('active'));
        
        button.classList.add('active');
        document.getElementById(`${button.dataset.settingsTab}-settings`).classList.add('active');
      });
    });
    
    // Terminal input handling
    terminalInput.addEventListener('keydown', handleTerminalInput);
    
    // Clear terminal button
    clearTerminalButton.addEventListener('click', clearTerminal);
    
    // Local mode toggle
    localModeToggle.addEventListener('change', toggleLocalMode);
    localModeToggle.checked = isUsingLocalMode;
    
    // File upload handling
    uploadFileButton.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', handleFileUpload);
    
    // Settings save
    saveSupabaseSettingsButton.addEventListener('click', saveSupabaseSettings);
    saveTerminalSettingsButton.addEventListener('click', saveTerminalSettings);
    testConnectionButton.addEventListener('click', testWebSocketConnection);
  }
  
  // Handle terminal input
  async function handleTerminalInput(e) {
    if (e.key === 'Enter') {
      e.preventDefault();
      const command = terminalInput.value.trim();
      
      if (command) {
        // Add command to terminal
        addToTerminal(`$ ${command}`, 'input');
        
        // Add to history
        commandHistory.unshift(command);
        historyIndex = -1;
        
        // Process command
        await processCommand(command);
        
        // Clear input
        terminalInput.value = '';
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (commandHistory.length > 0) {
        historyIndex = Math.min(historyIndex + 1, commandHistory.length - 1);
        terminalInput.value = commandHistory[historyIndex];
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndex > 0) {
        historyIndex--;
        terminalInput.value = commandHistory[historyIndex];
      } else if (historyIndex === 0) {
        historyIndex = -1;
        terminalInput.value = '';
      }
    }
  }
  
  // Process command
  async function processCommand(command) {
    try {
      if (isUsingLocalMode) {
        // Process command locally
        const output = executeLocalCommand(command);
        addToTerminal(output, 'output');
        
        // Save command to Supabase if connected
        if (isSupabaseConnected()) {
          await saveCommandToSupabase(command, output);
        }
      } else {
        // Send command to WebSocket server
        if (websocket && websocket.readyState === WebSocket.OPEN) {
          websocket.send(JSON.stringify({ 
            command: command, 
            cwd: currentDirectory 
          }));
        } else {
          addToTerminal('Terminal server disconnected. Trying to reconnect...', 'output');
          await connectToWebSocket();
          
          if (websocket && websocket.readyState === WebSocket.OPEN) {
            websocket.send(JSON.stringify({ 
              command: command, 
              cwd: currentDirectory 
            }));
          } else {
            addToTerminal('Failed to connect to terminal server. Switching to local mode.', 'output');
            isUsingLocalMode = true;
            localModeToggle.checked = true;
            updateTerminalStatus(false);
            processCommand(command);
          }
        }
      }
    } catch (error) {
      console.error('Error processing command:', error);
      addToTerminal(`Error: ${error.message}`, 'output');
    }
  }
  
  // Execute local command
  function executeLocalCommand(command) {
    const parts = command.split(' ');
    const cmd = parts[0].toLowerCase();
    const args = parts.slice(1);
    
    switch (cmd) {
      case 'help':
        return `
Available commands:
  help                   - Show this help message
  echo [text]            - Echo text
  ls                     - List directory contents (simulated)
  cd [directory]         - Change directory (simulated)
  pwd                    - Print working directory
  clear                  - Clear the terminal
  date                   - Show the current date
  whoami                 - Show the current user
  mkdir [directory]      - Create a directory (simulated)
  touch [file]           - Create a file (simulated)
  cat [file]             - Show file contents (simulated)
  rm [file]              - Remove a file (simulated)
  uname                  - Show system information
`;
      
      case 'echo':
        return args.join(' ');
      
      case 'ls':
        return `
file1.txt
file2.txt
directory1/
directory2/
`;
      
      case 'cd':
        if (args.length === 0 || args[0] === '~') {
          currentDirectory = '~';
        } else if (args[0] === '..') {
          if (currentDirectory !== '~') {
            const parts = currentDirectory.split('/');
            parts.pop();
            currentDirectory = parts.join('/') || '~';
          }
        } else {
          currentDirectory = args[0].startsWith('/')
            ? args[0]
            : `${currentDirectory === '~' ? '~' : currentDirectory}/${args[0]}`;
        }
        return `Changed directory to ${currentDirectory}`;
      
      case 'pwd':
        return currentDirectory === '~' ? '/home/user' : currentDirectory;
      
      case 'clear':
        clearTerminal();
        return '';
      
      case 'date':
        return new Date().toString();
      
      case 'whoami':
        return 'user';
      
      case 'mkdir':
        return args.length > 0 
          ? `Directory created: ${args[0]}`
          : 'Error: mkdir requires a directory name';
      
      case 'touch':
        return args.length > 0 
          ? `File created: ${args[0]}`
          : 'Error: touch requires a file name';
      
      case 'cat':
        if (args.length === 0) {
          return 'Error: cat requires a file name';
        }
        return `This is the simulated content of ${args[0]}`;
      
      case 'rm':
        return args.length > 0 
          ? `File removed: ${args[0]}`
          : 'Error: rm requires a file name';
      
      case 'uname':
        return 'Web Command Center';
      
      default:
        return `Command not found: ${cmd}. Type 'help' for available commands.`;
    }
  }
  
  // Add content to terminal
  function addToTerminal(content, type) {
    const element = document.createElement('div');
    element.classList.add(`command-${type}`);
    element.textContent = content;
    terminalOutput.appendChild(element);
    terminalOutput.scrollTop = terminalOutput.scrollHeight;
  }
  
  // Clear terminal
  function clearTerminal() {
    terminalOutput.innerHTML = '';
  }
  
  // Toggle local mode
  function toggleLocalMode() {
    isUsingLocalMode = localModeToggle.checked;
    
    if (isUsingLocalMode) {
      addToTerminal('Switched to local mode', 'output');
      updateTerminalStatus(false);
      if (websocket) {
        websocket.close();
      }
    } else {
      addToTerminal('Switched to server mode, connecting...', 'output');
      connectToWebSocket();
    }
    
    // Save preference
    localStorage.setItem('isUsingLocalMode', isUsingLocalMode);
  }
  
  // Connect to WebSocket server
  async function connectToWebSocket() {
    try {
      const wsUrl = localStorage.getItem('websocketUrl') || 'ws://localhost:8000/ws';
      
      if (websocket) {
        websocket.close();
      }
      
      websocket = new WebSocket(wsUrl);
      
      websocket.onopen = () => {
        addToTerminal('Connected to terminal server', 'output');
        updateTerminalStatus(true);
      };
      
      websocket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          if (data.output) {
            addToTerminal(data.output, 'output');
          }
          
          if (data.error) {
            addToTerminal(`Error: ${data.error}`, 'output');
          }
          
          // Update working directory if provided
          if (data.cwd) {
            currentDirectory = data.cwd;
            updatePrompt();
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
          addToTerminal(`Error: ${error.message}`, 'output');
        }
      };
      
      websocket.onclose = () => {
        if (!isUsingLocalMode) {
          addToTerminal('Disconnected from terminal server', 'output');
          updateTerminalStatus(false);
        }
      };
      
      websocket.onerror = (error) => {
        console.error('WebSocket error:', error);
        addToTerminal('Error connecting to terminal server', 'output');
        updateTerminalStatus(false);
        
        if (!isUsingLocalMode) {
          addToTerminal('Switching to local mode', 'output');
          isUsingLocalMode = true;
          localModeToggle.checked = true;
        }
      };
    } catch (error) {
      console.error('Error connecting to WebSocket:', error);
      addToTerminal(`Error: ${error.message}`, 'output');
      updateTerminalStatus(false);
    }
  }
  
  // Update the prompt to show current directory
  function updatePrompt() {
    const promptDisplay = document.querySelector('.terminal-input-container .prompt');
    if (promptDisplay) {
      promptDisplay.textContent = `[${currentDirectory}]$`;
    }
  }
  
  // Test WebSocket connection
  async function testWebSocketConnection() {
    try {
      const wsUrl = document.getElementById('websocket-url').value;
      
      if (!wsUrl) {
        showToast('Please enter a WebSocket URL', 'error');
        return;
      }
      
      const testSocket = new WebSocket(wsUrl);
      
      testSocket.onopen = () => {
        showToast('Connection successful!', 'success');
        testSocket.close();
      };
      
      testSocket.onerror = () => {
        showToast('Connection failed', 'error');
      };
    } catch (error) {
      console.error('Error testing WebSocket connection:', error);
      showToast(`Error: ${error.message}`, 'error');
    }
  }
  
  // Update terminal status pill
  function updateTerminalStatus(connected) {
    if (connected) {
      terminalStatusPill.textContent = 'Terminal Connected';
      terminalStatusPill.classList.add('ws-connected');
    } else {
      terminalStatusPill.textContent = 'Terminal Disconnected';
      terminalStatusPill.classList.remove('ws-connected');
    }
  }
  
  // Handle file upload
  async function handleFileUpload(e) {
    if (!isSupabaseConnected()) {
      showToast('Supabase not connected. Please configure in settings.', 'error');
      return;
    }
    
    const file = e.target.files[0];
    if (!file) return;
    
    try {
      showToast('Uploading file...', 'info');
      
      // For demo purposes, we're just simulating the upload
      // In a real app, you would upload to Supabase storage
      setTimeout(() => {
        const newFile = {
          id: Date.now().toString(),
          name: file.name,
          size: file.size,
          type: file.type,
          url: URL.createObjectURL(file),
          created_at: new Date().toISOString()
        };
        
        files.push(newFile);
        renderFiles();
        showToast('File uploaded successfully!', 'success');
      }, 1000);
    } catch (error) {
      console.error('Error uploading file:', error);
      showToast(`Error: ${error.message}`, 'error');
    }
    
    // Reset file input
    fileInput.value = '';
  }
  
  // Render files
  function renderFiles() {
    if (files.length === 0) {
      fileList.innerHTML = '<li class="file-empty-state">No files uploaded yet.</li>';
      return;
    }
    
    fileList.innerHTML = '';
    
    files.forEach(file => {
      const li = document.createElement('li');
      li.classList.add('file-item');
      
      const fileSize = formatFileSize(file.size);
      const fileDate = new Date(file.created_at).toLocaleString();
      
      li.innerHTML = `
        <div class="file-name">
          <span class="file-icon">📄</span>
          ${file.name}
        </div>
        <div class="file-info">
          <span class="file-size">${fileSize}</span>
          <span class="file-date">${fileDate}</span>
          <button class="file-action download" data-id="${file.id}">Download</button>
          <button class="file-action delete" data-id="${file.id}">Delete</button>
        </div>
      `;
      
      fileList.appendChild(li);
    });
    
    // Add event listeners to download and delete buttons
    document.querySelectorAll('.file-action.download').forEach(button => {
      button.addEventListener('click', downloadFile);
    });
    
    document.querySelectorAll('.file-action.delete').forEach(button => {
      button.addEventListener('click', deleteFile);
    });
  }
  
  // Format file size
  function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
  
  // Download file
  function downloadFile(e) {
    const fileId = e.target.dataset.id;
    const file = files.find(f => f.id === fileId);
    
    if (file) {
      const a = document.createElement('a');
      a.href = file.url;
      a.download = file.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  }
  
  // Delete file
  function deleteFile(e) {
    const fileId = e.target.dataset.id;
    
    // Filter out the file
    files = files.filter(f => f.id !== fileId);
    
    // Re-render files
    renderFiles();
    
    showToast('File deleted', 'success');
  }
  
  // Load settings from localStorage
  function loadSettings() {
    // Load Supabase settings
    const projectUrl = localStorage.getItem('supabaseProjectUrl');
    const apiKey = localStorage.getItem('supabaseApiKey');
    
    if (projectUrl) {
      document.getElementById('project-url').value = projectUrl;
    }
    
    if (apiKey) {
      document.getElementById('api-key').value = apiKey;
    }
    
    // Load WebSocket settings
    const websocketUrl = localStorage.getItem('websocketUrl');
    
    if (websocketUrl) {
      document.getElementById('websocket-url').value = websocketUrl;
    }
    
    // Load local mode setting
    const localMode = localStorage.getItem('isUsingLocalMode');
    
    if (localMode !== null) {
      isUsingLocalMode = localMode === 'true';
      localModeToggle.checked = isUsingLocalMode;
    }
  }
  
  // Save Supabase settings
  function saveSupabaseSettings() {
    const projectUrl = document.getElementById('project-url').value;
    const apiKey = document.getElementById('api-key').value;
    
    localStorage.setItem('supabaseProjectUrl', projectUrl);
    localStorage.setItem('supabaseApiKey', apiKey);
    
    showToast('Supabase settings saved', 'success');
    checkSupabaseConnection();
  }
  
  // Save terminal settings
  function saveTerminalSettings() {
    const websocketUrl = document.getElementById('websocket-url').value;
    
    localStorage.setItem('websocketUrl', websocketUrl);
    
    showToast('Terminal settings saved', 'success');
    
    // Reconnect if in server mode
    if (!isUsingLocalMode) {
      connectToWebSocket();
    }
  }
  
  // Check if Supabase is connected
  function isSupabaseConnected() {
    const projectUrl = localStorage.getItem('supabaseProjectUrl');
    const apiKey = localStorage.getItem('supabaseApiKey');
    
    return !!(projectUrl && apiKey);
  }
  
  // Check Supabase connection
  function checkSupabaseConnection() {
    if (isSupabaseConnected()) {
      storageStatusPill.textContent = 'Storage Connected';
      storageStatusPill.classList.add('connected');
    } else {
      storageStatusPill.textContent = 'Storage Disconnected';
      storageStatusPill.classList.remove('connected');
    }
  }
  
  // Load files (simulated for now)
  function loadFiles() {
    // Simulate loading files
    files = [
      {
        id: '1',
        name: 'example.txt',
        size: 1024,
        type: 'text/plain',
        url: '#',
        created_at: new Date().toISOString()
      },
      {
        id: '2',
        name: 'image.jpg',
        size: 1024 * 1024,
        type: 'image/jpeg',
        url: '#',
        created_at: new Date().toISOString()
      }
    ];
    
    renderFiles();
  }
  
  // Save command to Supabase (simulated for now)
  async function saveCommandToSupabase(command, output) {
    // In a real app, this would save to Supabase
    console.log('Saving command to Supabase:', { command, output });
  }
  
  // Show toast notification
  function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.classList.add('toast', type);
    toast.innerHTML = `
      <span>${message}</span>
      <button class="toast-close">&times;</button>
    `;
    
    document.getElementById('toast-container').appendChild(toast);
    
    // Add event listener to close button
    toast.querySelector('.toast-close').addEventListener('click', () => {
      toast.remove();
    });
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
      toast.remove();
    }, 5000);
  }
  
  // Update prompt on init
  updatePrompt();
});
