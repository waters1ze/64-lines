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

type MoveNode = {
  id: string;
  san: string;
  moveNumber?: number;
  turn: 'w' | 'b';
  variations: MoveNode[][];
  comment?: string;
  fen: string;
  parentId: string | null;
}

type PgnGame = {
  event: string;
  white: string;
  black: string;
  result: string;
  startFen: string;
  rootMoves: MoveNode[];
  nodeMap: Record<string, MoveNode>;
}

function parsePgnGames(pgn: string): PgnGame[] {
  if (!pgn?.trim()) return []
  const blocks = pgn.split(/(?=\[Event )/).map(s => s.trim()).filter(Boolean)
  const { parse } = require('@mliebelt/pgn-parser')
  
  return blocks.map(block => {
    let parsedGame: any = null
    try {
      parsedGame = parse(block, { startRule: 'game' })
    } catch (e) {
      const get = (tag: string) => block.match(new RegExp(`\\[${tag} "(.+?)"\\]`))?.[1] ?? ''
      const fenMatch = block.match(/\[FEN "(.+?)"\]/)
      const startFen = fenMatch?.[1] ?? 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'
      const event = get('Event') === '?' ? '' : (get('Event') || 'Партия')
      return {
        event,
        white: get('White') === '?' ? '' : get('White'),
        black: get('Black') === '?' ? '' : get('Black'),
        result: get('Result'),
        startFen,
        rootMoves: [],
        nodeMap: {}
      }
    }

    const startFen = parsedGame.tags?.FEN ?? 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'
    let nextId = 1
    const nodeMap: Record<string, MoveNode> = {}
    
    function processMoves(moves: any[], currentFen: string, parentId: string | null): MoveNode[] {
      const result: MoveNode[] = []
      let fen = currentFen
      const chess = new Chess(fen)
      
      for (const m of moves) {
        const san = m.notation.notation
        let newFen = fen
        try {
          chess.move(san)
          newFen = chess.fen()
        } catch (e) {}
        
        const node: MoveNode = {
          id: `m${nextId++}`,
          san,
          moveNumber: m.moveNumber,
          turn: m.turn,
          fen: newFen,
          comment: m.commentDiag?.comment,
          variations: [],
          parentId
        }
        nodeMap[node.id] = node
        
        if (m.variations && m.variations.length > 0) {
          node.variations = m.variations.map((vMoves: any[]) => processMoves(vMoves, fen, parentId))
        }
        
        result.push(node)
        fen = newFen
        parentId = node.id
      }
      return result
    }
    
    return {
      event: parsedGame.tags?.Event === '?' ? '' : (parsedGame.tags?.Event || 'Партия'),
      white: parsedGame.tags?.White === '?' ? '' : (parsedGame.tags?.White || ''),
      black: parsedGame.tags?.Black === '?' ? '' : (parsedGame.tags?.Black || ''),
      result: parsedGame.tags?.Result || '',
      startFen,
      rootMoves: processMoves(parsedGame.moves || [], startFen, null),
      nodeMap
    }
  })
}

function MoveNodeList({ nodes, activeId, onSelect }: { nodes: MoveNode[], activeId: string|null, onSelect: (id: string) => void }) {
  return (
    <>
      {nodes.map((node, i) => (
        <React.Fragment key={node.id}>
          {node.turn === 'w' && <span className="text-muted-foreground select-none">{node.moveNumber}. </span>}
          {node.turn === 'b' && i === 0 && <span className="text-muted-foreground select-none">{node.moveNumber}… </span>}
          <span
            className={`cursor-pointer rounded px-0.5 transition-colors ${activeId === node.id ? 'bg-primary text-primary-foreground font-bold' : 'hover:bg-muted'}`}
            onClick={() => onSelect(node.id)}
          >
            {node.san}
          </span>
          {node.comment && (
            <> <span className="text-muted-foreground/80 italic text-xs">{'{ '}{node.comment}{' }'}</span></>
          )}
          {node.variations.map((v, vi) => (
            <React.Fragment key={vi}>
              {' '}
              <span className="text-muted-foreground/60 select-none">(</span>
              <MoveNodeList nodes={v} activeId={activeId} onSelect={onSelect} />
              <span className="text-muted-foreground/60 select-none">)</span>
            </React.Fragment>
          ))}
          {' '}
        </React.Fragment>
      ))}
    </>
  )
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
  const scriptStatus = useScript('https://jitsi.riot.im/external_api.js')

  // Init Jitsi
  useEffect(() => {
    if (scriptStatus === 'ready' && !jitsiApiRef.current && jitsiContainerRef.current) {
      const domain = 'jitsi.riot.im'
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

  const updateState = React.useCallback(async (updates: any) => {
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
  }, [sessionId])

  const endLesson = async () => {
    if (confirm('Завершить урок?')) {
      await updateState({ status: 'ENDED' })
      onClose()
    }
  }

  const [boardWidth, setBoardWidth] = useState<number | null>(null)
  const isResizing = useRef(false)
  const [innerBoardSize, setInnerBoardSize] = useState<number | null>(null)
  const isInnerResizing = useRef(false)
  const boardRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isResizing.current) {
        const newWidth = window.innerWidth - e.clientX
        if (newWidth > 300 && newWidth < window.innerWidth - 300) {
          setBoardWidth(newWidth)
        }
      }
      if (isInnerResizing.current && boardRef.current) {
        const rect = boardRef.current.getBoundingClientRect()
        const newSize = e.clientX - rect.left
        if (newSize > 250) {
          setInnerBoardSize(newSize)
        }
      }
    }
    const handleMouseUp = () => {
      if (isResizing.current || isInnerResizing.current) {
        isResizing.current = false
        isInnerResizing.current = false
        document.body.style.cursor = 'default'
      }
    }
    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [])

  // Chess logic
  const games = useMemo(() => parsePgnGames(pgn || ''), [pgn])
  const currentGame = games[0] // Since it's a live lesson, we just use the first game in PGN

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
      if (!currentGame) return
      
      if (e.key === 'ArrowLeft') {
        if (activeMoveId) {
          const node = currentGame.nodeMap[activeMoveId]
          if (node) updateState({ currentFen: node.parentId ? currentGame.nodeMap[node.parentId].fen : currentGame.startFen, activeMoveId: node.parentId })
        }
      }
      if (e.key === 'ArrowRight') {
        const candidates = Object.values(currentGame.nodeMap).filter(n => n.parentId === activeMoveId)
        if (candidates.length > 0) updateState({ currentFen: candidates[0].fen, activeMoveId: candidates[0].id })
      }
      if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
        if (!activeMoveId) return
        const parentId = currentGame.nodeMap[activeMoveId]?.parentId ?? null
        const siblings = Object.values(currentGame.nodeMap).filter(n => n.parentId === parentId)
        if (siblings.length > 1) {
          const currentIndex = siblings.findIndex(n => n.id === activeMoveId)
          let nextIndex = e.key === 'ArrowDown' ? currentIndex + 1 : currentIndex - 1
          if (nextIndex >= siblings.length) nextIndex = 0
          if (nextIndex < 0) nextIndex = siblings.length - 1
          updateState({ currentFen: siblings[nextIndex].fen, activeMoveId: siblings[nextIndex].id })
        }
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [currentGame, activeMoveId, updateState])

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

      {/* Resizer */}
      <div 
        className="hidden md:block w-1.5 bg-border hover:bg-primary/50 cursor-col-resize transition-colors"
        onMouseDown={() => { isResizing.current = true; document.body.style.cursor = 'col-resize' }}
      />

      {/* Board section */}
      <div 
        className="w-full md:w-auto h-[60vh] md:h-full flex flex-col overflow-hidden bg-background shrink-0"
        style={{ width: boardWidth ? boardWidth + 'px' : '50%' }}
      >
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
            <div 
              ref={boardRef}
              className="w-full aspect-square relative select-none touch-none bg-[#EAD4BA] max-w-full"
              style={innerBoardSize ? { width: innerBoardSize + 'px', flex: 'none' } : {}}
            >
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

              {/* Resizer Handle */}
              <div
                className="absolute -bottom-3 -right-3 w-6 h-6 cursor-se-resize z-50 text-muted-foreground hover:text-primary transition-colors flex items-center justify-center bg-background rounded-full shadow border"
                onMouseDown={(e) => { e.preventDefault(); isInnerResizing.current = true; document.body.style.cursor = 'se-resize' }}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v6h-6"/><path d="M21 21l-7-7"/><path d="M9 3H3v6"/><path d="M3 3l7 7"/></svg>
              </div>
            </div>
          </div>
          
          <div className="w-full lg:w-72 lg:min-w-64 border rounded-md bg-muted/20 p-4 flex flex-col h-64 lg:h-auto overflow-y-auto text-sm leading-6 shrink-0">
            {currentGame && currentGame.rootMoves.length > 0 ? (
              <div className="flex flex-wrap items-center gap-x-1">
                <MoveNodeList nodes={currentGame.rootMoves} activeId={activeMoveId} onSelect={(id) => {
                  const node = currentGame.nodeMap[id]
                  if (node) updateState({ currentFen: node.fen, activeMoveId: id })
                }} />
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
