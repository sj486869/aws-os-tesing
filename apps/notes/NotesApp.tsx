'use client'

import { useEffect, useRef, useState } from 'react'
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

  // useRef for autosave debounce (DO NOT use state)
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  /* ===============================
     Load notes
  =============================== */
  useEffect(() => {
    if (!user) return

    const loadNotes = async () => {
      try {
        setLoading(true)
        const data = await db.listNotes(user.id)
        setNotes(data ?? [])
      } catch (error) {
        console.error('[Notes] Failed to load notes:', error)
        setNotes([])
      } finally {
        setLoading(false)
      }
    }

    loadNotes()
  }, [user])

  /* ===============================
     Load active note into editor
  =============================== */
  useEffect(() => {
    if (!activeId) return

    const note = notes.find((n) => n.id === activeId)
    if (note) {
      setDraft(note.content)
    }
  }, [activeId, notes])

  /* ===============================
     Auto-save (debounced)
  =============================== */
  useEffect(() => {
    if (!activeId || !user) return

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current)
    }

    saveTimeoutRef.current = setTimeout(async () => {
      try {
        const updated = await db.updateNote(activeId, user.id, {
          content: draft,
          updated_at: new Date().toISOString(),
        })

        setNotes((prev) =>
          prev.map((n) => (n.id === updated.id ? updated : n))
        )
      } catch (error) {
        console.error('[Notes] Failed to auto-save:', error)
      }
    }, 500)

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }
    }
  }, [draft, activeId, user])

  /* ===============================
     Create note
  =============================== */
  const handleCreateNote = async () => {
    if (!user) return

    const title = prompt('Note title', 'New Note')
    if (!title) return

    try {
      const nodeId = `note-${Date.now()}-${Math.random()
        .toString(36)
        .slice(2)}`

      const newNote = await db.createNote({
        user_id: user.id,
        node_id: nodeId,
        title,
        content: `# ${title}\n`,
        is_archived: false,
      })

      setNotes((prev) => [newNote, ...prev])
      setActiveId(newNote.id)
      setDraft(newNote.content)
    } catch (error) {
      console.error('[Notes] Failed to create note:', error)
    }
  }

  /* ===============================
     Delete note
  =============================== */
  const handleDeleteNote = async (id: string) => {
    if (!user) return
    if (!confirm('Delete this note?')) return

    try {
      await db.deleteNote(id, user.id)
      setNotes((prev) => prev.filter((n) => n.id !== id))
      if (activeId === id) setActiveId(null)
    } catch (error) {
      console.error('[Notes] Failed to delete note:', error)
    }
  }

  const activeNote = notes.find((n) => n.id === activeId)

  /* ===============================
     UI
  =============================== */
  if (loading) {
    return <div className="p-4 text-sm opacity-70">Loading notes…</div>
  }

  return (
    <div className="flex h-full">
      {/* Sidebar */}
      <aside className="w-64 border-r border-[color:var(--os-border)] bg-[color:var(--os-panel)] flex flex-col">
        <div className="flex items-center justify-between px-3 py-3 border-b border-[color:var(--os-border)]">
          <div className="text-xs font-semibold uppercase opacity-70">
            Notes
          </div>
          <button
            onClick={handleCreateNote}
            className="rounded-lg p-2 hover:bg-white/10"
            title="New note"
          >
            <FilePlus className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {notes.length === 0 ? (
            <div className="text-xs text-center py-8 opacity-50">
              No notes yet
            </div>
          ) : (
            notes.map((note) => (
              <div
                key={note.id}
                onClick={() => setActiveId(note.id)}
                className={`group relative rounded-lg px-3 py-2 cursor-pointer transition ${
                  activeId === note.id
                    ? 'bg-white/10'
                    : 'hover:bg-white/5'
                }`}
              >
                <div className="truncate font-medium text-sm">
                  {note.title}
                </div>
                <div className="truncate text-xs opacity-50">
                  {note.content.slice(0, 30)}…
                </div>

                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    handleDeleteNote(note.id)
                  }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-500/20"
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
                {new Date(activeNote.updated_at).toLocaleString()}
              </p>
            </div>

            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              className="flex-1 p-4 bg-transparent font-mono text-sm resize-none outline-none"
              placeholder="Start typing…"
            />
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-sm opacity-50">
            {notes.length === 0
              ? 'Create a note to begin'
              : 'Select a note to edit'}
          </div>
        )}
      </main>
    </div>
  )
}
