
import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Terminal from './Terminal';
import FileExplorer from './FileExplorer';

const CommandCenter = () => {
  const [activeTab, setActiveTab] = useState("terminal");

  return (
    <div className="container mx-auto p-4 max-w-6xl">
      <h1 className="text-3xl font-bold mb-6 text-white flex items-center">
        <span className="text-terminal-accent">Web</span>
        <span className="text-terminal-prompt ml-2">Command</span>
        <span className="text-terminal-text ml-2">Center</span>
      </h1>
      
      <Tabs defaultValue="terminal" value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid grid-cols-2 md:grid-cols-4 mb-6">
          <TabsTrigger value="terminal" className="font-mono">Terminal</TabsTrigger>
          <TabsTrigger value="files" className="font-mono">File Share</TabsTrigger>
          <TabsTrigger value="settings" className="font-mono" disabled>Settings</TabsTrigger>
          <TabsTrigger value="logs" className="font-mono" disabled>Logs</TabsTrigger>
        </TabsList>
        
        <TabsContent value="terminal" className="mt-0">
          <Terminal />
        </TabsContent>
        
        <TabsContent value="files" className="mt-0">
          <FileExplorer />
        </TabsContent>
        
        <TabsContent value="settings" className="mt-0">
          <div className="terminal-container p-6 text-center">
            <h3 className="text-xl font-mono">Settings (Coming Soon)</h3>
            <p className="text-gray-400 mt-4">This feature is under development.</p>
          </div>
        </TabsContent>
        
        <TabsContent value="logs" className="mt-0">
          <div className="terminal-container p-6 text-center">
            <h3 className="text-xl font-mono">Logs (Coming Soon)</h3>
            <p className="text-gray-400 mt-4">This feature is under development.</p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default CommandCenter;
