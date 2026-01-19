import { createClient } from '@/lib/supabase/client'
import type { VFSNode, Note, TerminalSession, AIConversation } from '@/types/database'

const supabase = createClient()

// Helper for consistent error handling
function handleError(context: string, error: any) {
  console.error(`[DB Error] ${context}:`, error)
  throw error
}

/**
 * VFS (Virtual File System) Operations
 */
export async function createVFSNode(data: Omit<VFSNode, 'id' | 'created_at' | 'updated_at'>) {
  const { data: result, error } = await supabase
    .from('vfs_nodes')
    .insert([data])
    .select()
    .single()

  if (error) handleError('createVFSNode', error)
  return result
}

export async function getVFSNode(id: string) {
  const { data, error } = await supabase
    .from('vfs_nodes')
    .select('*')
    .eq('id', id)
    .single()

  if (error) handleError('getVFSNode', error)
  return data
}

export async function listVFSNodes(parentId: string | null, userId: string) {
  let query = supabase
    .from('vfs_nodes')
    .select('*')
    .eq('user_id', userId)

  // Handle null parent_id properly for root level items
  if (parentId === null) {
    query = query.is('parent_id', null)
  } else {
    query = query.eq('parent_id', parentId)
  }

  const { data, error } = await query.order('name')

  if (error) handleError('listVFSNodes', error)
  return data || []
}

export async function updateVFSNode(id: string, data: Partial<VFSNode>) {
  const { data: result, error } = await supabase
    .from('vfs_nodes')
    .update(data)
    .eq('id', id)
    .select()
    .single()

  if (error) handleError('updateVFSNode', error)
  return result
}

export async function deleteVFSNode(id: string) {
  const { error } = await supabase
    .from('vfs_nodes')
    .delete()
    .eq('id', id)

  if (error) handleError('deleteVFSNode', error)
}

/**
 * Notes Operations
 */
export async function createNote(data: Omit<Note, 'id' | 'created_at' | 'updated_at'>) {
  const { data: result, error } = await supabase
    .from('notes')
    .insert([data])
    .select()
    .single()

  if (error) handleError('createNote', error)
  return result
}

export async function getNote(id: string, userId: string) {
  const { data, error } = await supabase
    .from('notes')
    .select('*')
    .eq('id', id)
    .eq('user_id', userId)
    .single()

  if (error) handleError('getNote', error)
  return data
}

export async function listNotes(userId: string) {
  const { data, error } = await supabase
    .from('notes')
    .select('*')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false })

  if (error) handleError('listNotes', error)
  return data
}

export async function updateNote(id: string, userId: string, data: Partial<Note>) {
  const { data: result, error } = await supabase
    .from('notes')
    .update(data)
    .eq('id', id)
    .eq('user_id', userId)
    .select()
    .single()

  if (error) handleError('updateNote', error)
  return result
}

export async function deleteNote(id: string, userId: string) {
  const { error } = await supabase
    .from('notes')
    .delete()
    .eq('id', id)
    .eq('user_id', userId)

  if (error) handleError('deleteNote', error)
}

/**
 * Terminal Session Operations
 */
export async function createTerminalSession(data: Omit<TerminalSession, 'id' | 'created_at'>) {
  const { data: result, error } = await supabase
    .from('terminal_sessions')
    .insert([data])
    .select()
    .single()

  if (error) handleError('createTerminalSession', error)
  return result
}

export async function getTerminalSession(id: string, userId: string) {
  const { data, error } = await supabase
    .from('terminal_sessions')
    .select('*')
    .eq('id', id)
    .eq('user_id', userId)
    .single()

  if (error) handleError('getTerminalSession', error)
  return data
}

// --- FIXED: Added the missing function here ---
export async function updateTerminalSession(id: string, updates: Partial<TerminalSession>) {
  const { data, error } = await supabase
    .from('terminal_sessions')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) handleError('updateTerminalSession', error)
  return data
}

export async function appendTerminalOutput(id: string, output: string) {
  // First get current output to append correctly
  const { data: current, error: fetchError } = await supabase
    .from('terminal_sessions')
    .select('output')
    .eq('id', id)
    .single()

  if (fetchError) handleError('appendTerminalOutput:fetch', fetchError)

  const newOutput = (current?.output || '') + output

  const { data: result, error: updateError } = await supabase
    .from('terminal_sessions')
    .update({ output: newOutput, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()

  if (updateError) handleError('appendTerminalOutput:update', updateError)
  return result
}

export async function clearTerminalSession(id: string) {
  const { data: result, error } = await supabase
    .from('terminal_sessions')
    .update({ output: '', updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()

  if (error) handleError('clearTerminalSession', error)
  return result
}

/**
 * AI Conversation Operations
 */
export async function createAIConversation(data: Omit<AIConversation, 'id' | 'created_at' | 'updated_at'>) {
  // Generate a unique conversation_id if not provided
  const conversationId = data.conversation_id || `conv-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  
  const { data: result, error } = await supabase
    .from('ai_conversations')
    .insert([{ ...data, conversation_id: conversationId }])
    .select()
    .single()

  if (error) handleError('createAIConversation', error)
  return result
}

export async function getAIConversation(id: string, userId: string) {
  const { data, error } = await supabase
    .from('ai_conversations')
    .select('*')
    .eq('id', id)
    .eq('user_id', userId)
    .single()

  if (error) handleError('getAIConversation', error)
  return data
}

export async function listAIConversations(userId: string) {
  const { data, error } = await supabase
    .from('ai_conversations')
    .select('*')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false })

  if (error) handleError('listAIConversations', error)
  return data
}

export async function updateAIConversation(id: string, userId: string, data: Partial<AIConversation>) {
  const { data: result, error } = await supabase
    .from('ai_conversations')
    .update(data)
    .eq('id', id)
    .eq('user_id', userId)
    .select()
    .single()

  if (error) handleError('updateAIConversation', error)
  return result
}

export async function deleteAIConversation(id: string, userId: string) {
  const { error } = await supabase
    .from('ai_conversations')
    .delete()
    .eq('id', id)
    .eq('user_id', userId)

  if (error) handleError('deleteAIConversation', error)
}