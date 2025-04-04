
import { useState, useEffect, useCallback, useRef } from 'react';

type ConnectionStatus = 'Connecting' | 'Connected' | 'Disconnected' | 'Failed';

interface UseWebSocketProps {
  onMessage: (message: string) => void;
  onOpen?: () => void;
  onClose?: () => void;
  onError?: (error: Event) => void;
}

export const useWebSocket = ({
  onMessage,
  onOpen,
  onClose,
  onError
}: UseWebSocketProps) => {
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('Disconnected');
  const socketRef = useRef<WebSocket | null>(null);
  
  // Get the WebSocket URL from local storage or use default
  const getWebSocketUrl = () => {
    const savedUrl = localStorage.getItem('terminal_websocket_url');
    return savedUrl || 'ws://localhost:8000/ws/terminal';
  };

  // Connect to WebSocket
  const connect = useCallback(() => {
    try {
      const url = getWebSocketUrl();
      
      if (socketRef.current?.readyState === WebSocket.OPEN) {
        return;
      }
      
      setConnectionStatus('Connecting');
      const socket = new WebSocket(url);
      
      socket.onopen = () => {
        setConnectionStatus('Connected');
        if (onOpen) onOpen();
      };
      
      socket.onmessage = (event) => {
        onMessage(event.data);
      };
      
      socket.onclose = () => {
        setConnectionStatus('Disconnected');
        if (onClose) onClose();
      };
      
      socket.onerror = (error) => {
        setConnectionStatus('Failed');
        if (onError) onError(error);
      };
      
      socketRef.current = socket;
    } catch (error) {
      console.error('WebSocket connection error:', error);
      setConnectionStatus('Failed');
    }
  }, [onMessage, onOpen, onClose, onError]);

  // Disconnect WebSocket
  const disconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.close();
      socketRef.current = null;
      setConnectionStatus('Disconnected');
    }
  }, []);

  // Send message through WebSocket
  const sendMessage = useCallback((message: string) => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(message);
      return true;
    }
    return false;
  }, []);

  // Auto-connect on mount and reconnect on URL change
  useEffect(() => {
    connect();
    
    // Reconnect if the WebSocket URL changes
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === 'terminal_websocket_url') {
        disconnect();
        setTimeout(connect, 500); // Small delay before reconnection
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    
    // Clean up on unmount
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      disconnect();
    };
  }, [connect, disconnect]);

  return { sendMessage, connectionStatus, connect, disconnect };
};
