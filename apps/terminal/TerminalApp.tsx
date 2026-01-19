'use client'

import { useEffect, useRef, useState } from 'react'
import { useAuth } from '@/lib/auth/AuthContext'
import * as db from '@/lib/services/database'
import type { AppComponentProps } from '@/core/os/appRegistry'
import type { TerminalSession } from '@/types/database'

// Define types for terminal lines
type Line = { type: 'in' | 'out' | 'error' | 'system'; text: string }

export function TerminalApp({}: AppComponentProps) {
  const { user } = useAuth()

  // ===============================
  // STATE MANAGEMENT
  // ===============================
  const [session, setSession] = useState<TerminalSession | null>(null)
  const [lines, setLines] = useState<Line[]>([
    { type: 'out', text: 'webOS Terminal v1.0 — type "help" for commands' },
  ])
  const [input, setInput] = useState('')
  const [cwd, setCwd] = useState('/home')
  const [loading, setLoading] = useState(true)
  
  // History state for Up/Down arrow keys
  const [history, setHistory] = useState<string[]>([])
  const [historyIndex, setHistoryIndex] = useState(-1)
  
  // Offline mode flag
  const [isOffline, setIsOffline] = useState(false)

  // ===============================
  // REFS
  // ===============================
  const bottomRef = useRef<HTMLDivElement | null>(null)
  const inputRef = useRef<HTMLInputElement | null>(null)
  const scrollContainerRef = useRef<HTMLDivElement | null>(null)

  const prompt = `user@webos:${cwd}$`

  // ===============================
  // 1. INITIALIZATION
  // ===============================
  useEffect(() => {
    if (!user) return

    const initSession = async () => {
      try {
        setLoading(true)

        // Try to connect to the database
        const newSession = await db.createTerminalSession({
          user_id: user.id,
          title: `Terminal - ${new Date().toLocaleTimeString()}`,
          output: 'webOS Terminal v1.0 — type "help" for commands\n',
          working_directory: '/home',
        })

        setSession(newSession)
      } catch (error) {
        // FALLBACK: If DB fails, start in Offline Mode
        console.warn('[Terminal] DB Connection failed, starting offline mode.', error)
        setIsOffline(true)
        
        // Create a local dummy session so the app doesn't crash
        const offlineSession: TerminalSession = {
          id: `offline-${Date.now()}`,
          user_id: user.id,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          title: 'Local Session (Offline)',
          output: 'webOS Terminal v1.0 (Offline Mode)\n',
          working_directory: '/home'
        }
        
        setSession(offlineSession)
        setLines(prev => [
          ...prev, 
          { type: 'system', text: '⚠️ Connection to database failed. Running in offline mode (history will not be saved).' }
        ])
      } finally {
        setLoading(false)
      }
    }

    initSession()
  }, [user])

  // ===============================
  // 2. FOCUS & SCROLL LOGIC
  // ===============================
  
  // Keep focus on input unless user is selecting text
  const handleContainerClick = () => {
    const selection = window.getSelection()
    if (selection && selection.type === 'Range') return
    inputRef.current?.focus()
  }

  // Auto-scroll to bottom when lines change
  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight
    }
  }, [lines])

  // Initial focus
  useEffect(() => {
    if (!loading) {
      inputRef.current?.focus()
    }
  }, [loading])

  // Helper to print lines
  const println = (text: string, type: 'out' | 'error' | 'system' = 'out') => {
    setLines((prev) => [...prev, { type, text }])
  }

  // ===============================
  // 3. COMMAND RUNNER
  // ===============================
  const run = async (cmdline: string) => {
    const trimmed = cmdline.trim()
    
    // Echo input to terminal
    setLines((prev) => [...prev, { type: 'in', text: `${prompt} ${trimmed}` }])
    setInput('')
    setHistoryIndex(-1)
    
    if (!trimmed) return

    // Add to local history
    setHistory(prev => [trimmed, ...prev])

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
          println('Documents/  Downloads/  Desktop/  .bashrc  readme.md')
          break

        case 'cd':
          if (!arg || arg === '~') {
            setCwd('/home')
          } else if (arg === '..') {
            setCwd((prev) => prev.split('/').slice(0, -1).join('/') || '/')
          } else {
            const newPath = arg.startsWith('/') ? arg : `${cwd}/${arg}`.replace('//', '/')
            setCwd(newPath)
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
              '       /\\        OS: webOS 1.0',
              '      /  \\       Kernel: Next.js Turbo',
              '     /    \\      Uptime: ' + performance.now().toFixed(0) + 'ms',
              '    /      \\     Shell: webOS-sh',
              '   /________\\    User: ' + (user?.email?.split('@')[0] || 'guest'),
              '',
            ].join('\n')
          )
          break

        default:
          println(`webos: command not found: ${cmd}`, 'error')
      }

      // Save output to DB (Only if NOT offline)
      if (session && !isOffline) {
        await db.updateTerminalSession(session.id, {
          output: `${session.output}${prompt} ${trimmed}\n`,
        })
      }
    } catch (error) {
      println(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error')
    }
  }

  // ===============================
  // 4. INPUT HANDLER
  // ===============================
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      run(input)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      if (historyIndex < history.length - 1) {
        const newIndex = historyIndex + 1
        setHistoryIndex(newIndex)
        setInput(history[newIndex])
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      if (historyIndex > 0) {
        const newIndex = historyIndex - 1
        setHistoryIndex(newIndex)
        setInput(history[newIndex])
      } else {
        setHistoryIndex(-1)
        setInput('')
      }
    }
  }

  // ===============================
  // 5. RENDER
  // ===============================
  if (loading) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-[#0d1117] text-slate-400 font-mono text-sm">
        <span className="animate-pulse">Initializing TTY...</span>
      </div>
    )
  }

  return (
    <div 
      className="flex flex-col h-full w-full bg-[#0d1117] text-[#c9d1d9] font-mono text-[13px] leading-5"
      onClick={handleContainerClick}
    >
      <div 
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto p-4 custom-scrollbar"
      >
        {lines.map((line, idx) => (
          <div
            key={idx}
            className={`${
              line.type === 'in' 
                ? 'text-[#8b949e] mt-2' 
                : line.type === 'error'
                ? 'text-red-400' 
                : line.type === 'system'
                ? 'text-yellow-400 italic'
                : 'text-[#c9d1d9]'
            } whitespace-pre-wrap break-all`}
          >
            {line.text}
          </div>
        ))}

        {/* Input Area */}
        <div className="flex mt-2">
          <span className="text-[#58a6ff] mr-2 shrink-0 select-none">{prompt}</span>
          <div className="relative flex-1 group">
            {/* Hidden Input for capturing keystrokes */}
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              className="absolute inset-0 w-full opacity-0 cursor-text"
              autoComplete="off"
              autoCorrect="off"
              spellCheck="false"
            />
            {/* Visible Input with blinking cursor */}
            <span className="whitespace-pre-wrap break-all">
              {input}
              <span className="inline-block w-[8px] h-[15px] bg-[#c9d1d9] align-middle animate-pulse ml-[1px]" />
            </span>
          </div>
        </div>
        
        <div ref={bottomRef} />
      </div>
    </div>
  )
}