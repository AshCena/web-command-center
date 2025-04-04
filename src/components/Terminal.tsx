
import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';

interface TerminalEntry {
  input: string;
  output: string | string[];
}

const Terminal = () => {
  const [history, setHistory] = useState<TerminalEntry[]>([]);
  const [currentInput, setCurrentInput] = useState('');
  const [currentDir, setCurrentDir] = useState('/home/user');
  const terminalRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Mock file system
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
    const parts = cmd.trim().split(' ');
    const command = parts[0];
    const args = parts.slice(1);

    switch (command) {
      case 'clear':
        setHistory([]);
        return '';
      case 'echo':
        return args.join(' ');
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
          'cat [file] - Display file contents'
        ];
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

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!currentInput.trim()) return;
    
    const output = processCommand(currentInput);
    
    setHistory([...history, { input: currentInput, output }]);
    setCurrentInput('');
  };

  // Handle key presses
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSubmit(e);
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
        <div className="ml-4 text-sm text-gray-400">Terminal</div>
      </div>
      
      <div className="terminal-body" ref={terminalRef}>
        <div className="mb-4">
          <p className="text-green-400">Welcome to Web Command Center! Type 'help' for available commands.</p>
        </div>
        
        {history.map((entry, index) => (
          <div key={index} className="mb-4">
            <div>
              <span className="terminal-prompt">user@web-cmd:<span className="text-blue-300">{currentDir}</span>$ </span>
              <span className="terminal-command">{entry.input}</span>
            </div>
            <div className="terminal-output">{formatOutput(entry.output)}</div>
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
      </div>
    </div>
  );
};

export default Terminal;
