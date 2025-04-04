
import React, { useState, useRef } from 'react';
import { Folder, File, Download, Upload, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface FileSystemNode {
  type: 'file' | 'dir';
  name: string;
  path: string;
  children?: FileSystemNode[];
  content?: string;
}

const FileExplorer = () => {
  const [currentPath, setCurrentPath] = useState('/home/user');
  const [fileSystem, setFileSystem] = useState<FileSystemNode[]>([
    {
      type: 'dir',
      name: 'documents',
      path: '/home/user/documents',
      children: [
        { type: 'file', name: 'notes.txt', path: '/home/user/documents/notes.txt', content: 'Important notes content' },
        { type: 'file', name: 'report.pdf', path: '/home/user/documents/report.pdf', content: 'PDF content data' },
      ]
    },
    {
      type: 'dir',
      name: 'pictures',
      path: '/home/user/pictures',
      children: [
        { type: 'file', name: 'vacation.jpg', path: '/home/user/pictures/vacation.jpg', content: 'JPEG image data' },
        { type: 'file', name: 'profile.png', path: '/home/user/pictures/profile.png', content: 'PNG image data' },
      ]
    },
    { type: 'file', name: 'hello.txt', path: '/home/user/hello.txt', content: 'Hello, World!' },
    { type: 'file', name: 'config.json', path: '/home/user/config.json', content: '{"settings": "default"}' },
  ]);
  
  const [currentFiles, setCurrentFiles] = useState<FileSystemNode[]>(fileSystem);
  const [terminalInput, setTerminalInput] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Navigate to a directory
  const navigateToDirectory = (dirPath: string) => {
    if (dirPath === '..') {
      // Go up one level
      const pathParts = currentPath.split('/');
      if (pathParts.length > 3) { // Don't go above /home/user
        pathParts.pop();
        const newPath = pathParts.join('/');
        setCurrentPath(newPath);
        updateCurrentFiles(newPath);
      }
      return;
    }
    
    setCurrentPath(dirPath);
    updateCurrentFiles(dirPath);
  };
  
  // Update the current files based on path
  const updateCurrentFiles = (path: string) => {
    let files: FileSystemNode[] = [];
    
    const findFilesInPath = (
      nodes: FileSystemNode[],
      targetPath: string
    ): FileSystemNode[] | null => {
      for (const node of nodes) {
        if (node.path === targetPath && node.type === 'dir') {
          return node.children || [];
        }
        
        if (node.type === 'dir' && node.children) {
          const found = findFilesInPath(node.children, targetPath);
          if (found) return found;
        }
      }
      
      return null;
    };
    
    // If we're at root level
    if (path === '/home/user') {
      files = fileSystem;
    } else {
      const foundFiles = findFilesInPath(fileSystem, path);
      if (foundFiles) {
        files = foundFiles;
      }
    }
    
    setCurrentFiles(files);
  };
  
  // Handle file click (download for files, navigate for directories)
  const handleFileClick = (file: FileSystemNode) => {
    if (file.type === 'dir') {
      navigateToDirectory(file.path);
    } else {
      downloadFile(file);
    }
  };
  
  // Simulate downloading a file
  const downloadFile = (file: FileSystemNode) => {
    // In a real app, this would initiate a download, here we just show a toast
    toast.success(`Downloading ${file.name}`);
    
    // Create a blob from the content and download it
    const blob = new Blob([file.content || ''], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = file.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };
  
  // Handle file upload button click
  const handleUploadClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };
  
  // Process terminal commands for navigation
  const handleTerminalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const parts = terminalInput.trim().split(' ');
    const command = parts[0];
    const args = parts.slice(1);
    
    if (command === 'cd') {
      if (args[0] === '..') {
        navigateToDirectory('..');
      } else {
        // Find the directory in current path
        const targetDir = currentFiles.find(
          f => f.type === 'dir' && f.name === args[0]
        );
        
        if (targetDir) {
          navigateToDirectory(targetDir.path);
        } else {
          toast.error(`Directory not found: ${args[0]}`);
        }
      }
    } else if (command === 'ls') {
      // Already showing files, just acknowledge
      toast.info('Files listed below');
    } else {
      toast.error(`Unknown command: ${command}`);
    }
    
    setTerminalInput('');
  };
  
  // Handle file upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    // Process each uploaded file
    Array.from(files).forEach(file => {
      const reader = new FileReader();
      
      reader.onload = () => {
        // Create a new file node
        const newFile: FileSystemNode = {
          type: 'file',
          name: file.name,
          path: `${currentPath}/${file.name}`,
          content: reader.result as string,
        };
        
        // Add file to current directory
        if (currentPath === '/home/user') {
          // Adding to root
          setFileSystem([...fileSystem, newFile]);
          setCurrentFiles([...currentFiles, newFile]);
        } else {
          // Add to subdirectory by cloning and modifying the file system
          const updatedFileSystem = [...fileSystem];
          
          const addFileToPath = (
            nodes: FileSystemNode[],
            targetPath: string,
            fileToAdd: FileSystemNode
          ): boolean => {
            for (let i = 0; i < nodes.length; i++) {
              const node = nodes[i];
              if (node.path === targetPath && node.type === 'dir') {
                if (!node.children) {
                  node.children = [];
                }
                node.children.push(fileToAdd);
                return true;
              }
              
              if (node.type === 'dir' && node.children) {
                if (addFileToPath(node.children, targetPath, fileToAdd)) {
                  return true;
                }
              }
            }
            
            return false;
          };
          
          if (addFileToPath(updatedFileSystem, currentPath, newFile)) {
            setFileSystem(updatedFileSystem);
            setCurrentFiles([...currentFiles, newFile]);
          }
        }
        
        toast.success(`Uploaded: ${file.name}`);
      };
      
      reader.readAsText(file);
    });
    
    // Reset the file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };
  
  // Render breadcrumb navigation
  const renderBreadcrumbs = () => {
    const parts = currentPath.split('/').filter(Boolean);
    
    return (
      <div className="flex items-center text-sm text-gray-400 mb-3 overflow-x-auto">
        <span 
          className="cursor-pointer hover:text-blue-400"
          onClick={() => navigateToDirectory('/home/user')}
        >
          /home/user
        </span>
        
        {parts.slice(2).map((part, index) => (
          <React.Fragment key={index}>
            <ChevronRight className="h-4 w-4 mx-1" />
            <span 
              className="cursor-pointer hover:text-blue-400"
              onClick={() => {
                const path = '/home/user/' + parts.slice(2, index + 3).join('/');
                navigateToDirectory(path);
              }}
            >
              {part}
            </span>
          </React.Fragment>
        ))}
      </div>
    );
  };
  
  return (
    <div className="file-explorer">
      <div className="file-explorer-header">
        <div className="flex items-center justify-between">
          <div className="flex space-x-2">
            <div className="w-3 h-3 rounded-full bg-red-500"></div>
            <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
            <div className="w-3 h-3 rounded-full bg-green-500"></div>
          </div>
          <div className="text-sm">File Explorer</div>
          <div className="flex space-x-2">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleUploadClick}
              className="text-xs flex items-center"
            >
              <Upload className="h-4 w-4 mr-1" />
              Upload
            </Button>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              className="hidden"
              multiple
            />
          </div>
        </div>
      </div>
      
      <div className="px-4 py-2 bg-gray-800">
        <form onSubmit={handleTerminalSubmit} className="flex items-center space-x-2">
          <span className="text-xs text-terminal-prompt font-mono">$</span>
          <input
            type="text"
            value={terminalInput}
            onChange={(e) => setTerminalInput(e.target.value)}
            placeholder="cd .. or cd foldername"
            className="bg-transparent border-none text-xs text-white font-mono flex-1 focus:outline-none"
          />
        </form>
      </div>
      
      <div className="file-explorer-body">
        {renderBreadcrumbs()}
        
        {currentPath !== '/home/user' && (
          <div 
            className="file-item"
            onClick={() => navigateToDirectory('..')}
          >
            <Folder className="folder-icon h-4 w-4" />
            <span className="text-sm">..</span>
          </div>
        )}
        
        {currentFiles.map((file, index) => (
          <div 
            key={index} 
            className="file-item group"
            onClick={() => handleFileClick(file)}
          >
            {file.type === 'dir' ? (
              <Folder className="folder-icon h-4 w-4" />
            ) : (
              <File className="file-icon h-4 w-4" />
            )}
            <span className="text-sm">{file.name}</span>
            
            {file.type === 'file' && (
              <Download 
                className="h-4 w-4 ml-auto text-gray-500 opacity-0 group-hover:opacity-100" 
                onClick={(e) => {
                  e.stopPropagation();
                  downloadFile(file);
                }}
              />
            )}
          </div>
        ))}
        
        {currentFiles.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <p>This folder is empty</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default FileExplorer;
