'use client'

import { useEffect, useRef, useState } from 'react'
import { useAuth } from '@/lib/auth/AuthContext'
import * as db from '@/lib/services/database'
import type { AppComponentProps } from '@/core/os/appRegistry'
import type { TerminalSession } from '@/types/database'

type Line = { type: 'in' | 'out' | 'error'; text: string }

export function TerminalApp({}: AppComponentProps) {
  const { user } = useAuth()

  // State
  const [session, setSession] = useState<TerminalSession | null>(null)
  const [lines, setLines] = useState<Line[]>([
    { type: 'out', text: 'webOS Terminal v1.0 — type "help" for commands' },
  ])
  const [input, setInput] = useState('')
  const [cwd, setCwd] = useState('/home')
  const [loading, setLoading] = useState(true)

  // Refs
  const bottomRef = useRef<HTMLDivElement | null>(null)
  const inputRef = useRef<HTMLInputElement | null>(null)

  const prompt = `user@webos:${cwd}$`

  /* ===============================
     Init Session
  =============================== */
  useEffect(() => {
    if (!user) return

    const initSession = async () => {
      try {
        setLoading(true)

        // FIX: Removed 'updated_at' (handled by db helper)
        const newSession = await db.createTerminalSession({
          user_id: user.id,
          title: `Terminal Session - ${new Date().toLocaleTimeString()}`,
          output: 'webOS Terminal v1.0 — type "help" for commands\n',
          working_directory: '/home',
        })

        setSession(newSession)
      } catch (error) {
        console.error('[Terminal] Failed to create session:', error)
      } finally {
        setLoading(false)
      }
    }

    initSession()
  }, [user])

  /* ===============================
     Auto Scroll & Focus
  =============================== */
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: 'end' })
  }, [lines])

  useEffect(() => {
    inputRef.current?.focus()
  }, [loading])

  const println = (text: string, type: 'out' | 'error' = 'out') => {
    setLines((prev) => [...prev, { type, text }])
  }

  /* ===============================
     Run Command
  =============================== */
  const run = async (cmdline: string) => {
    const trimmed = cmdline.trim()
    if (!trimmed) return

    setLines((prev) => [...prev, { type: 'in', text: `${prompt} ${trimmed}` }])
    setInput('')

    const [cmd, ...rest] = trimmed.split(/\s+/)
    const arg = rest.join(' ')

    try {
      switch (cmd) {
        case 'help':
          println(
            [
              'Available commands:',
              '  ls              List directory contents',
              '  cd <path>       Change directory',
              '  pwd             Print working directory',
              '  whoami          Print current user',
              '  date            Print current date',
              '  echo <text>     Print text',
              '  clear           Clear terminal',
              '  neofetch        System information',
            ].join('\n')
          )
          break

        case 'ls':
          println('Documents/  Downloads/  Desktop/  .bashrc')
          break

        case 'cd':
          if (!arg) {
            setCwd('/home')
          } else if (arg === '..') {
            setCwd((prev) => prev.split('/').slice(0, -1).join('/') || '/')
          } else {
            setCwd((prev) =>
              (arg.startsWith('/') ? arg : `${prev}/${arg}`).replace(/\/+/g, '/')
            )
          }
          break

        case 'pwd':
          println(cwd)
          break

        case 'whoami':
          println(user?.email || 'guest')
          break

        case 'date':
          println(new Date().toLocaleString())
          break

        case 'echo':
          println(arg)
          break

        case 'clear':
          setLines([])
          break

        case 'neofetch':
          println(
            [
              '',
              '     ___         ',
              '    /   \\___    webOS Desktop Environment',
              '   / [*] /  \\   User: ' + (user?.email || 'guest'),
              '  /  ~  /    \\  Kernel: Next.js v16',
              ' /  ~~~      \\ Database: Supabase PostgreSQL',
              '/_____________\\',
              '',
            ].join('\n')
          )
          break

        default:
          println(`Command not found: ${cmd}`)
      }

      /* Save output */
      if (session && user) {
        // FIX: Removed 'user.id' arg and 'updated_at' property.
        // updateTerminalSession only takes (id, updates)
        await db.updateTerminalSession(session.id, {
          output: `${session.output}${prompt} ${trimmed}\n`,
        })
      }
    } catch (error) {
      println(
        `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'error'
      )
    }
  }

  if (loading) {
    return <div className="p-4 text-sm opacity-70">Loading terminal…</div>
  }

  return (
    <div 
      className="flex flex-col h-full bg-slate-950 text-slate-100 font-mono text-sm"
      onClick={() => inputRef.current?.focus()}
    >
      {/* Output */}
      <div className="flex-1 overflow-y-auto p-4 space-y-1">
        {lines.map((line, idx) => (
          <div
            key={idx}
            className={`whitespace-pre-wrap break-all ${
              line.type === 'in' ? 'text-blue-400' : line.type === 'error' ? 'text-red-400' : 'text-slate-300'
            }`}
          >
            {line.text}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="border-t border-slate-700 p-4 flex gap-2">
        <span className="text-green-400 shrink-0">{prompt}</span>
        <input
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && run(input)}
          className="flex-1 bg-transparent outline-none border-none p-0 focus:ring-0"
          autoFocus
        />
      </div>
    </div>
  )
}