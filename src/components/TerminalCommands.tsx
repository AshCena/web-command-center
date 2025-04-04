
import React from 'react';
import { useWebSocket } from '@/hooks/useWebSocket';

interface TerminalCommandsProps {
  onCommandOutput: (output: string) => void;
  currentInput: string;
  setCurrentInput: (input: string) => void;
}

const TerminalCommands: React.FC<TerminalCommandsProps> = ({ 
  onCommandOutput, 
  currentInput, 
  setCurrentInput 
}) => {
  const { sendMessage, connectionStatus } = useWebSocket({
    onMessage: (message) => {
      try {
        const data = JSON.parse(message);
        if (data.type === 'command_output') {
          onCommandOutput(data.output);
        }
      } catch (error) {
        console.error('Failed to parse WebSocket message:', error);
        onCommandOutput('Error: Failed to parse server response');
      }
    }
  });

  const executeCommand = (command: string) => {
    if (connectionStatus !== 'Connected') {
      onCommandOutput('Error: Not connected to server. Please check your connection settings.');
      return;
    }
    
    sendMessage(JSON.stringify({
      type: 'execute_command',
      command
    }));
  };

  return (
    <div className="mt-2">
      <div className="text-xs text-gray-400 mb-2">
        Status: <span className={connectionStatus === 'Connected' ? 'text-green-400' : 'text-red-400'}>
          {connectionStatus}
        </span>
      </div>
    </div>
  );
};

export default TerminalCommands;
