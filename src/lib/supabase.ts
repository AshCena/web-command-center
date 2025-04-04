
import { createClient } from '@supabase/supabase-js';

// Define types for our file system data
export interface FileNode {
  id: string;
  name: string;
  type: 'file' | 'dir';
  content?: string;
  parent_path: string;
  created_at: string;
  path: string;
}

export interface CommandHistoryItem {
  id: string;
  command: string;
  output: string;
  executed_at: string;
}

// Create a Supabase client
export const createSupabaseClient = () => {
  const supabaseUrl = localStorage.getItem('supabase_project_url');
  const supabaseKey = localStorage.getItem('supabase_api_key');
  
  if (!supabaseUrl || !supabaseKey) {
    console.error('Supabase configuration not found');
    return null;
  }
  
  return createClient(supabaseUrl, supabaseKey);
};

// File system functions
export const fetchFiles = async (path: string = '/home/user') => {
  const supabase = createSupabaseClient();
  
  if (!supabase) return { data: null, error: new Error('Supabase client not configured') };
  
  return await supabase
    .from('files')
    .select('*')
    .eq('parent_path', path);
};

export const createFile = async (file: Omit<FileNode, 'id' | 'created_at'>) => {
  const supabase = createSupabaseClient();
  
  if (!supabase) return { data: null, error: new Error('Supabase client not configured') };
  
  return await supabase
    .from('files')
    .insert([{ 
      ...file, 
      created_at: new Date().toISOString() 
    }]);
};

export const updateFile = async (id: string, updates: Partial<FileNode>) => {
  const supabase = createSupabaseClient();
  
  if (!supabase) return { data: null, error: new Error('Supabase client not configured') };
  
  return await supabase
    .from('files')
    .update(updates)
    .eq('id', id);
};

export const deleteFile = async (id: string) => {
  const supabase = createSupabaseClient();
  
  if (!supabase) return { data: null, error: new Error('Supabase client not configured') };
  
  return await supabase
    .from('files')
    .delete()
    .eq('id', id);
};

// Command history functions
export const saveCommand = async (command: string, output: string) => {
  const supabase = createSupabaseClient();
  
  if (!supabase) return { data: null, error: new Error('Supabase client not configured') };
  
  return await supabase
    .from('command_history')
    .insert([{
      command,
      output: typeof output === 'object' ? JSON.stringify(output) : output,
      executed_at: new Date().toISOString()
    }]);
};

export const fetchCommandHistory = async (limit = 100) => {
  const supabase = createSupabaseClient();
  
  if (!supabase) return { data: null, error: new Error('Supabase client not configured') };
  
  return await supabase
    .from('command_history')
    .select('*')
    .order('executed_at', { ascending: false })
    .limit(limit);
};
