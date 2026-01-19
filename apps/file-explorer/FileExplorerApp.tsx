'use client'

import React, { useEffect, useState, useRef, useCallback } from 'react'
import { 
  FolderPlus, Trash2, Upload, ChevronRight, File as FileIcon, 
  Film, Image as ImageIcon, Music, Search, Grid, List as ListIcon, 
  MoreVertical, Home, ArrowLeft, Download, X 
} from 'lucide-react'
import { useAuth } from '@/lib/auth/AuthContext'
import type { AppComponentProps } from '@/core/os/appRegistry'

// --- Types ---
interface VFSNode {
  id: string
  node_id: string
  name: string
  type: 'file' | 'folder'
  mime_type: string | null
  size: number
  created_at: string
}

interface ContextMenuState {
  x: number
  y: number
  node: VFSNode | null
}

const API_URL = "http://localhost:8000/api/fs"

export function FileExplorerApp({}: AppComponentProps) {
  const { user } = useAuth()
  
  // --- State ---
  const [currentFolder, setCurrentFolder] = useState<string | null>(null)
  const [folderContents, setFolderContents] = useState<VFSNode[]>([])
  const [filteredContents, setFilteredContents] = useState<VFSNode[]>([])
  const [loading, setLoading] = useState(false)
  const [breadcrumb, setBreadcrumb] = useState<Array<{ id: string; name: string }>>([])
  
  // UI State
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [searchQuery, setSearchQuery] = useState('')
  const [isDragging, setIsDragging] = useState(false)
  
  // Selection / Modals
  const [selectedFile, setSelectedFile] = useState<VFSNode | null>(null)
  const [contextMenu, setContextMenu] = useState<ContextMenuState>({ x: 0, y: 0, node: null })
  
  const fileInputRef = useRef<HTMLInputElement>(null)

  // --- 1. Fetching Data ---
  const loadContents = useCallback(async () => {
    if (!user) return

    try {
      setLoading(true)
      const params = new URLSearchParams({ user_id: user.id })
      if (currentFolder) params.append('parent_id', currentFolder)

      const res = await fetch(`${API_URL}/list?${params.toString()}`)
      if (!res.ok) throw new Error('Failed to fetch')
      
      const data: VFSNode[] = await res.json()
      setFolderContents(data)
    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  }, [user, currentFolder])

  useEffect(() => {
    loadContents()
  }, [loadContents])

  // Search Filter Effect
  useEffect(() => {
    if (!searchQuery) {
      setFilteredContents(folderContents)
    } else {
      setFilteredContents(folderContents.filter(f => 
        f.name.toLowerCase().includes(searchQuery.toLowerCase())
      ))
    }
  }, [searchQuery, folderContents])

  // --- 2. Actions ---

  const handleCreateFolder = async () => {
    const name = prompt('Folder name', 'New Folder')
    if (!name || !user) return

    try {
      const formData = new FormData()
      formData.append('user_id', user.id)
      formData.append('name', name)
      if (currentFolder) formData.append('parent_id', currentFolder)

      await fetch(`${API_URL}/folder`, { method: 'POST', body: formData })
      loadContents()
    } catch (e) { alert('Failed to create folder') }
  }

  const handleUpload = async (files: FileList | null) => {
    if (!user || !files || files.length === 0) return

    try {
      setLoading(true)
      for (let i = 0; i < files.length; i++) {
        const formData = new FormData()
        formData.append('user_id', user.id)
        if (currentFolder) formData.append('parent_id', currentFolder)
        formData.append('file', files[i])

        await fetch(`${API_URL}/upload`, { method: 'POST', body: formData })
      }
      loadContents()
    } catch (e) { alert('Upload failed') } 
    finally { setLoading(false) }
  }

  const handleDelete = async (node: VFSNode) => {
    if (!confirm(`Delete "${node.name}"?`)) return
    try {
      await fetch(`${API_URL}/delete/${node.id}`, { method: 'DELETE' })
      if (selectedFile?.id === node.id) setSelectedFile(null)
      loadContents()
    } catch (e) { console.error(e) }
  }

  // --- 3. Navigation ---
  const navigateTo = (folderId: string, folderName: string) => {
    setCurrentFolder(folderId)
    setBreadcrumb(prev => [...prev, { id: folderId, name: folderName }])
    setSearchQuery('')
  }

  const navigateUp = () => {
    if (breadcrumb.length === 0) return
    const newBreadcrumb = breadcrumb.slice(0, -1)
    setBreadcrumb(newBreadcrumb)
    setCurrentFolder(newBreadcrumb.length > 0 ? newBreadcrumb[newBreadcrumb.length - 1].id : null)
  }

  const goToRoot = () => {
    setCurrentFolder(null)
    setBreadcrumb([])
  }

  // --- 4. Event Handlers ---
  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }
  
  const onDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    handleUpload(e.dataTransfer.files)
  }

  const handleContextMenu = (e: React.MouseEvent, node: VFSNode) => {
    e.preventDefault()
    setContextMenu({ x: e.clientX, y: e.clientY, node })
  }

  // Close context menu on click elsewhere
  useEffect(() => {
    const closeMenu = () => setContextMenu({ x: 0, y: 0, node: null })
    window.addEventListener('click', closeMenu)
    return () => window.removeEventListener('click', closeMenu)
  }, [])

  // --- 5. Helpers ---
  const getIcon = (mime: string | null, type: string) => {
    if (type === 'folder') return <div className="text-yellow-400 drop-shadow-sm"><FolderPlus size={40} strokeWidth={1.5} /></div>
    if (mime?.startsWith('image/')) return <div className="text-purple-400"><ImageIcon size={40} strokeWidth={1.5} /></div>
    if (mime?.startsWith('video/')) return <div className="text-red-400"><Film size={40} strokeWidth={1.5} /></div>
    if (mime?.startsWith('audio/')) return <div className="text-green-400"><Music size={40} strokeWidth={1.5} /></div>
    return <div className="text-blue-400"><FileIcon size={40} strokeWidth={1.5} /></div>
  }

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
  }

  return (
    <div 
      className="flex h-full bg-zinc-900 text-zinc-100 font-sans relative overflow-hidden"
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      {/* Drag Overlay */}
      {isDragging && (
        <div className="absolute inset-0 z-50 bg-blue-500/20 backdrop-blur-sm border-4 border-blue-500 border-dashed flex items-center justify-center pointer-events-none">
          <div className="text-2xl font-bold text-blue-100">Drop files to upload</div>
        </div>
      )}

      {/* --- Sidebar --- */}
      <aside className="w-60 bg-zinc-900/50 border-r border-zinc-800 flex flex-col backdrop-blur-md">
        <div className="p-4 flex items-center gap-2 text-xl font-bold tracking-tight text-white/90">
           <div className="w-3 h-3 rounded-full bg-red-500" />
           <div className="w-3 h-3 rounded-full bg-yellow-500" />
           <div className="w-3 h-3 rounded-full bg-green-500" />
           <span className="ml-2 text-sm opacity-50">File Explorer</span>
        </div>

        <div className="flex-1 overflow-y-auto py-2">
          <div className="px-4 py-2 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Locations</div>
          <button onClick={goToRoot} className={`w-full flex items-center gap-3 px-4 py-2 text-sm transition-all ${!currentFolder ? 'bg-blue-600/20 text-blue-400 border-r-2 border-blue-500' : 'hover:bg-zinc-800 text-zinc-400'}`}>
            <Home size={18} /> Home
          </button>
          
          <div className="mt-6 px-4 py-2 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Quick Actions</div>
          <button onClick={handleCreateFolder} className="w-full flex items-center gap-3 px-4 py-2 text-sm text-zinc-400 hover:bg-zinc-800 hover:text-white transition-all">
            <FolderPlus size={18} /> New Folder
          </button>
          <button onClick={() => fileInputRef.current?.click()} className="w-full flex items-center gap-3 px-4 py-2 text-sm text-zinc-400 hover:bg-zinc-800 hover:text-white transition-all">
            <Upload size={18} /> Upload File
          </button>
          <input ref={fileInputRef} type="file" multiple className="hidden" onChange={(e) => handleUpload(e.target.files)} />
        </div>
      </aside>

      {/* --- Main Content --- */}
      <main className="flex-1 flex flex-col bg-zinc-950/30">
        {/* Toolbar */}
        <header className="h-16 border-b border-zinc-800 flex items-center justify-between px-6 bg-zinc-900/50 backdrop-blur-xl">
          <div className="flex items-center gap-4 flex-1">
            <div className="flex items-center gap-2">
              <button onClick={navigateUp} disabled={breadcrumb.length === 0} className="p-2 rounded-full hover:bg-zinc-800 disabled:opacity-30">
                <ArrowLeft size={18} />
              </button>
              <div className="h-4 w-[1px] bg-zinc-700 mx-1" />
            </div>

            {/* Breadcrumbs */}
            <div className="flex items-center gap-1 text-sm bg-zinc-900/80 px-3 py-1.5 rounded-md border border-zinc-800/50 shadow-inner">
              <button onClick={goToRoot} className="hover:text-white text-zinc-400">Home</button>
              {breadcrumb.map((item) => (
                <React.Fragment key={item.id}>
                  <ChevronRight size={12} className="text-zinc-600" />
                  <span className="font-medium text-zinc-200">{item.name}</span>
                </React.Fragment>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Search */}
            <div className="relative group">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-blue-400" />
              <input 
                type="text" 
                placeholder="Search..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-zinc-900 border border-zinc-800 rounded-full pl-10 pr-4 py-1.5 text-sm focus:outline-none focus:border-blue-500/50 w-48 transition-all focus:w-64"
              />
            </div>
            
            {/* View Toggle */}
            <div className="flex bg-zinc-800 p-1 rounded-lg">
              <button onClick={() => setViewMode('grid')} className={`p-1.5 rounded ${viewMode === 'grid' ? 'bg-zinc-600 text-white shadow' : 'text-zinc-400 hover:text-white'}`}>
                <Grid size={16} />
              </button>
              <button onClick={() => setViewMode('list')} className={`p-1.5 rounded ${viewMode === 'list' ? 'bg-zinc-600 text-white shadow' : 'text-zinc-400 hover:text-white'}`}>
                <ListIcon size={16} />
              </button>
            </div>
          </div>
        </header>

        {/* Files Area */}
        <div className="flex-1 overflow-auto p-6" onContextMenu={(e) => e.preventDefault()}>
          {loading ? (
             <div className="flex items-center justify-center h-full text-zinc-500 gap-2">
                <div className="animate-spin h-5 w-5 border-2 border-blue-500 border-t-transparent rounded-full" />
                Loading...
             </div>
          ) : filteredContents.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-zinc-600">
              <FolderPlus size={64} className="mb-4 opacity-20" />
              <p>This folder is empty</p>
              <p className="text-xs opacity-50 mt-1">Right click or drag files here to upload</p>
            </div>
          ) : (
            <>
              {viewMode === 'grid' ? (
                // GRID VIEW
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                  {filteredContents.map((node) => (
                    <div
                      key={node.id}
                      className="group relative p-4 rounded-xl border border-transparent hover:border-zinc-700 hover:bg-zinc-800/50 cursor-pointer flex flex-col items-center text-center transition-all duration-200"
                      onDoubleClick={() => node.type === 'folder' ? navigateTo(node.id, node.name) : setSelectedFile(node)}
                      onContextMenu={(e) => handleContextMenu(e, node)}
                    >
                      <div className="mb-3 transition-transform group-hover:scale-110 duration-200">
                        {getIcon(node.mime_type, node.type)}
                      </div>
                      <span className="text-xs font-medium w-full truncate text-zinc-300 group-hover:text-white">{node.name}</span>
                      <span className="text-[10px] text-zinc-500 mt-1">{node.type === 'folder' ? 'Folder' : formatSize(node.size)}</span>
                    </div>
                  ))}
                </div>
              ) : (
                // LIST VIEW
                <div className="min-w-full inline-block align-middle">
                  <div className="border border-zinc-800 rounded-lg overflow-hidden">
                    <table className="min-w-full divide-y divide-zinc-800">
                      <thead className="bg-zinc-900">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">Name</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">Size</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">Date</th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-zinc-500 uppercase tracking-wider">Action</th>
                        </tr>
                      </thead>
                      <tbody className="bg-zinc-900/30 divide-y divide-zinc-800">
                        {filteredContents.map((node) => (
                          <tr 
                            key={node.id} 
                            className="hover:bg-zinc-800/50 cursor-pointer transition-colors"
                            onDoubleClick={() => node.type === 'folder' ? navigateTo(node.id, node.name) : setSelectedFile(node)}
                            onContextMenu={(e) => handleContextMenu(e, node)}
                          >
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-zinc-200 flex items-center gap-3">
                              {node.type === 'folder' ? <FolderPlus size={16} className="text-yellow-500"/> : <FileIcon size={16} className="text-blue-500"/>}
                              {node.name}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-zinc-500 font-mono">
                              {node.type === 'folder' ? '--' : formatSize(node.size)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-zinc-500">
                              {new Date(node.created_at).toLocaleDateString()}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                              <button onClick={(e) => { e.stopPropagation(); handleContextMenu(e, node) }} className="text-zinc-500 hover:text-white">
                                <MoreVertical size={16} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </main>

      {/* --- Context Menu --- */}
      {contextMenu.node && (
        <div 
          className="fixed z-50 w-48 bg-zinc-800 border border-zinc-700 rounded-lg shadow-xl py-1 animate-in fade-in zoom-in-95 duration-100"
          style={{ top: contextMenu.y, left: contextMenu.x }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="px-3 py-2 text-xs text-zinc-500 border-b border-zinc-700 mb-1 font-medium truncate">
            {contextMenu.node.name}
          </div>
          <button 
            className="w-full text-left px-4 py-2 text-sm text-zinc-200 hover:bg-zinc-700 flex items-center gap-2"
            onClick={() => {
              if (contextMenu.node?.type === 'folder') navigateTo(contextMenu.node.id, contextMenu.node.name)
              else setSelectedFile(contextMenu.node)
              setContextMenu({x:0, y:0, node:null})
            }}
          >
            {contextMenu.node.type === 'folder' ? <FolderPlus size={14} /> : <FileIcon size={14} />} Open
          </button>
          
          {contextMenu.node.type === 'file' && (
             <a 
               href={`${API_URL}/view/${contextMenu.node.id}`} 
               download={contextMenu.node.name}
               className="w-full text-left px-4 py-2 text-sm text-zinc-200 hover:bg-zinc-700 flex items-center gap-2 block"
             >
               <Download size={14} /> Download
             </a>
          )}
          
          <div className="h-[1px] bg-zinc-700 my-1" />
          <button 
            className="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-red-500/10 flex items-center gap-2"
            onClick={() => {
              handleDelete(contextMenu.node!)
              setContextMenu({x:0, y:0, node:null})
            }}
          >
            <Trash2 size={14} /> Delete
          </button>
        </div>
      )}

      {/* --- Preview Modal --- */}
      {selectedFile && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-md animate-in fade-in duration-200">
          <div className="relative w-full max-w-5xl h-[85vh] flex flex-col bg-zinc-900 rounded-xl overflow-hidden shadow-2xl border border-zinc-800">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-zinc-800 bg-zinc-900/50">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-zinc-800 rounded-lg">
                   {getIcon(selectedFile.mime_type, 'file')}
                </div>
                <div>
                  <h3 className="font-semibold text-lg">{selectedFile.name}</h3>
                  <p className="text-xs text-zinc-500">{formatSize(selectedFile.size)} • {selectedFile.mime_type}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <a 
                  href={`${API_URL}/view/${selectedFile.id}`} 
                  download={selectedFile.name}
                  className="p-2 hover:bg-zinc-800 rounded-full transition-colors text-zinc-400 hover:text-white"
                  title="Download"
                >
                  <Download size={20} />
                </a>
                <button onClick={() => setSelectedFile(null)} className="p-2 hover:bg-red-500/20 hover:text-red-400 rounded-full transition-colors">
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 bg-black/50 flex items-center justify-center overflow-auto p-8">
              {selectedFile.mime_type?.startsWith('image/') ? (
                <img 
                  src={`${API_URL}/view/${selectedFile.id}`} 
                  alt={selectedFile.name} 
                  className="max-w-full max-h-full object-contain shadow-lg rounded-lg"
                />
              ) : selectedFile.mime_type?.startsWith('video/') ? (
                <video 
                  src={`${API_URL}/view/${selectedFile.id}`} 
                  controls 
                  autoPlay 
                  className="max-w-full max-h-full rounded-lg shadow-lg"
                />
              ) : selectedFile.mime_type?.startsWith('audio/') ? (
                <div className="w-full max-w-md bg-zinc-800 p-6 rounded-xl shadow-xl flex flex-col items-center gap-4">
                   <div className="w-24 h-24 bg-zinc-700 rounded-full flex items-center justify-center animate-pulse">
                      <Music size={40} className="text-zinc-400" />
                   </div>
                   <audio src={`${API_URL}/view/${selectedFile.id}`} controls className="w-full" />
                </div>
              ) : (
                <div className="text-center">
                   <FileIcon size={80} className="text-zinc-700 mb-4 mx-auto" />
                   <p className="text-zinc-400 mb-4">No preview available</p>
                   <a 
                      href={`${API_URL}/view/${selectedFile.id}`} 
                      download={selectedFile.name}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm transition-colors"
                   >
                      Download File
                   </a>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}