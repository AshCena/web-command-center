
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

const Settings = () => {
  const [apiKey, setApiKey] = useState('');
  const [projectUrl, setProjectUrl] = useState('');
  
  // Load settings from localStorage on component mount
  React.useEffect(() => {
    const savedApiKey = localStorage.getItem('supabase_api_key');
    const savedProjectUrl = localStorage.getItem('supabase_project_url');
    
    if (savedApiKey) setApiKey(savedApiKey);
    if (savedProjectUrl) setProjectUrl(savedProjectUrl);
  }, []);
  
  const saveSettings = () => {
    localStorage.setItem('supabase_api_key', apiKey);
    localStorage.setItem('supabase_project_url', projectUrl);
    toast.success("Backend settings saved successfully");
  };
  
  return (
    <div className="terminal-container">
      <div className="terminal-header">
        <div className="flex space-x-2">
          <div className="w-3 h-3 rounded-full bg-red-500"></div>
          <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
          <div className="w-3 h-3 rounded-full bg-green-500"></div>
        </div>
        <div className="ml-4 text-sm text-gray-400">Settings</div>
      </div>
      
      <div className="p-6">
        <Card>
          <CardHeader>
            <CardTitle>Backend Configuration</CardTitle>
            <CardDescription>Connect to Supabase to enable file storage and command history</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="project-url">Supabase Project URL</Label>
                <Input 
                  id="project-url" 
                  placeholder="https://your-project.supabase.co"
                  value={projectUrl}
                  onChange={(e) => setProjectUrl(e.target.value)}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="api-key">Supabase API Key</Label>
                <Input 
                  id="api-key" 
                  type="password"
                  placeholder="Your Supabase API Key"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                />
                <p className="text-xs text-gray-400">
                  This is your anon/public key from Supabase. Never share your service role key.
                </p>
              </div>
            </div>
          </CardContent>
          <CardFooter>
            <Button onClick={saveSettings}>Save Settings</Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
};

export default Settings;
