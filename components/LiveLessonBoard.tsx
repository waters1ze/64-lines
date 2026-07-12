'use client'

import React, { useEffect, useRef, useState, useMemo } from 'react'
import { Chess } from 'chess.js'
import { ArrowLeft, Upload, Loader2, Maximize, FileText } from 'lucide-react'

// Hook to load external script
function useScript(url: string) {
  const [status, setStatus] = useState(url ? 'loading' : 'idle')
  useEffect(() => {
    if (!url) return setStatus('idle')
    let script = document.querySelector(`script[src="${url}"]`) as HTMLScriptElement
    if (!script) {
      script = document.createElement('script')
      script.src = url
      script.async = true
      script.setAttribute('data-status', 'loading')
      document.body.appendChild(script)
      const setAttributeFromEvent = (event: Event) => {
        script.setAttribute('data-status', event.type === 'load' ? 'ready' : 'error')
      }
      script.addEventListener('load', setAttributeFromEvent)
      script.addEventListener('error', setAttributeFromEvent)
    } else {
      setStatus(script.getAttribute('data-status') || 'loading')
    }
    const setStateFromEvent = (event: Event) => setStatus(event.type === 'load' ? 'ready' : 'error')
    script.addEventListener('load', setStateFromEvent)
    script.addEventListener('error', setStateFromEvent)
    return () => {
      if (script) {
        script.removeEventListener('load', setStateFromEvent)
        script.removeEventListener('error', setStateFromEvent)
      }
    }
  }, [url])
  return status
}

