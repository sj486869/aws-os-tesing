import React from "react"
import type { Metadata, Viewport } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import './globals.css'

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  title: 'webOS - Professional Desktop Environment',
  description:
    'A production-grade web operating system with Supabase database integration for file management, notes, terminal, and AI assistant',
  keywords: [
    'webOS',
    'desktop',
    'operating system',
    'file manager',
    'notes app',
    'terminal',
    'AI assistant',
  ],
  authors: [{ name: 'webOS' }],
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://webos.example.com',
    siteName: 'webOS Desktop',
  },
    generator: 'v0.app'
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#0b0d12',
  colorScheme: 'dark',
  userScalable: false,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased h-dvh w-dvw overflow-hidden bg-[color:var(--os-bg)] text-[color:var(--os-fg)]`}
      >
        {children}
      </body>
    </html>
  )
}
