-- Disable RLS on tables or add policies if RLS is needed
-- First, let's check and disable RLS on vfs_nodes

ALTER TABLE vfs_nodes DISABLE ROW LEVEL SECURITY;
ALTER TABLE notes DISABLE ROW LEVEL SECURITY;
ALTER TABLE terminal_sessions DISABLE ROW LEVEL SECURITY;
ALTER TABLE window_states DISABLE ROW LEVEL SECURITY;
ALTER TABLE ai_conversations DISABLE ROW LEVEL SECURITY;