export default function LiveLessonBoard({ sessionId, jitsiRoomName, userId, isTeacher, onClose }: {
  sessionId: string
  jitsiRoomName: string
  userId: string
  isTeacher: boolean
  onClose: () => void
}) {
  const [pgn, setPgn] = useState('')
  const [currentFen, setCurrentFen] = useState('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1')
  const [activeMoveId, setActiveMoveId] = useState<string | null>(null)
  
  const [flipped, setFlipped] = useState(!isTeacher)
  const [selected, setSelected] = useState<string | null>(null)
  const [dragFrom, setDragFrom] = useState<string | null>(null)

  const jitsiContainerRef = useRef<HTMLDivElement>(null)
  const jitsiApiRef = useRef<any>(null)
  const scriptStatus = useScript('https://8x8.vc/external_api.js')

  // Init Jitsi
  useEffect(() => {
    if (scriptStatus === 'ready' && !jitsiApiRef.current && jitsiContainerRef.current) {
      const domain = '8x8.vc'
      const options = {
        roomName: jitsiRoomName,
        width: '100%',
        height: '100%',
        parentNode: jitsiContainerRef.current,
        configOverwrite: { startWithAudioMuted: false, startWithVideoMuted: false },
        interfaceConfigOverwrite: { filmStripOnly: false },
      }
      jitsiApiRef.current = new (window as any).JitsiMeetExternalAPI(domain, options)
    }
    return () => {
      if (jitsiApiRef.current) jitsiApiRef.current.dispose()
    }
  }, [scriptStatus, jitsiRoomName])

  // Polling state
  useEffect(() => {
    let interval = setInterval(async () => {
      try {
        const res = await fetch('/api/live')
        if (res.ok) {
          const { session } = await res.json()
          if (!session || session.status === 'ENDED' || session.id !== sessionId) {
            onClose()
            return
          }
          if (session.pgn !== null && session.pgn !== pgn) setPgn(session.pgn)
          if (session.currentFen !== null && session.currentFen !== currentFen) setCurrentFen(session.currentFen)
          if (session.activeMoveId !== activeMoveId) setActiveMoveId(session.activeMoveId)
        }
      } catch (e) {}
    }, 1500)
    return () => clearInterval(interval)
  }, [sessionId, currentFen, activeMoveId, pgn])

  const updateState = async (updates: any) => {
    if (updates.pgn !== undefined) setPgn(updates.pgn)
    if (updates.currentFen !== undefined) setCurrentFen(updates.currentFen)
    if (updates.activeMoveId !== undefined) setActiveMoveId(updates.activeMoveId)

    try {
      await fetch('/api/live', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, ...updates })
      })
    } catch {}
  }

  const endLesson = async () => {
    if (confirm('Завершить урок?')) {
      await updateState({ status: 'ENDED' })
      onClose()
    }
  }

  // Chess logic
  const currentGame = useMemo(() => {
    try {
      const chess = new Chess()
      chess.loadPgn(pgn || '')
      return chess.history({ verbose: true })
    } catch {
      return []
    }
  }, [pgn])

  const boardGame = useMemo(() => {
    try { return new Chess(currentFen) } catch { return new Chess() }
  }, [currentFen])

  const handleSquareClick = (sq: string) => {
    if (!selected) {
      if (boardGame.get(sq as any)?.color === boardGame.turn()) setSelected(sq)
      return
    }
    tryMove(selected, sq)
  }

  const tryMove = (from: string, to: string) => {
    try {
      const bLatest = new Chess()
      if (pgn) bLatest.loadPgn(pgn)
      
      const isLatest = bLatest.fen() === currentFen || !pgn

      const b = new Chess(currentFen)
      const moves = b.moves({ verbose: true })
      let move = moves.find(m => m.from === from && m.to === to)
      if (!move && from.charAt(1) === '7' && to.charAt(1) === '8' && b.get(from as any)?.type === 'p') {
        move = moves.find(m => m.from === from && m.to === to && m.promotion === 'q') // auto queen
      }
      if (move) {
        if (isLatest) {
          bLatest.move(move)
          updateState({ currentFen: bLatest.fen(), pgn: bLatest.pgn(), activeMoveId: null })
        } else {
          b.move(move)
          updateState({ currentFen: b.fen(), pgn: b.pgn(), activeMoveId: null })
        }
      }
    } catch {}
    setSelected(null)
    setDragFrom(null)
  }

  const handleUploadPgn = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (ev) => {
        const text = ev.target?.result as string
        if (text) updateState({ pgn: text, currentFen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', activeMoveId: null })
      }
      reader.readAsText(file)
    }
  }

  return (
    <div className="fixed inset-0 z-[100] bg-background flex flex-col md:flex-row h-screen w-screen overflow-hidden">
      {/* Video section */}
      <div className="flex-1 h-[40vh] md:h-full border-b md:border-b-0 md:border-r relative flex flex-col bg-zinc-900">
        <div className="absolute top-4 left-4 z-10 flex gap-2">
          <button onClick={onClose} className="button bg-white text-black hover:bg-zinc-200"><ArrowLeft className="size-4 mr-1" /> Выйти</button>
          {isTeacher && <button onClick={endLesson} className="button bg-red-600 text-white hover:bg-red-700">Завершить урок</button>}
        </div>
        <div ref={jitsiContainerRef} className="flex-1 w-full h-full" />
      </div>

      {/* Board section */}
      <div className="w-full md:w-[600px] lg:w-[800px] h-[60vh] md:h-full flex flex-col overflow-hidden bg-background">
        <div className="p-4 border-b flex items-center justify-between">
          <h2 className="font-semibold text-lg">Интерактивная доска</h2>
          <div className="flex gap-2">
            <button className="icon-button" onClick={() => setFlipped(!flipped)} title="Перевернуть доску"><Maximize className="size-4" /></button>
            {isTeacher && (
              <label className="button w-fit cursor-pointer text-sm py-1.5 px-3">
                <Upload className="size-4 mr-1" /> Загрузить PGN
                <input type="file" accept=".pgn" className="hidden" onChange={handleUploadPgn} />
              </label>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 flex flex-col lg:flex-row gap-6">
          <div className="flex-1 flex flex-col items-center">
            {/* Board */}
            <div className="w-full max-w-[500px] aspect-square relative select-none touch-none bg-[#EAD4BA]">
              {/* Coordinates and squares rendering */}
              {[...Array(8)].map((_, i) => (
                <div key={i} className="flex h-[12.5%] w-full">
                  {[...Array(8)].map((_, j) => {
                    const row = flipped ? i : 7 - i
                    const col = flipped ? 7 - j : j
                    const sq = `${String.fromCharCode(97 + col)}${row + 1}`
                    const isDark = (row + col) % 2 === 0
                    const piece = boardGame.get(sq as any)
                    const isSelected = selected === sq
                    const isDrag = dragFrom === sq

                    return (
                      <div
                        key={sq}
                        className={`w-[12.5%] h-full relative flex items-center justify-center ${isDark ? 'bg-[#A87E56]' : 'bg-[#EAD4BA]'} ${isSelected ? 'after:absolute after:inset-0 after:bg-yellow-400/50' : ''}`}
                        onClick={() => handleSquareClick(sq)}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={() => {
                          if (dragFrom) tryMove(dragFrom, sq)
                        }}
                      >
                        {col === 0 && <span className={`absolute top-0.5 left-0.5 text-[0.6rem] font-bold ${isDark ? 'text-[#EAD4BA]' : 'text-[#A87E56]'}`}>{row + 1}</span>}
                        {row === 0 && <span className={`absolute bottom-0.5 right-0.5 text-[0.6rem] font-bold ${isDark ? 'text-[#EAD4BA]' : 'text-[#A87E56]'}`}>{String.fromCharCode(97 + col)}</span>}
                        
                        {piece && (
                          <img
                            draggable
                            onDragStart={() => setDragFrom(sq)}
                            src={`https://lichess1.org/assets/piece/cburnett/${piece.color}${piece.type.toUpperCase()}.svg`}
                            className={`w-4/5 h-4/5 ${isDrag ? 'opacity-0' : 'opacity-100'} cursor-grab active:cursor-grabbing hover:scale-105 transition-transform drop-shadow-md z-10`}
                          />
                        )}
                      </div>
                    )
                  })}
                </div>
              ))}
            </div>
          </div>
          
          <div className="w-full lg:w-64 border rounded-md bg-muted/20 p-2 flex flex-col h-64 lg:h-auto overflow-y-auto text-sm">
            {currentGame && currentGame.length > 0 ? (
              <div className="flex flex-col gap-1">
                {currentGame.map((move: any, idx: number) => {
                  const moveNumber = Math.floor(idx / 2) + 1
                  const moveId = idx.toString()
                  return (
                    <button
                      key={idx}
                      onClick={() => updateState({ currentFen: move.after, activeMoveId: moveId })}
                      className={`text-left px-2 py-1 rounded hover:bg-muted ${activeMoveId === moveId ? 'bg-primary text-primary-foreground font-bold' : ''}`}
                    >
                      {move.color === 'w' ? `${moveNumber}. ` : ''}{move.san}
                    </button>
                  )
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground opacity-50 text-center px-4">
                <FileText className="size-8 mb-2" />
                <p>Вы можете загрузить PGN или просто начать играть на доске</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
