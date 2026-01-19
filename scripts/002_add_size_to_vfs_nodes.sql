-- Add size column to vfs_nodes table
ALTER TABLE vfs_nodes ADD COLUMN IF NOT EXISTS size INTEGER DEFAULT 0;
