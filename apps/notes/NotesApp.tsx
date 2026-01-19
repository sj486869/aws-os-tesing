'use client'

import { useEffect, useState } from 'react'
import { FilePlus, Trash2 } from 'lucide-react'
import { useAuth } from '@/lib/auth/AuthContext'
import * as db from '@/lib/services/database'
import type { AppComponentProps } from '@/core/os/appRegistry'
import type { Note } from '@/types/database'

export function NotesApp({}: AppComponentProps) {
  const { user } = useAuth()
  const [notes, setNotes] = useState<Note[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)
  const [draft, setDraft] = useState('')
  const [loading, setLoading] = useState(true)
  const [saveTimeout, setSaveTimeout] = useState<NodeJS.Timeout | null>(null)

  // Load notes on mount
  useEffect(() => {
    if (!user) return

    const loadNotes = async () => {
      try {
        setLoading(true)
        const data = await db.listNotes(user.id)
        setNotes(data)
      } catch (error) {
        console.error('[Notes] Failed to load notes:', error)
      } finally {
        setLoading(false)
      }
    }

    loadNotes()
  }, [user])

  // Load active note content
  useEffect(() => {
    if (!activeId || !user) return

    const active = notes.find((n) => n.id === activeId)
    if (active) {
      setDraft(active.content)
    }
  }, [activeId, notes, user])

  // Auto-save draft
  useEffect(() => {
    if (!activeId || !user) return

    if (saveTimeout) clearTimeout(saveTimeout)

    const timeout = setTimeout(async () => {
      try {
        const updated = await db.updateNote(activeId, user.id, {
          content: draft,
          updated_at: new Date().toISOString(),
        })
        setNotes((prev) => prev.map((n) => (n.id === updated.id ? updated : n)))
      } catch (error) {
        console.error('[Notes] Failed to save note:', error)
      }
    }, 500)

    setSaveTimeout(timeout)

    return () => clearTimeout(timeout)
  }, [draft, activeId, user, saveTimeout])

  const handleCreateNote = async () => {
    if (!user) return

    const title = prompt('Note title', 'New Note')
    if (!title) return

    try {
      const nodeId = `note-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      const newNote = await db.createNote({
        user_id: user.id,
        node_id: nodeId,
        title,
        content: `# ${title}\n`,
        is_archived: false,
      })
      setNotes((prev) => [newNote, ...prev])
      setActiveId(newNote.id)
    } catch (error) {
      console.error('[Notes] Failed to create note:', error)
    }
  }

  const handleDeleteNote = async (id: string) => {
    if (!user) return

    const confirmed = confirm('Delete this note?')
    if (!confirmed) return

    try {
      await db.deleteNote(id, user.id)
      setNotes((prev) => prev.filter((n) => n.id !== id))
      if (activeId === id) setActiveId(null)
    } catch (error) {
      console.error('[Notes] Failed to delete note:', error)
    }
  }

  const activeNote = notes.find((n) => n.id === activeId)

  if (loading) {
    return <div className="p-4 text-sm opacity-70">Loading notes...</div>
  }

  return (
    <div className="flex h-full">
      {/* Sidebar */}
      <aside className="w-64 border-r border-[color:var(--os-border)] bg-[color:var(--os-panel)] flex flex-col">
        <div className="flex items-center justify-between px-3 py-3 border-b border-[color:var(--os-border)]">
          <div className="text-xs font-semibold uppercase tracking-wide opacity-70">
            Notes
          </div>
          <button
            className="rounded-lg p-2 hover:bg-white/10 transition-colors"
            title="New note"
            onClick={handleCreateNote}
          >
            <FilePlus className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto space-y-1 p-2">
          {notes.length === 0 ? (
            <div className="text-xs text-center py-8 opacity-50">
              No notes yet. Create one to get started.
            </div>
          ) : (
            notes.map((note) => (
              <div
                key={note.id}
                className={`group relative rounded-lg px-3 py-2 text-left text-sm cursor-pointer transition-colors ${
                  activeId === note.id
                    ? 'bg-white/10'
                    : 'hover:bg-white/5'
                }`}
                onClick={() => setActiveId(note.id)}
              >
                <div className="truncate font-medium">{note.title}</div>
                <div className="truncate text-xs opacity-50 line-clamp-1">
                  {note.content.slice(0, 30)}...
                </div>
                <button
                  className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 hover:bg-red-500/20 p-1 rounded transition-all"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleDeleteNote(note.id)
                  }}
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            ))
          )}
        </div>
      </aside>

      {/* Editor */}
      <main className="flex-1 flex flex-col">
        {activeNote ? (
          <>
            <div className="border-b border-[color:var(--os-border)] p-4">
              <h1 className="text-lg font-semibold">{activeNote.title}</h1>
              <p className="text-xs opacity-50">
                {new Date(activeNote.updated_at).toLocaleDateString()}
              </p>
            </div>
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              className="flex-1 p-4 bg-transparent text-sm font-mono resize-none focus:outline-none"
              placeholder="Start typing..."
            />
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center opacity-50 text-sm">
            {notes.length === 0 ? 'Create a note to begin' : 'Select a note to edit'}
          </div>
        )}
      </main>
    </div>
  )
}
