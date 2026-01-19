import { createClient } from '@/lib/supabase/client'
import type {
  VFSNode,
  Note,
  TerminalSession,
  AIConversation,
} from '@/types/database'

const supabase = createClient()

/* ===============================
   Helpers
================================ */
function handleError(context: string, error: any) {
  console.error(`[DB Error] ${context}:`, error)
  throw error
}

const now = () => new Date().toISOString()

/* ===============================
   VFS (Virtual File System)
================================ */
export async function createVFSNode(
  data: Omit<VFSNode, 'id' | 'created_at' | 'updated_at'>,
) {
  const { data: result, error } = await supabase
    .from('vfs_nodes')
    .insert([{ ...data, created_at: now(), updated_at: now() }])
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
  let query = supabase.from('vfs_nodes').select('*').eq('user_id', userId)

  parentId === null
    ? (query = query.is('parent_id', null))
    : (query = query.eq('parent_id', parentId))

  const { data, error } = await query.order('name')

  if (error) handleError('listVFSNodes', error)
  return data ?? []
}

export async function updateVFSNode(id: string, updates: Partial<VFSNode>) {
  const { data, error } = await supabase
    .from('vfs_nodes')
    .update({ ...updates, updated_at: now() })
    .eq('id', id)
    .select()
    .single()

  if (error) handleError('updateVFSNode', error)
  return data
}

export async function deleteVFSNode(id: string) {
  const { error } = await supabase.from('vfs_nodes').delete().eq('id', id)
  if (error) handleError('deleteVFSNode', error)
}

/* ===============================
   Notes
================================ */
export async function createNote(
  data: Omit<Note, 'id' | 'created_at' | 'updated_at'>,
) {
  const { data: result, error } = await supabase
    .from('notes')
    .insert([{ ...data, created_at: now(), updated_at: now() }])
    .select()
    .single()

  if (error) handleError('createNote', error)
  return result
}

export async function listNotes(userId: string) {
  const { data, error } = await supabase
    .from('notes')
    .select('*')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false })

  if (error) handleError('listNotes', error)
  return data ?? []
}

export async function updateNote(
  id: string,
  userId: string,
  updates: Partial<Note>,
) {
  const { data, error } = await supabase
    .from('notes')
    .update({ ...updates, updated_at: now() })
    .eq('id', id)
    .eq('user_id', userId)
    .select()
    .single()

  if (error) handleError('updateNote', error)
  return data
}

export async function deleteNote(id: string, userId: string) {
  const { error } = await supabase
    .from('notes')
    .delete()
    .eq('id', id)
    .eq('user_id', userId)

  if (error) handleError('deleteNote', error)
}

/* ===============================
   Terminal Sessions
================================ */
export async function createTerminalSession(
  data: Omit<TerminalSession, 'id' | 'created_at' | 'updated_at'>,
) {
  const { data: result, error } = await supabase
    .from('terminal_sessions')
    .insert([{ ...data, created_at: now(), updated_at: now() }])
    .select()
    .single()

  if (error) handleError('createTerminalSession', error)
  return result
}

export async function updateTerminalSession(
  id: string,
  updates: Partial<TerminalSession>,
) {
  const { data, error } = await supabase
    .from('terminal_sessions')
    .update({ ...updates, updated_at: now() })
    .eq('id', id)
    .select()
    .single()

  if (error) handleError('updateTerminalSession', error)
  return data
}

export async function clearTerminalSession(id: string) {
  return updateTerminalSession(id, { output: '' })
}

/* ===============================
   AI Conversations
================================ */
export async function createAIConversation(
  // FIX: Explicitly allow conversation_id to be optional
  data: Omit<AIConversation, 'id' | 'created_at' | 'updated_at' | 'conversation_id'> & { 
    conversation_id?: string 
  },
) {
  const conversation_id =
    data.conversation_id ??
    `conv-${Date.now()}-${Math.random().toString(36).slice(2)}`

  const { data: result, error } = await supabase
    .from('ai_conversations')
    .insert([
      {
        ...data,
        conversation_id,
        created_at: now(),
        updated_at: now(),
      },
    ])
    .select()
    .single()

  if (error) handleError('createAIConversation', error)
  return result
}

export async function listAIConversations(userId: string) {
  const { data, error } = await supabase
    .from('ai_conversations')
    .select('*')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false })

  if (error) handleError('listAIConversations', error)
  return data ?? []
}

export async function updateAIConversation(
  id: string,
  userId: string,
  updates: Partial<AIConversation>,
) {
  const { data, error } = await supabase
    .from('ai_conversations')
    .update({ ...updates, updated_at: now() })
    .eq('id', id)
    .eq('user_id', userId)
    .select()
    .single()

  if (error) handleError('updateAIConversation', error)
  return data
}

export async function deleteAIConversation(id: string, userId: string) {
  const { error } = await supabase
    .from('ai_conversations')
    .delete()
    .eq('id', id)
    .eq('user_id', userId)

  if (error) handleError('deleteAIConversation', error)
}
