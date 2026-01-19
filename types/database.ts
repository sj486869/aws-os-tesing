export interface VFSNode {
  id: string
  user_id: string
  node_id: string
  parent_id: string | null
  name: string
  type: 'file' | 'folder'
  content: string | null
  mime_type: string | null
  size: number
  created_at: string
  updated_at: string
}

export interface Note {
  id: string
  user_id: string
  node_id: string
  title: string
  content: string
  is_archived: boolean
  created_at: string
  updated_at: string
}

export interface TerminalSession {
  id: string
  user_id: string
  title: string
  output: string
  working_directory: string
  created_at: string
  updated_at: string
}

export interface AIConversation {
  id: string
  user_id: string
  title: string
  messages: Array<{
    id: string
    role: 'user' | 'assistant'
    content: string
    timestamp: string
  }>
  created_at: string
  updated_at: string
}

export interface UserSettings {
  id: string
  user_id: string
  theme: 'light' | 'dark'
  window_positions: Record<string, { x: number; y: number; width: number; height: number }>
  created_at: string
  updated_at: string
}
