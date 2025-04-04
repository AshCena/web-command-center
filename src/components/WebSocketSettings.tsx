
import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

const WebSocketSettings = () => {
  const [wsUrl, setWsUrl] = useState('');
  
  // Load settings from localStorage on component mount
  useEffect(() => {
    const savedWsUrl = localStorage.getItem('terminal_websocket_url');
    if (savedWsUrl) setWsUrl(savedWsUrl);
    else setWsUrl('ws://localhost:8000/ws/terminal');
  }, []);
  
  const saveSettings = () => {
    const formattedUrl = wsUrl.trim();
    
    // Basic validation
    if (!formattedUrl.startsWith('ws://') && !formattedUrl.startsWith('wss://')) {
      toast.error("WebSocket URL must start with ws:// or wss://");
      return;
    }
    
    localStorage.setItem('terminal_websocket_url', formattedUrl);
    toast.success("WebSocket settings saved successfully");
    
    // Trigger event to notify components that use the WebSocket
    window.dispatchEvent(new Event('storage'));
  };
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Terminal Server Configuration</CardTitle>
        <CardDescription>Connect to your WebSocket server to enable real terminal functionality</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="ws-url">WebSocket Server URL</Label>
            <Input 
              id="ws-url" 
              placeholder="ws://localhost:8000/ws/terminal"
              value={wsUrl}
              onChange={(e) => setWsUrl(e.target.value)}
            />
            <p className="text-xs text-gray-400">
              This should point to your FastAPI WebSocket server (e.g., ws://localhost:8000/ws/terminal)
            </p>
          </div>
        </div>
      </CardContent>
      <CardFooter>
        <Button onClick={saveSettings}>Save WebSocket Settings</Button>
      </CardFooter>
    </Card>
  );
};

export default WebSocketSettings;
