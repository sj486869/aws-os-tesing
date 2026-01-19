'use client'

import { useEffect, useRef, useState } from 'react'
import { useAuth } from '@/lib/auth/AuthContext'
import * as db from '@/lib/services/database'
import type { AppComponentProps } from '@/core/os/appRegistry'
import type { TerminalSession } from '@/types/database'

type Line = { type: 'in' | 'out'; text: string }

export function TerminalApp({}: AppComponentProps) {
  const { user } = useAuth()
  const [session, setSession] = useState<TerminalSession | null>(null)
  const [lines, setLines] = useState<Line[]>([
    { type: 'out', text: 'webOS Terminal v1.0 — type "help" for commands' },
  ])
  const [input, setInput] = useState('')
  const [cwd, setCwd] = useState('/home')
  const [loading, setLoading] = useState(true)
  const bottomRef = useRef<HTMLDivElement | null>(null)
  const inputRef = useRef<HTMLInputElement | null>(null)

  // Initialize terminal session
  useEffect(() => {
    if (!user) return

    const initSession = async () => {
      try {
        setLoading(true)
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

  // Auto-scroll to bottom
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: 'end' })
  }, [lines])

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const prompt = `user@webos:${cwd}$`

  const println = (text: string) => {
    setLines((prev) => [...prev, { type: 'out', text }])
  }

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
              '  history         Show command history',
              '  neofetch        System information',
            ].join('\n'),
          )
          break

        case 'ls':
          println('Documents/  Downloads/  Desktop/  .bashrc')
          break

        case 'cd':
          if (!arg) {
            setCwd('/home')
            println('Changed to home directory')
          } else if (arg === '..') {
            setCwd((prev) => {
              const parts = prev.split('/')
              parts.pop()
              return parts.join('/') || '/'
            })
          } else if (arg === '/') {
            setCwd('/')
          } else {
            setCwd((prev) => {
              const newPath = arg.startsWith('/') ? arg : `${prev}/${arg}`
              return newPath.replace(/\/+/g, '/')
            })
            println(`Changed to ${arg}`)
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
          println(arg || '')
          break

        case 'clear':
          setLines([])
          break

        case 'neofetch':
          println(
            [
              '',
              '     ___        ',
              '    /   \\___    webOS Desktop Environment',
              '   / [*] /  \\   User: ' + (user?.email || 'guest'),
              '  /  ~  /    \\  Kernel: Next.js v16',
              ' /  ~~~      \\ Database: Supabase PostgreSQL',
              '/_____________\\',
              '',
            ].join('\n'),
          )
          break

        case 'exit':
          println('Goodbye!')
          break

        default:
          println(`Command not found: ${cmd}. Type "help" for available commands.`)
      }

      // Update session output
      if (session && user) {
        try {
          const newOutput = `${session.output}${prompt} ${trimmed}\n`
          await db.updateTerminalSession(session.id, user.id, {
            output: newOutput,
            updated_at: new Date().toISOString(),
          })
        } catch (error) {
          console.error('[Terminal] Failed to save session:', error)
        }
      }
    } catch (error) {
      println(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  if (loading) {
    return <div className="p-4 text-sm opacity-70">Loading terminal...</div>
  }

  return (
    <div className="flex flex-col h-full bg-slate-950 text-slate-100 font-mono text-sm">
      {/* Output */}
      <div className="flex-1 overflow-y-auto p-4 space-y-1">
        {lines.map((line, idx) => (
          <div key={idx} className={line.type === 'in' ? 'text-blue-400' : 'text-slate-300'}>
            {line.text.split('\n').map((text, lineIdx) => (
              <div key={lineIdx} className={lineIdx > 0 ? 'pl-2' : ''}>
                {text}
              </div>
            ))}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="border-t border-slate-700 p-4 flex gap-2">
        <span className="text-green-400">{prompt}</span>
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              run(input)
            }
          }}
          className="flex-1 bg-transparent outline-none text-slate-100"
          autoFocus
        />
      </div>
    </div>
  )
}
