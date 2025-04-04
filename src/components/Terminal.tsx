
import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { saveCommand, fetchCommandHistory, createSupabaseClient } from '@/lib/supabase';
import { toast } from 'sonner';
import TerminalCommands from './TerminalCommands';
import { ScrollArea } from '@/components/ui/scroll-area';

interface TerminalEntry {
  input: string;
  output: string | string[];
}

const Terminal = () => {
  const [history, setHistory] = useState<TerminalEntry[]>([]);
  const [currentInput, setCurrentInput] = useState('');
  const [currentDir, setCurrentDir] = useState('/home/user');
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [isBackendConnected, setIsBackendConnected] = useState(false);
  const [isUsingLocalMode, setIsUsingLocalMode] = useState(true);
  const terminalRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Mock file system (for local mode)
  const fileSystem = {
    '/home/user': {
      type: 'dir',
      children: {
        'documents': { type: 'dir', children: {
          'notes.txt': { type: 'file', content: 'Some important notes' },
          'report.pdf': { type: 'file', content: 'PDF Content' }
        }},
        'pictures': { type: 'dir', children: {
          'vacation.jpg': { type: 'file', content: 'Image data' }
        }},
        'hello.txt': { type: 'file', content: 'Hello, World!' }
      }
    }
  };

  // Check if backend is connected
  useEffect(() => {
    const supabase = createSupabaseClient();
    setIsBackendConnected(!!supabase);
    
    // If connected, load command history
    if (supabase) {
      loadCommandHistory();
    }
    
    // Listen for storage changes
    const handleStorageChange = () => {
      const supabase = createSupabaseClient();
      setIsBackendConnected(!!supabase);
    };
    
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // Load command history from Supabase
  const loadCommandHistory = async () => {
    try {
      const { data, error } = await fetchCommandHistory(20);
      
      if (error) {
        console.error('Error loading command history:', error);
        return;
      }
      
      if (data && data.length > 0) {
        // Convert to the format expected by our terminal
        const formattedHistory = data.map(item => ({
          input: item.command,
          output: item.output
        }));
        
        setHistory(formattedHistory);
        setCommandHistory(data.map(item => item.command));
      }
    } catch (error) {
      console.error('Error loading command history:', error);
    }
  };

  // Scroll to bottom when history changes
  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [history]);

  // Focus the input field when terminal is clicked
  const focusInput = () => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  // Process commands
  const processCommand = (cmd: string): string | string[] => {
    // If using real terminal mode, this won't be called
    if (!isUsingLocalMode) {
      return '';
    }
    
    // For local mode, use the existing mock implementation
    const parts = cmd.trim().split(' ');
    const command = parts[0];
    const args = parts.slice(1);

    switch (command) {
      case 'clear':
        setHistory([]);
        return '';
      case 'mode':
        if (args[0] === 'real') {
          setIsUsingLocalMode(false);
          return 'Switched to real terminal mode. Commands will be executed on the server.';
        } else if (args[0] === 'local') {
          setIsUsingLocalMode(true);
          return 'Switched to local mode. Commands will be simulated in the browser.';
        } else {
          return `Current mode: ${isUsingLocalMode ? 'local' : 'real'}. Use 'mode real' or 'mode local' to switch.`;
        }
      case 'ls':
        try {
          const path = args[0] || currentDir;
          let currentNode = navigateToPath(path);
          if (currentNode?.type !== 'dir') {
            return `ls: ${path}: Not a directory`;
          }
          return Object.entries(currentNode.children).map(([name, node]) => {
            const isDir = (node as any).type === 'dir';
            return isDir ? `\x1b[36m${name}/\x1b[0m` : name;
          });
        } catch (e) {
          return `ls: ${args[0]}: No such file or directory`;
        }
      case 'cd':
        try {
          const path = args[0] || '/home/user';
          let targetNode = navigateToPath(path);
          if (targetNode?.type !== 'dir') {
            return `cd: ${path}: Not a directory`;
          }
          
          // Update current directory
          if (path.startsWith('/')) {
            setCurrentDir(path);
          } else if (path === '..') {
            const newPath = currentDir.split('/').slice(0, -1).join('/') || '/';
            setCurrentDir(newPath);
          } else {
            setCurrentDir(currentDir === '/' ? `/${path}` : `${currentDir}/${path}`);
          }
          return '';
        } catch (e) {
          return `cd: ${args[0]}: No such file or directory`;
        }
      case 'pwd':
        return currentDir;
      case 'cat':
        try {
          if (!args[0]) return 'cat: No file specified';
          const node = navigateToPath(args[0]);
          if (node?.type !== 'file') {
            return `cat: ${args[0]}: Not a file`;
          }
          return node.content;
        } catch (e) {
          return `cat: ${args[0]}: No such file or directory`;
        }
      case 'help':
        return [
          'Available commands:',
          'help - Show this help message',
          'clear - Clear the terminal',
          'echo [text] - Display text',
          'ls [path] - List directory contents',
          'cd [path] - Change directory',
          'pwd - Print working directory',
          'cat [file] - Display file contents',
          'status - Check backend connection status'
        ];
      case 'status':
        return isBackendConnected 
          ? 'Backend Status: Connected to Supabase' 
          : 'Backend Status: Not connected. Go to Settings tab to configure Supabase.';
      default:
        return `Command not found: ${command}. Type 'help' for available commands.`;
    }
  };

  // Helper function to navigate to a path in our mock file system
  const navigateToPath = (path: string) => {
    let currentNode = fileSystem;
    let currentPath = '';
    
    // Absolute path
    if (path.startsWith('/')) {
      currentPath = path;
    } 
    // Parent directory
    else if (path === '..') {
      currentPath = currentDir.split('/').slice(0, -1).join('/') || '/';
    }
    // Relative path
    else {
      currentPath = currentDir === '/' ? `/${path}` : `${currentDir}/${path}`;
    }
    
    const parts = currentPath.split('/').filter(p => p);
    let current: any = fileSystem;
    
    // Handle root specially
    if (parts.length === 0) {
      return fileSystem['/home/user'];
    }
    
    // Start at home/user by default
    current = fileSystem['/home/user'];
    
    for (const part of parts) {
      if (current.type !== 'dir' || !current.children[part]) {
        throw new Error('Path not found');
      }
      current = current.children[part];
    }
    
    return current;
  };

  // Handle real terminal command output
  const handleCommandOutput = (output: string) => {
    // Update history with the command output
    setHistory(prev => {
      const lastEntry = prev[prev.length - 1];
      if (lastEntry && lastEntry.input === currentInput) {
        return [...prev.slice(0, -1), { input: lastEntry.input, output }];
      }
      return [...prev, { input: currentInput, output }];
    });
    
    // If the output contains a directory path, update currentDir
    // This is a simple heuristic - a better approach would be for the server to send
    // the new working directory explicitly
    const pwdMatch = output.match(/^(\/[\w\d\/\-_.]+)$/m);
    if (pwdMatch && currentInput.trim() === 'pwd') {
      setCurrentDir(pwdMatch[1]);
    }
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!currentInput.trim()) return;
    
    // Add to command history for up/down navigation
    setCommandHistory(prev => [currentInput, ...prev]);
    setHistoryIndex(-1);
    
    // For real terminal mode, don't process command locally
    if (!isUsingLocalMode) {
      // Just add the command to history, output will come from WebSocket
      setHistory(prev => [...prev, { input: currentInput, output: 'Executing...' }]);
    } else {
      // Process locally
      const output = processCommand(currentInput);
      setHistory(prev => [...prev, { input: currentInput, output }]);
      
      // Save to Supabase if connected
      if (isBackendConnected) {
        try {
          const outputText = typeof output === 'object' ? 
            JSON.stringify(output) : String(output);
          await saveCommand(currentInput, outputText);
        } catch (error) {
          console.error('Error saving command:', error);
          toast.error('Failed to save command to backend');
        }
      }
    }
    
    setCurrentInput('');
  };

  // Handle key presses including command history navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSubmit(e);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      // Go back in command history
      if (commandHistory.length > 0 && historyIndex < commandHistory.length - 1) {
        const newIndex = historyIndex + 1;
        setHistoryIndex(newIndex);
        setCurrentInput(commandHistory[newIndex]);
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      // Go forward in command history or clear if at end
      if (historyIndex > 0) {
        const newIndex = historyIndex - 1;
        setHistoryIndex(newIndex);
        setCurrentInput(commandHistory[newIndex]);
      } else if (historyIndex === 0) {
        setHistoryIndex(-1);
        setCurrentInput('');
      }
    }
  };

  // Render terminal prompt
  const renderPrompt = () => {
    return (
      <span className="terminal-prompt">
        user@web-cmd:
        <span className="text-blue-300">{currentDir}</span>$ 
      </span>
    );
  };

  // Format terminal output
  const formatOutput = (output: string | string[]) => {
    if (typeof output === 'string') {
      return output;
    }
    return output.map((line, i) => <div key={i}>{line}</div>);
  };

  return (
    <div className="terminal-container" onClick={focusInput}>
      <div className="terminal-header">
        <div className="flex space-x-2">
          <div className="w-3 h-3 rounded-full bg-red-500"></div>
          <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
          <div className="w-3 h-3 rounded-full bg-green-500"></div>
        </div>
        <div className="ml-4 text-sm text-gray-400">Terminal {isUsingLocalMode ? "(Local Mode)" : "(Server Mode)"}</div>
        <div className="ml-auto flex space-x-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setIsUsingLocalMode(prev => !prev)}
            className="text-xs h-6"
          >
            {isUsingLocalMode ? "Switch to Server Mode" : "Switch to Local Mode"}
          </Button>
          {isBackendConnected && (
            <div className="text-xs bg-green-700 text-white py-0.5 px-2 rounded-full">
              Saving Commands
            </div>
          )}
        </div>
      </div>
      
      <ScrollArea className="terminal-body" ref={terminalRef}>
        <div className="mb-4">
          <p className="text-green-400">Welcome to Web Command Center! Type 'help' for available commands.</p>
          {isUsingLocalMode ? (
            <p className="text-yellow-500">Running in local mode (simulated commands). Type 'mode real' to execute commands on the server.</p>
          ) : (
            <p className="text-blue-400">Running in server mode. Commands will be executed on the connected server.</p>
          )}
          {isBackendConnected 
            ? <p className="text-blue-400">Backend connected: Command history will be saved.</p>
            : <p className="text-yellow-500">Backend not connected: Go to Settings to configure.</p>
          }
        </div>
        
        {history.map((entry, index) => (
          <div key={index} className="mb-4">
            <div>
              <span className="terminal-prompt">user@web-cmd:<span className="text-blue-300">{currentDir}</span>$ </span>
              <span className="terminal-command">{entry.input}</span>
            </div>
            <div className="terminal-output whitespace-pre-wrap">{formatOutput(entry.output)}</div>
          </div>
        ))}
        
        <form onSubmit={handleSubmit} className="flex items-center">
          {renderPrompt()}
          <input
            ref={inputRef}
            type="text"
            value={currentInput}
            onChange={(e) => setCurrentInput(e.target.value)}
            onKeyDown={handleKeyDown}
            className="terminal-input ml-2"
            autoFocus
          />
        </form>
        
        {!isUsingLocalMode && (
          <TerminalCommands 
            onCommandOutput={handleCommandOutput}
            currentInput={currentInput}
            setCurrentInput={setCurrentInput}
          />
        )}
      </ScrollArea>
    </div>
  );
};

export default Terminal;
