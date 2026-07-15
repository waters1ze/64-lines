'use client'

import React, { useState, useMemo, useRef, useEffect, lazy, Suspense } from 'react'
import {
  ArrowLeft, ArrowRight, Bell, BookOpen, Check, ChevronRight, ChevronLeft, CircleDollarSign,
  ExternalLink, GraduationCap, ImagePlus, LayoutDashboard, Library,
  LockKeyhole, Menu, Pencil, Play, Plus, RotateCcw, Trophy,
  Settings, Store, Trash2, Upload, UserPlus, Users, Video, X, MessageSquare, ShieldCheck,
  CheckCircle2, Unlock, Search, Phone, FileSearch, Crown, Award, Zap
} from 'lucide-react'
import { Chess } from 'chess.js'
import dynamic from 'next/dynamic'
import { ActivityCalendar } from './ActivityCalendar'
import { AchievementsTab } from './AchievementsTab'
import { PuzzleRush } from './PuzzleRush'
import { EngineAnalysis } from './EngineAnalysis'
import { OpeningTrainer } from './OpeningTrainer'
import '@uiw/react-md-editor/markdown-editor.css'
import '@uiw/react-markdown-preview/markdown.css'

const MDEditor = dynamic(() => import('@uiw/react-md-editor').then(m => m.default), { ssr: false })
const MarkdownPreview = dynamic(() => import('@uiw/react-markdown-preview').then(m => m.default), { ssr: false })
const Chessboard = dynamic(() => import('react-chessboard').then(m => m.Chessboard), { ssr: false })

import ChatComponent from './ChatComponent'
import LiveLessonBoard from './LiveLessonBoard'
import { AvailableStudents, StudentTeacherPanel, OverviewInvitesWidget } from './InviteComponents'
import { ResizableBoardContainer } from './ResizableBoard'
import { Puzzles } from './Puzzles'
import { FriendsTab } from './FriendsTab'
import { AdminPuzzles } from './admin-puzzles'

// ─── Types ────────────────────────────────────────────────────────────────────

type Role = 'Учитель' | 'Ученик' | 'Покупатель'
type Section =
  | 'overview' | 'students' | 'studentProfile' | 'homework' | 'homeworkPuzzle'
  | 'videos' | 'openings' | 'modules' | 'sales' | 'store' | 'courses' | 'settings' | 'courseViewer'
  | 'leaderboard' | 'users' | 'shop' | 'chat' | 'live' | 'findTeacher' | 'analysis' | 'puzzles' | 'missedPuzzles' | 'add_puzzle' | 'friends'
  | 'achievements' | 'puzzleRush' | 'openingTrainer'

type TreeNode = { san: string; comment: string; children: TreeNode[] }
type GameTree = { children: TreeNode[]; comment: string }

type Student = { id: string | number; name: string; rating: number; email?: string }
type HW = {
  id: string | number; studentId: string | number; title: string; assignedAt?: string; dueDate?: string | null
  progress: number; solved: boolean; attempts: number; pgn: string; status?: string; assigned?: string; due?: string
  teacherNote?: string; rating?: number;
}
type Course = {
  id: string | number;
  name: string;
  description: string;
  price: number;
  imageUrl?: string | null;
  fileUrl?: string | null;
  pgn?: string | null;
  isPremium?: boolean;
  createdAt: any;
}

type Video = {
  id: string | number;
  title: string;
  meta: string;
  url: string;
  isPremium?: boolean;
}

type Opening = {
  id: string | number;
  title: string;
  pgn: string;
}

type Lesson = {
  id: string;
  title: string;
  videoUrl?: string | null;
  fileUrl?: string | null;
  order: number;
  moduleId: string;
}

type Module = {
  id: string;
  title: string;
  description?: string | null;
  tags: string[];
  visibility: 'ALL' | 'PAID' | 'STUDENTS';
  price: number;
  order: number;
  lessons: Lesson[];
  hasAccess?: boolean;
}

// ─── Seed data ─────────────────────────────────────────────────────────────────

const SAMPLE_PGN = `[Event "Домашнее задание"]

1. e4 e5 2. Nf3 Nc6 3. Bb5`

const INIT_STUDENTS: Student[] = []
const INIT_HW: HW[] = []
const INIT_COURSES: Course[] = []
const INIT_VIDEOS: Video[] = []
const INIT_OPENINGS: Opening[] = []
const STATIC_MODULES = [
  { name: 'Стратегия: Центр', lessons: 12, progress: 0 },
  { name: 'Эндшпиль: Пешечный', lessons: 8, progress: 0 },
  { name: 'Тактика: Связка', lessons: 15, progress: 0 }
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

function cloneTree<T>(v: T): T { return JSON.parse(JSON.stringify(v)) }
function initials(name: string) { return name.split(' ').map((w: string) => w[0]).join('') }

function parseHwPgn(pgn: string): { startFen: string; solution: string[] }[] {
  const blocks = pgn.split(/(?=\[Event )/).map(s => s.trim()).filter(Boolean);
  if (blocks.length === 0 && pgn.trim()) blocks.push(pgn);
  
  return blocks.map(block => {
    try {
      let normalizedPgn = block
      const fenMatch = block.match(/\[FEN "(.+?)"\]/)
      const startFen = fenMatch?.[1] ?? 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'
      if (fenMatch && !block.includes('[SetUp "1"]')) {
        normalizedPgn = '[SetUp "1"]\n' + block
      }
      const g = new Chess()
      g.loadPgn(normalizedPgn)
      return { startFen, solution: g.history() }
    } catch {
      return null
    }
  }).filter((x): x is { startFen: string; solution: string[] } => x !== null)
}

function parsePgnToTree(pgn: string): GameTree {
  if (!pgn?.trim()) return { children: [], comment: '' }
  if (pgn.startsWith('{') && pgn.endsWith('}')) {
    try { return JSON.parse(pgn) } catch {}
  }
  
  const { parse } = require('@mliebelt/pgn-parser')
  let parsedGame: any
  try {
    parsedGame = parse(pgn, { startRule: 'game' })
  } catch (e) {
    return { children: [], comment: '' }
  }

  if (!parsedGame) return { children: [], comment: '' }

  function processMoves(moves: any[], targetChildrenArray: TreeNode[]) {
    if (!moves || moves.length === 0) return
    let currentParentChildren = targetChildrenArray
    
    for (const m of moves) {
      const node: TreeNode = {
        san: m.notation.notation,
        comment: m.commentDiag?.comment || '',
        children: []
      }
      currentParentChildren.push(node)
      
      if (m.variations && m.variations.length > 0) {
        for (const variation of m.variations) {
          processMoves(variation, currentParentChildren)
        }
      }
      currentParentChildren = node.children
    }
  }

  const rootChildren: TreeNode[] = []
  processMoves(parsedGame.moves || [], rootChildren)
  return { children: rootChildren, comment: '' }
}

function TreeNodesRenderer({
  nodes, currentPath, activePath, onSelect, onContextMenu, onComment, isMainLine = true
}: {
  nodes: TreeNode[], currentPath: string[], activePath: string[],
  onSelect: (path: string[]) => void, onContextMenu: (e: React.MouseEvent, path: string[]) => void, onComment: (path: string[], node: TreeNode) => void, isMainLine?: boolean
}) {
  if (!nodes || nodes.length === 0) return null;
  const mainNode = nodes[0];
  const variations = nodes.slice(1);
  
  const renderNode = (node: TreeNode, isVariation: boolean, isMainLineFlag: boolean) => {
    const nodePath = [...currentPath, node.san]
    const isActive = activePath[nodePath.length - 1] === node.san && activePath.slice(0, nodePath.length - 1).join() === currentPath.join()
    const moveNumber = Math.floor(currentPath.length / 2) + 1
    const isWhite = currentPath.length % 2 === 0
    
    return (
      <React.Fragment key={node.san}>
        {isVariation ? <span className="text-muted-foreground/60 select-none"> (</span> : (currentPath.length > 0 ? ' ' : '')}
        
        {isWhite && <span className="text-muted-foreground select-none">{moveNumber}. </span>}
        {!isWhite && (!isMainLineFlag || isVariation) && <span className="text-muted-foreground select-none">{moveNumber}... </span>}
        
        <button
          className={`rounded px-1 text-sm transition-colors ${isActive ? 'bg-primary text-primary-foreground font-bold' : 'hover:bg-muted'}`}
          onClick={() => onSelect(nodePath)}
          onContextMenu={e => { e.preventDefault(); onContextMenu(e, nodePath) }}
        >
          {node.san}
        </button>
        
        <button className="text-[10px] opacity-30 hover:opacity-100" title="Комментарий"
          onClick={(e) => { e.stopPropagation(); onComment(nodePath, node) }}>
          💬
        </button>

        {node.comment && <span className="ml-1 mr-1 text-xs italic text-muted-foreground">{`{ ${node.comment} }`}</span>}
        
        {isVariation && node.children.length > 0 && (
          <TreeNodesRenderer nodes={node.children} currentPath={nodePath} activePath={activePath} onSelect={onSelect} onContextMenu={onContextMenu} onComment={onComment} isMainLine={false} />
        )}
        
        {isVariation && <span className="text-muted-foreground/60 select-none">) </span>}
      </React.Fragment>
    )
  }

  return (
    <>
      {renderNode(mainNode, false, isMainLine)}
      {variations.map(variation => renderNode(variation, true, false))}
      {mainNode.children.length > 0 && (
        <TreeNodesRenderer nodes={mainNode.children} currentPath={[...currentPath, mainNode.san]} activePath={activePath} onSelect={onSelect} onContextMenu={onContextMenu} onComment={onComment} isMainLine={isMainLine} />
      )}
    </>
  )
}

// ─── Common UI ────────────────────────────────────────────────────────────────

function ProgressBar({ value }: { value: number }) {
  return <div className="h-1.5 overflow-hidden rounded-full bg-muted"><div className="h-full bg-primary transition-all" style={{ width: `${value}%` }} /></div>
}

function Head({ over, title, text, action }: { over: string; title: string; text: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{over}</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight md:text-3xl">{title}</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">{text}</p>
      </div>
      {action}
    </div>
  )
}

function Metric({ label, value, note, icon, accentClass }: { label: string; value: string; note: string; icon?: React.ReactNode; accentClass?: string }) {
  return (
    <article className="rounded-lg border p-5 relative overflow-hidden">
      {icon && (
        <div className={`absolute top-4 right-4 opacity-80 ${accentClass || ''}`}>
          {icon}
        </div>
      )}
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className={`mt-3 text-3xl font-semibold tracking-tight ${accentClass || ''}`}>{value}</p>
      <p className="mt-2 text-xs text-muted-foreground">{note}</p>
    </article>
  )
}

function Modal({ title, close, children, wide }: { title: string | React.ReactNode; close: () => void; children: React.ReactNode; wide?: boolean }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/20 p-4" onMouseDown={close}>
      <div role="dialog" aria-modal="true"
        className={`flex max-h-[90vh] w-full flex-col gap-5 overflow-y-auto rounded-xl border bg-background p-6 ${wide ? 'max-w-2xl' : 'max-w-xl'}`}
        onMouseDown={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">{title}</h2>
          <button className="icon-button" onClick={close}><X /></button>
        </div>
        {children}
      </div>
    </div>
  )
}

const formatDate = (dateStr?: string | null) => {
  if (!dateStr) return 'Без даты'
  if (dateStr.includes(' ')) return dateStr // mock data format
  try { return new Date(dateStr).toLocaleDateString('ru-RU') } catch { return dateStr }
}

function HwCard({ hw, isStudent, onOpen }: { hw: HW; isStudent?: boolean; onOpen: () => void }) {
  return (
    <article className="rounded-lg border p-5">
      <div className="flex items-center justify-between gap-3">
        <span className="badge">{hw.status || (hw.progress === 100 ? 'Выполнено' : 'В работе')}</span>
        <span className="text-xs text-muted-foreground">{formatDate(hw.assignedAt || hw.assigned)}</span>
      </div>
      <h3 className="mt-4 font-semibold">{hw.title}</h3>
      <p className="mt-1 text-sm text-muted-foreground">Срок: {hw.dueDate ? `до ${formatDate(hw.dueDate)}` : hw.due}</p>
      {hw.solved && <p className="mt-1 text-xs text-green-600 dark:text-green-400">✅ Решено (попыток: {hw.attempts})</p>}
      <div className="mt-4">
        <div className="mb-1.5 flex justify-between text-xs"><span>Прогресс</span><span>{hw.progress}%</span></div>
        <ProgressBar value={hw.progress} />
      </div>
      <button className={`${isStudent ? 'button' : 'outline-button'} mt-4 w-full`} onClick={onOpen}>
        {isStudent ? 'Решить задание' : 'Открыть задание'}<ChevronRight />
      </button>
    </article>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

import { signOut, useSession } from 'next-auth/react'
import Link from 'next/link'

import { useRouter, useSearchParams } from 'next/navigation'

export function TeacherHub({ 
  initialRole = 'Учитель', 
  userName = 'Учитель', 
  userRating = 1200,
  userRank,
  initialStudents,
  initialHomeworks,
  initialCourses,
  initialVideos,
  initialOpenings,
  initialPurchases = [],
  isPremium = false,
  puzzlesSolvedTotal,
  puzzlesAttempted,
  activityStreak,
}: { 
  initialRole?: string, 
  userName: string
  userRating: number
  userRank?: number
  isPremium: boolean
  puzzlesSolvedTotal?: number
  puzzlesAttempted?: number
  activityStreak?: number
  initialStudents: any[],
  initialHomeworks?: any[],
  initialCourses?: any[],
  initialVideos?: any[],
  initialOpenings?: any[],
  initialPurchases?: any[],
}) {
  const { data: session } = useSession()
  const [ratingState, setRatingState] = useState(userRating)
  
  const isAdmin = initialRole === 'ADMIN'
  const isTeacher = initialRole === 'Учитель' || isAdmin
  const isGuest = initialRole === 'Гость'
  const isStudent = initialRole === 'Ученик' || isGuest

  const router = useRouter()
  const searchParams = useSearchParams()
  const sectionParam = searchParams.get('section') as Section | null
  const section = sectionParam || 'overview'

  const setSection = (s: Section) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('section', s)
    router.push(`?${params.toString()}`)
  }

  const [role] = useState(initialRole)
  const [mobile, setMobile] = useState(false)
  const [toast, setToast] = useState('')

  const [puzzleSubMode, setPuzzleSubMode] = useState<'normal' | 'rush' | 'missed'>('normal')

  const [students, setStudents] = useState<Student[]>(initialStudents || INIT_STUDENTS)
  const [homeworks, setHomeworks] = useState<HW[]>(initialHomeworks || INIT_HW)
  const [courses, setCourses] = useState<Course[]>(initialCourses || INIT_COURSES)
  const [videos, setVideos] = useState<Video[]>(initialVideos || INIT_VIDEOS)
  const [openings, setOpenings] = useState<Opening[]>(initialOpenings || INIT_OPENINGS)
  const [purchases, setPurchases] = useState<any[]>(initialPurchases)
  const [modules, setModules] = useState<Module[]>([])
  const [paymentModuleId, setPaymentModuleId] = useState<string | null>(null)
  
  const purchasedIds = useMemo(() => {
    return purchases.filter(p => p.status === 'APPROVED' || p.status === 'PAID').map(p => p.courseId)
  }, [purchases])
  
  const hasAccessToCourse = (c: Course) => {
    return purchasedIds.includes(c.id) || !!(c.isPremium && isPremium)
  }
  
  const [selectedStudentId, setSelectedStudentId] = useState<string | number | null>(null)
  const [selectedHwId, setSelectedHwId] = useState<string | number | null>(null)
  const [paymentCourseId, setPaymentCourseId] = useState<string | number | null>(null)
  const [paymentType, setPaymentType] = useState<'COURSE' | 'MODULE' | 'SUBSCRIPTION' | 'ANALYSIS'>('COURSE')
  const [paymentAnalysisPgn, setPaymentAnalysisPgn] = useState('')
  const [paymentStep, setPaymentStep] = useState<'info' | 'method' | 'sbp'>('info')
  const [paymentSender, setPaymentSender] = useState('')
  const [paymentComment, setPaymentComment] = useState('')
  const [viewingCourseId, setViewingCourseId] = useState<string | number | null>(null)
  
  const [liveSession, setLiveSession] = useState<any>(null)
  const [globalSettings, setGlobalSettings] = useState<{ subscriptionPrice: number, analysisPrice: number }>({ subscriptionPrice: 300, analysisPrice: 70 })

  const [notifications, setNotifications] = useState<any[]>([])
  const [showNotifications, setShowNotifications] = useState(false)
  const [yoomoneyConfigured, setYoomoneyConfigured] = useState<boolean | null>(null)

  const fetchNotifications = () => {
    fetch('/api/notifications').then(r => r.json()).then(data => {
      if (Array.isArray(data)) setNotifications(data)
    }).catch(() => {})
  }

  useEffect(() => {
    fetch('/api/settings').then(r => r.json()).then(data => {
      if (data && !data.error) setGlobalSettings(data)
    }).catch(() => {})

    if (isAdmin) {
      fetch('/api/settings/check').then(r => r.json()).then(data => {
        if (data && data.yoomoneySecretConfigured !== undefined) {
          setYoomoneyConfigured(data.yoomoneySecretConfigured)
        }
      }).catch(() => {})
    }

    fetchNotifications()
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        fetchNotifications()
      }
    }, 45000)

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchNotifications()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      clearInterval(interval)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [])

  const markAsRead = async () => {
    await fetch('/api/notifications/read', { method: 'POST' })
    fetchNotifications()
  }

  const refreshPurchases = () => {
    if (isStudent || role === 'Ученик') {
      fetch('/api/purchases').then(r => r.json()).then(data => {
        if (Array.isArray(data)) setPurchases(data)
      }).catch(() => {})
    }
  }

  const startLiveSession = async (studentId: string) => {
    try {
      const res = await fetch('/api/live', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentId })
      })
      if (res.ok) {
        const { session } = await res.json()
        setLiveSession(session)
        setSection('live')
      }
    } catch {}
  }

  useEffect(() => {
    fetch('/api/modules').then(r => r.json()).then(data => {
      if (Array.isArray(data)) setModules(data)
    }).catch(() => {})
    // Always refresh purchases from server to get latest status
    refreshPurchases()
    
    const fetchLive = () => {
      fetch(`/api/live?t=${Date.now()}`, { cache: 'no-store', credentials: 'include' }).then(r => r.json()).then(data => {
        setLiveSession(data.session)
      }).catch((e) => console.error('fetchLive error:', e))
    }
    fetchLive()
    
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        fetchLive()
      }
    }, 6000)

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchLive()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      clearInterval(interval)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [])

  useEffect(() => {
    if (searchParams.get('payment_success') === 'true') {
      notify('Оплата успешно завершена! Доступ скоро откроется (обновите страницу, если нужно).')
      
      const params = new URLSearchParams(searchParams.toString())
      params.delete('payment_success')
      router.replace(`?${params.toString()}`, { scroll: false })
      
      // Refresh server components (courses/purchases)
      router.refresh()
      
      // Give the webhook a few seconds to process, then fetch modules and purchases again
      setTimeout(() => {
        fetch('/api/modules').then(r => r.json()).then(data => {
          if (Array.isArray(data)) setModules(data)
        }).catch(() => {})
        refreshPurchases()
      }, 3000)
      // Try again after 8 seconds in case webhook is slow
      setTimeout(() => {
        refreshPurchases()
        fetch('/api/modules').then(r => r.json()).then(data => {
          if (Array.isArray(data)) setModules(data)
        }).catch(() => {})
      }, 8000)
    }
  }, [searchParams])

  const notify = (s: string) => { setToast(s); setTimeout(() => setToast(''), 2500) }
  const go = (s: Section) => { setSection(s); setMobile(false) }

  const teacherNav = [
    ['overview',       'Обзор',              LayoutDashboard],
    ['chat',           'Сообщения',          MessageSquare],
    ['live',           'Уроки',              Video],
    ['students',       'Мои ученики',        Users],
    ['homework',       'Домашние задания',   BookOpen],
    ['videos',         'Видео с YouTube',    Video],
    ['puzzles',        'Задачи',             Trophy],
    ['add_puzzle',     'Добавить задачу',    Upload],
    ['openings',       'Мои дебюты',         Library],
    ['openingTrainer', 'Тренажёр дебютов',   Play],
    ['modules',        'Мои курсы',          BookOpen],
    ['shop',           'Магазин модулей',    Store],
    ['store',          'Витрина дебютов',    Store],
    ['analysis',       'Разборы партий',     FileSearch],
    ['leaderboard',    'Рейтинг',            Trophy],
    ['users',          'Найти учеников',     Search],
    ['friends',        'Друзья',             Users],
    ['settings',       'Настройки',          Settings],
  ] as const

  const adminNav = [
    ['overview',       'Обзор',              LayoutDashboard],
    ['chat',           'Сообщения',          MessageSquare],
    ['live',           'Уроки',              Video],
    ['students',       'Мои ученики',        Users],
    ['homework',       'Домашние задания',   BookOpen],
    ['videos',         'Видео с YouTube',    Video],
    ['puzzles',        'Задачи',             Trophy],
    ['courses',        'Дебютные курсы',     GraduationCap],
    ['openings',       'Мои дебюты',         Library],
    ['modules',        'Учебные модули',     BookOpen],
    ['analysis',       'Разборы партий',     FileSearch],
    ['leaderboard',    'Рейтинг',            Trophy],
    ['sales',          'Продажи',            CircleDollarSign],
    ['store',          'Витрина дебютов',    Store],
    ['users',          'Пользователи',       ShieldCheck],
    ['friends',        'Друзья',             Users],
    ['settings',       'Настройки',          Settings],
  ] as const

  const studentNavBase = [
    ['overview',     'Мой обзор',          LayoutDashboard],
    ['chat',         'Сообщения',          MessageSquare],
    ['live',         'Уроки',              Video],
    ['findTeacher',  'Найти учителя',      UserPlus],
    ['friends',      'Друзья',             Users],
    ['modules',      'Мои курсы',          BookOpen],
    ['puzzles',      'Задачи',             Trophy],
    ['achievements', 'Достижения',         Award],
    ['shop',         'Магазин модулей',    Store],
    ['store',        'Витрина дебютов',    Store],
    ['leaderboard',  'Рейтинг',            Trophy],
    ['videos',       'Видео с YouTube',    Video],
    ['openings',     'Мои дебюты',         Library],
    ['settings',     'Настройки',          Settings],
  ] as const

  const guestNavBase = [
    ['modules',     'Модули',             BookOpen],
    ['leaderboard', 'Рейтинг',            Trophy],
    ['videos',      'Видео с YouTube',    Video],
    ['shop',        'Магазин модулей',    Store],
    ['store',       'Витрина дебютов',    Store],
    ['openings',    'Мои дебюты',         Library],
  ] as const

  const nav = isGuest ? guestNavBase : (isStudent ? studentNavBase : (isAdmin ? adminNav : teacherNav))

  const selectedStudent = students.find(s => s.id === selectedStudentId) ?? null
  const selectedHw = homeworks.find(h => h.id === selectedHwId) ?? null
  const viewingCourse = courses.find(c => c.id === viewingCourseId) ?? null

  const openStudentProfile = (id: string | number) => { setSelectedStudentId(id); go('studentProfile') }
  const openHwPuzzle       = (id: string | number) => { setSelectedHwId(id);      go('homeworkPuzzle') }
  const openCourseViewer   = (id: string | number) => { setViewingCourseId(id);   go('courseViewer') }

  const addHomework = async (hw: Omit<HW, 'id' | 'attempts' | 'solved'>) => {
    try {
      const res = await fetch('/api/homework', { method: 'POST', body: JSON.stringify(hw) })
      if (res.ok) {
        const newHw = await res.json()
        setHomeworks(prev => [...prev, newHw])
        notify('Домашнее задание назначено!')
      } else notify('Ошибка при назначении дз')
    } catch { notify('Ошибка сети') }
  }
  const updateHomework = async (id: number | string, patch: Partial<HW>) => {
    try {
      const res = await fetch(`/api/homework/${id}`, { method: 'PUT', body: JSON.stringify(patch) })
      if (res.ok) {
        const upHw = await res.json()
        setHomeworks(prev => prev.map(h => h.id === id ? upHw : h))
      }
    } catch { notify('Ошибка при обновлении дз') }
  }
  const deleteHomework = async (id: number | string) => {
    try {
      const res = await fetch(`/api/homework/${id}`, { method: 'DELETE' })
      if (res.ok) {
        setHomeworks(prev => prev.filter(h => h.id !== id))
        go('overview')
        notify('Домашнее задание удалено')
      } else notify('Ошибка при удалении дз')
    } catch { notify('Ошибка сети') }
  }
  const deleteStudent = async (id: string | number) => {
    try {
      const res = await fetch(`/api/students/${id}`, { method: 'DELETE' })
      if (res.ok) {
        setStudents(prev => prev.filter(s => s.id !== id))
        go('students')
        notify('Ученик удалён')
      } else notify('Ошибка при удалении ученика')
    } catch { notify('Ошибка сети') }
  }
  const addStudent = async (student: any) => {
    try {
      const res = await fetch('/api/students', { method: 'POST', body: JSON.stringify({ studentId: student.id }) })
      if (res.ok) {
        setStudents(prev => [...prev, student])
        notify('Ученик успешно добавлен!')
      } else notify('Ошибка при добавлении ученика')
    } catch { notify('Ошибка сети') }
  }
  const approvePurchase = async (purchaseId: string) => {
    try {
      const res = await fetch('/api/payments/approve', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ purchaseId }) })
      if (res.ok) {
        setPurchases(prev => prev.map(p => p.id === purchaseId ? { ...p, status: 'APPROVED' } : p))
        notify('Оплата подтверждена!')
      } else { notify('Ошибка сервера') }
    } catch { notify('Ошибка сети') }
  }

  const rejectPurchase = async (purchaseId: string) => {
    try {
      const res = await fetch('/api/payments/reject', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ purchaseId }) })
      if (res.ok) {
        setPurchases(prev => prev.map(p => p.id === purchaseId ? { ...p, status: 'REJECTED' } : p))
        notify('Оплата отклонена')
      } else { notify('Ошибка сервера') }
    } catch { notify('Ошибка сети') }
  }

  const deletePurchase = async (purchaseId: string) => {
    try {
      if (!confirm('Точно удалить этот заказ из базы? Выручка за него также спишется.')) return
      const res = await fetch(`/api/payments/${purchaseId}`, { method: 'DELETE' })
      if (res.ok) {
        setPurchases(prev => prev.filter(p => p.id !== purchaseId))
        notify('Заказ удалён')
      } else { notify('Ошибка сервера') }
    } catch { notify('Ошибка сети') }
  }

  const purchaseCourse = (id: string | number) => {
    if (isGuest) {
      notify('Пожалуйста, зарегистрируйтесь, чтобы совершать покупки.')
      return
    }
    const alreadyPending = purchases.some(p => p.courseId === id && p.status === 'PENDING' && p.paymentMethod !== 'yoomoney')
    if (alreadyPending) {
      notify('У вас уже есть заявка на этот курс. Ожидайте подтверждения.')
      return
    }
    setPaymentType('COURSE')
    setPaymentStep('method')
    setPaymentSender('')
    setPaymentComment('')
    setPaymentCourseId(id)
  }

  const purchaseSubscription = () => {
    if (isGuest) {
      notify('Пожалуйста, зарегистрируйтесь, чтобы купить подписку.')
      return
    }
    setPaymentType('SUBSCRIPTION')
    setPaymentStep('method')
    setPaymentSender('')
    setPaymentComment('')
    setPaymentCourseId('subscription')
  }

  const purchaseAnalysis = (pgn: string, comment: string) => {
    if (isGuest) {
      notify('Пожалуйста, зарегистрируйтесь, чтобы заказать разбор.')
      return
    }
    setPaymentType('ANALYSIS')
    setPaymentStep('method')
    setPaymentSender('')
    setPaymentComment(comment)
    setPaymentAnalysisPgn(pgn)
    setPaymentCourseId('analysis')
  }

  const handleManualPayment = async () => {
    if (!paymentCourseId) return
    try {
      const res = await fetch('/api/payments/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ courseId: paymentCourseId, senderName: paymentSender, comment: paymentComment })
      })
      if (res.ok) {
        const { purchase } = await res.json()
        setPurchases(prev => [purchase, ...prev])
        notify('Заявка на оплату отправлена! Как только мы её проверим, курс появится в вашем кабинете.')
      } else {
        notify('Произошла ошибка или заявка уже существует.')
      }
    } catch {
      notify('Ошибка сети.')
    }
    setPaymentCourseId(null)
  }


  const sectionLabel = (() => {
    if (section === 'studentProfile' && selectedStudent) return selectedStudent.name
    if (section === 'homeworkPuzzle' && selectedHw)      return selectedHw.title
    if (section === 'courseViewer' && viewingCourse)      return viewingCourse.name
    return [...teacherNav, ...studentNavBase].find(n => n[0] === section)?.[1] ?? 'Обзор'
  })()

  return (
    <div className="flex h-dvh overflow-hidden bg-background">
      {/* Sidebar */}
      <aside className={`${mobile ? 'fixed inset-0 z-40 flex' : 'hidden'} w-full flex-col border-r bg-background md:static md:flex md:w-64 md:shrink-0`}>
        <div className="flex h-16 items-center justify-between border-b px-5">
          <button onClick={() => go('overview')} className="flex items-center gap-3">
            <span className="flex size-8 items-center justify-center rounded-md bg-primary font-mono text-sm text-primary-foreground">64</span>
            <span className="text-left">
              <b className="block text-sm">64 Lines</b>
              <small className="text-muted-foreground">{isAdmin ? 'Администратор' : isStudent ? 'Кабинет ученика' : 'Кабинет тренера'}</small>
            </span>
          </button>
          <button className="icon-button md:hidden" onClick={() => setMobile(false)}><X /></button>
        </div>
        <nav className="flex flex-1 flex-col gap-1 overflow-y-auto p-3">
          {nav.map(([id, label, Icon]) => (
            <button key={id} onClick={() => go(id as Section)}
              className={`nav-item ${(section === id || (section === 'studentProfile' && id === 'students') || (section === 'homeworkPuzzle' && id === (isStudent ? 'overview' : 'homework'))) ? 'nav-item-active' : ''}`}>
              <Icon className="size-4 shrink-0" /><span>{label}</span>
            </button>
          ))}
        </nav>
        <div className="border-t p-4 flex flex-col gap-2">
          <div>
            <p className="text-sm font-medium">{userName || 'Пользователь'}</p>
            <p className="text-xs text-muted-foreground">{isAdmin ? 'Администратор' : isStudent ? 'Ученик' : 'Тренер'}</p>
          </div>
          <button 
            onClick={() => signOut()}
            className="text-xs text-red-500 hover:text-red-700 text-left font-medium"
          >
            Выйти
          </button>
        </div>
      </aside>

      {/* Content */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 shrink-0 items-center gap-3 border-b px-4 md:px-6">
          <button className="icon-button md:hidden" onClick={() => setMobile(true)}><Menu /></button>
          {(section === 'studentProfile' || section === 'homeworkPuzzle' || section === 'courseViewer') && (
            <button className="icon-button" onClick={() => go(section === 'studentProfile' ? 'students' : section === 'courseViewer' ? 'modules' : (isStudent ? 'overview' : 'homework'))}><ArrowLeft /></button>
          )}
          <b className="truncate text-sm">{sectionLabel}</b>
          <div className="ml-auto flex items-center gap-2">
            <div className="flex items-center gap-1 bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-500 px-2 py-1 rounded-md text-sm font-bold border border-amber-200 dark:border-amber-800/50 shadow-sm mr-2" title="Ваш рейтинг (Эло)">
              <Trophy className="size-4" />
              {ratingState}
            </div>
            {isPremium && (
              <span className="flex items-center gap-1 text-xs font-semibold text-yellow-600 bg-yellow-500/20 px-2 py-1 rounded-md border border-yellow-500/50">
                <Crown className="size-3" /> Premium
              </span>
            )}
            <span className="text-xs text-muted-foreground px-2 py-1 bg-muted rounded-md">{role}</span>
            {isGuest && (
              <Link href="/login" className="button ml-2 py-1 px-3 text-xs">
                Войти / Регистрация
              </Link>
            )}
          </div>
          <div className="relative">
            <button className="icon-button relative" onClick={() => { setShowNotifications(!showNotifications); markAsRead(); }}>
              <Bell />
              {notifications.filter(n => !n.isRead).length > 0 && (
                <span className="absolute top-1 right-1 flex size-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full size-3 bg-red-500"></span>
                </span>
              )}
            </button>
            {showNotifications && (
              <div className="absolute right-0 mt-2 w-80 bg-background border rounded-xl shadow-xl z-50 overflow-hidden text-left">
                <div className="p-3 border-b bg-muted/30 font-semibold flex justify-between items-center">
                  Уведомления
                </div>
                <div className="max-h-[60vh] overflow-y-auto">
                  {notifications.length === 0 ? (
                    <p className="p-4 text-center text-sm text-muted-foreground">Нет уведомлений</p>
                  ) : (
                    notifications.map(n => (
                      <div key={n.id} className={`p-4 border-b last:border-0 hover:bg-muted/50 cursor-pointer ${!n.isRead ? 'bg-primary/5' : ''}`} onClick={() => { if (n.link) router.push(n.link); setShowNotifications(false) }}>
                        <p className="font-semibold text-sm mb-1">{n.title}</p>
                        <p className="text-sm text-muted-foreground">{n.message}</p>
                        <p className="text-[10px] text-muted-foreground mt-2">{new Date(n.createdAt).toLocaleString('ru-RU')}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </header>

        {liveSession && section !== 'live' && (
          <div className="bg-red-500 text-white p-4 m-4 rounded-xl flex items-center justify-between shadow-xl animate-pulse cursor-pointer" onClick={() => go('live')}>
            <div className="flex items-center gap-3 font-bold text-lg">
              <Video className="size-6" />
              ВХОДЯЩИЙ ЗВОНОК ОТ ПРЕПОДАВАТЕЛЯ! НАЖМИТЕ ЧТОБЫ ОТВЕТИТЬ!
            </div>
            <button className="bg-white text-red-600 px-6 py-2 rounded-lg font-bold">ОТВЕТИТЬ</button>
          </div>
        )}

        {liveSession && section !== 'live' && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
            <div className="bg-card text-card-foreground border shadow-2xl rounded-2xl p-8 max-w-sm w-full text-center flex flex-col items-center gap-6 animate-in zoom-in-95 fade-in duration-200">
              <div className="size-24 rounded-full bg-primary/10 flex items-center justify-center relative">
                <div className="absolute inset-0 rounded-full border-4 border-primary/20 animate-ping" />
                <Video className="size-10 text-primary animate-pulse" />
              </div>
              
              <div>
                <h2 className="text-2xl font-bold tracking-tight mb-2">Входящий звонок!</h2>
                <p className="text-muted-foreground">Учитель приглашает вас на интерактивный урок.</p>
              </div>

              <div className="flex gap-4 w-full mt-2">
                <button onClick={() => go('live')} className="flex-1 bg-green-600 hover:bg-green-700 text-white rounded-xl py-3 font-semibold transition-colors flex items-center justify-center gap-2 shadow-sm">
                  <Phone className="size-5" />
                  Ответить
                </button>
              </div>
            </div>
          </div>
        )}

        <main className="min-w-0 flex-1 overflow-y-auto">
          <div className="mx-auto flex max-w-[1440px] flex-col gap-6 p-4 md:p-7">
            {section === 'overview' && (isStudent
              ? <StudentOverview 
                  userName={userName} 
                  userRating={ratingState} 
                  userRank={userRank}
                  homeworks={homeworks} 
                  onOpenHw={openHwPuzzle} 
                  notify={notify}
                  onGoSection={go}
                  puzzlesSolvedTotal={puzzlesSolvedTotal}
                  puzzlesAttempted={puzzlesAttempted}
                  activityStreak={activityStreak}
                />
              : <TeacherOverview
                  userName={userName}
                  go={go}
                  homeworks={homeworks}
                  students={students}
                  videosCount={videos.length}
                  onOpenHw={openHwPuzzle}
                  onSelectStudent={openStudentProfile}
                  notify={notify}
                  userRating={ratingState}
                  puzzlesSolvedTotal={puzzlesSolvedTotal ?? 0}
                  puzzlesAttempted={puzzlesAttempted ?? 0}
                  activityStreak={activityStreak ?? 0}
                />
            )}
            {section === 'findTeacher' && isStudent && <StudentTeacherPanel notify={notify} />}
            {section === 'students' && <Students students={students} homeworks={homeworks} onSelect={openStudentProfile} onAddStudent={addStudent} notify={notify} />}
            {section === 'studentProfile' && selectedStudent && (
              <StudentProfile student={selectedStudent} homeworks={homeworks.filter(h => h.studentId === selectedStudent.id)} onOpenHw={openHwPuzzle} onAddHw={addHomework} onDeleteStudent={deleteStudent} notify={notify} />
            )}
            {section === 'homework' && (
              <HomeworkList homeworks={homeworks} students={students} isStudent={isStudent} onOpenHw={openHwPuzzle} />
            )}
            {section === 'homeworkPuzzle' && selectedHw && (
              <HomeworkPuzzle hw={selectedHw} isStudent={isStudent}
                onProgress={(id, progress, solved, attempts) => {
                  updateHomework(id, { progress, solved, attempts, ...(solved ? { status: 'Выполнено' } : {}) })
                  if (solved) {
                    const pts = attempts <= 1 ? 15 : attempts === 2 ? 10 : 5
                    notify(`Задание выполнено! +${pts} к рейтингу 🎉 (попыток: ${attempts})`)
                  }
                }}
                onUpdate={!isStudent ? updateHomework : undefined}
                onDelete={!isStudent ? deleteHomework : undefined}
                notify={notify} />
            )}
            {section === 'videos'      && <VideosSection videos={videos} setVideos={setVideos} teacher={isAdmin} notify={notify} isUserPremium={isPremium} onPremiumClick={purchaseSubscription} />}
            {section === 'achievements' && <AchievementsTab />}
            {section === 'puzzles'     && (
              <>
                <Head over="Тренировка" title="Тактические задачи" text="Решайте шахматные задачи для повышения своего рейтинга" />
                
                {/* Mode Selector */}
                <div className="flex gap-1.5 mt-6 bg-muted/40 border p-1 rounded-xl w-fit">
                  <button
                    onClick={() => setPuzzleSubMode('normal')}
                    className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition ${
                      puzzleSubMode === 'normal'
                        ? 'bg-card text-foreground shadow-xs border border-border/40'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    Обычные задачи
                  </button>
                  <button
                    onClick={() => setPuzzleSubMode('rush')}
                    className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition ${
                      puzzleSubMode === 'rush'
                        ? 'bg-card text-foreground shadow-xs border border-border/40'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    Puzzle Rush (Молния)
                  </button>
                  <button
                    onClick={() => setPuzzleSubMode('missed')}
                    className={`px-4 py-2 text-sm font-semibold rounded-full transition ${
                      puzzleSubMode === 'missed'
                        ? 'bg-primary text-primary-foreground shadow-sm'
                        : 'hover:bg-muted text-muted-foreground'
                    }`}
                  >
                    Мои ошибки
                  </button>
                </div>

                <div className="mt-6">
                  {puzzleSubMode === 'normal' ? (
                    <Puzzles isPremium={isPremium} onPremiumClick={purchaseSubscription} onRatingChange={setRatingState} />
                  ) : puzzleSubMode === 'rush' ? (
                    <PuzzleRush />
                  ) : (
                    <Puzzles isPremium={isPremium} onPremiumClick={purchaseSubscription} onRatingChange={setRatingState} apiEndpoint="/api/puzzles/missed" title="Мои ошибки" />
                  )}
                </div>
              </>
            )}
            {section === 'add_puzzle'  && (
              <AdminPuzzles onBack={() => setSection('puzzles')} />
            )}
            {section === 'openings'    && (
              <div className="space-y-6">
                <div className="flex gap-2 mb-4 border-b pb-4">
                  <button onClick={() => setPuzzleSubMode('normal')} className={`px-4 py-2 text-sm font-semibold rounded-full transition ${puzzleSubMode === 'normal' ? 'bg-primary text-primary-foreground shadow-sm' : 'hover:bg-muted text-muted-foreground'}`}>Управление базами</button>
                  <button onClick={() => setPuzzleSubMode('rush')} className={`px-4 py-2 text-sm font-semibold rounded-full transition ${puzzleSubMode === 'rush' ? 'bg-primary text-primary-foreground shadow-sm' : 'hover:bg-muted text-muted-foreground'}`}>Тренажёр</button>
                </div>
                {puzzleSubMode === 'normal' ? (
                  <PgnBoard openings={openings} setOpenings={setOpenings} isTeacher={!isStudent} notify={notify} />
                ) : (
                  <OpeningTrainer />
                )}
              </div>
            )}
            {section === 'chat'        && <ChatComponent userId={!isGuest && session?.user ? session.user.id : ''} isTeacher={isTeacher} onStartCall={isTeacher ? startLiveSession : undefined} />}
            {section === 'live' && (
              liveSession ? (
                <LiveLessonBoard 
                  sessionId={liveSession.id} 
                  jitsiRoomName={liveSession.jitsiRoomName}
                  userId={!isGuest && session?.user ? session.user.id : ''}
                  userName={session?.user?.name || 'User'}
                  isTeacher={isTeacher}
                  onClose={() => { setLiveSession(null); go('overview') }}
                />
              ) : (
                <div className="flex flex-col items-center justify-center min-h-[50vh] text-center p-8 bg-background border rounded-xl shadow-sm">
                  <div className="size-16 rounded-full bg-primary/10 text-primary flex items-center justify-center mb-6">
                    <Video className="size-8" />
                  </div>
                  <h2 className="text-2xl font-bold mb-2">Интерактивные уроки</h2>
                  {isTeacher ? (
                    <>
                      <p className="text-muted-foreground mb-8 max-w-md">
                        Выберите ученика из списка ниже, чтобы начать онлайн-занятие с видеосвязью и синхронизированной шахматной доской.
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 w-full max-w-4xl text-left">
                        {students.length === 0 ? (
                          <p className="text-sm text-muted-foreground col-span-full text-center">У вас пока нет учеников.</p>
                        ) : students.map(student => (
                          <div key={student.id} className="border rounded-lg p-4 flex flex-col gap-3 hover:border-primary/50 transition-colors bg-muted/20">
                            <div className="flex items-center gap-3">
                              <div className="size-10 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
                                <span className="font-bold">{initials(student.name)}</span>
                              </div>
                              <div className="flex-1 overflow-hidden">
                                <h3 className="font-semibold truncate">{student.name}</h3>
                                <p className="text-xs text-muted-foreground">Рейтинг: {student.rating}</p>
                              </div>
                            </div>
                            <button onClick={() => startLiveSession(student.id as string)} className="button w-full justify-center">
                              <Video className="size-4 mr-2" /> Позвонить
                            </button>
                          </div>
                        ))}
                      </div>
                    </>
                  ) : (
                    <p className="text-muted-foreground mb-8 max-w-md">
                      Ожидайте, пока ваш преподаватель начнет урок. У вас появится уведомление о звонке.
                    </p>
                  )}
                </div>
              )
            )}
            {section === 'modules'     && (
              isAdmin
                ? <ModulesEditor modules={modules} setModules={setModules} students={students} notify={notify} />
                : <ModulesView modules={modules} setModules={setModules} onPurchase={purchaseCourse} isGuest={isGuest} notify={notify} purchases={purchases} courses={courses} onPurchaseCourse={purchaseCourse} onOpenCourse={openCourseViewer} />
            )}
            {section === 'shop'        && <ShopSection modules={modules} courses={courses} purchases={purchases} purchasedIds={purchasedIds} isGuest={isGuest} notify={notify} onPurchaseCourse={purchaseCourse} onPurchaseModule={(id) => { setPaymentStep('method'); setPaymentSender(''); setPaymentComment(''); setPaymentModuleId(id) }} onOpenCourse={openCourseViewer} onOpenModule={() => notify('Открытие модуля (в разработке)')} />}
            {section === 'friends' && (
              <FriendsTab notify={notify} userId={session?.user?.id as string} />
            )}
            {section === 'leaderboard' && <Leaderboard />}
            {section === 'users'       && isAdmin && <UsersManager notify={notify} />}
            {section === 'users'       && isTeacher && !isAdmin && <AvailableStudents notify={notify} />}
            {section === 'courseViewer' && viewingCourse && <CourseViewer course={viewingCourse} />}
            {section === 'sales'       && isAdmin && <Sales purchases={purchases} onApprove={approvePurchase} onReject={rejectPurchase} onDelete={deletePurchase} yoomoneyConfigured={yoomoneyConfigured} />}
            {section === 'store'       && <Storefront courses={courses} purchasedIds={courses.filter(hasAccessToCourse).map(c => c.id as number)} onPurchase={purchaseCourse} onOpen={openCourseViewer} />}
            {section === 'courses'  && (
              <OpeningCourses courses={courses} isTeacher={isAdmin} purchasedIds={courses.filter(hasAccessToCourse).map(c => c.id as number)}
                onPurchase={purchaseCourse} onOpen={openCourseViewer}
                onAdd={async c => {
                  try {
                    const res = await fetch('/api/courses', { method: 'POST', body: JSON.stringify(c) })
                    if (res.ok) {
                      const nc = await res.json()
                      setCourses(prev => [nc, ...prev])
                      notify('Курс добавлен')
                    } else notify('Ошибка при добавлении')
                  } catch { notify('Ошибка сети') }
                }}
                onUpdate={async (id, u) => {
                  try {
                    const res = await fetch(`/api/courses/${id}`, { method: 'PUT', body: JSON.stringify(u) })
                    if (res.ok) {
                      const uc = await res.json()
                      setCourses(prev => prev.map(c => c.id === id ? uc : c))
                      notify('Курс обновлён')
                    } else notify('Ошибка при обновлении')
                  } catch { notify('Ошибка сети') }
                }}
                onDelete={async id => {
                  if (!confirm('Удалить курс?')) return
                  try {
                    const res = await fetch(`/api/courses/${id}`, { method: 'DELETE' })
                    if (res.ok) {
                      setCourses(prev => prev.filter(c => c.id !== id))
                      notify('Курс удалён')
                    } else notify('Ошибка при удалении')
                  } catch { notify('Ошибка сети') }
                }}
                notify={notify} />
            )}
            {section === 'analysis' && <AnalysisRequests notify={notify} />}
            {section === 'settings' && <SettingsPanel notify={notify} initialName={userName || ''} isStudent={isStudent} isAdmin={isAdmin} globalSettings={globalSettings} onPurchaseSubscription={purchaseSubscription} onPurchaseAnalysis={purchaseAnalysis} />}
          </div>
        </main>
      </div>

      {paymentCourseId && (() => {
        const isSub = paymentCourseId === 'subscription'
        const isAnalysis = paymentCourseId === 'analysis'
        const course = !isSub && !isAnalysis ? courses.find(c => c.id === paymentCourseId) : null
        
        if (!course && !isSub && !isAnalysis) return null
        
        const price = isSub ? globalSettings.subscriptionPrice : (isAnalysis ? globalSettings.analysisPrice : (course?.price || 0))
        const title = isSub ? 'Оплата подписки (Premium)' : (isAnalysis ? 'Оплата разбора партии' : 'Оплата курса')
        const isYooMoneyOnly = false

        return (
          <Modal title={title} close={() => setPaymentCourseId(null)}>
            {paymentStep === 'method' && (
              <div className="flex flex-col gap-4">
                <p className="text-sm text-center">Сумма к оплате: <b>{price.toLocaleString('ru-RU')} ₽</b></p>
                
                <button className="button w-full flex-col py-3 h-auto" onClick={async () => {
                  try {
                    const res = await fetch('/api/payments/create', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ 
                        courseId: (!isSub && !isAnalysis) ? paymentCourseId : undefined,
                        type: paymentType,
                        pgn: paymentAnalysisPgn,
                        senderName: '', 
                        comment: paymentComment, 
                        paymentMethod: 'yoomoney' 
                      })
                    })
                    if (res.ok) {
                      const { purchase } = await res.json()
                      const form = document.createElement('form')
                      form.method = 'POST'
                      form.action = 'https://yoomoney.ru/quickpay/confirm.xml'
                      const fields: any = { receiver: '4100119573095433', label: purchase.id, 'quickpay-form': 'button', sum: (price * 1.03).toFixed(2), paymentType: 'AC', successURL: window.location.origin + '?section=' + (isSub || isAnalysis ? 'settings' : 'store') + '&payment_success=true' }
                      for (const k in fields) {
                        const input = document.createElement('input')
                        input.type = 'hidden'
                        input.name = k
                        input.value = fields[k]
                        form.appendChild(input)
                      }
                      document.body.appendChild(form)
                      form.submit()
                    } else notify('Ошибка создания заявки.')
                  } catch { notify('Ошибка сети.') }
                }}>
                  <span className="font-bold">ЮMoney (Автоматически)</span>
                  <span className="text-xs opacity-80 font-normal mt-1">Оплата картой. Комиссия сервиса 3% ({(price * 1.03).toLocaleString('ru-RU')} ₽). Доступ откроется сразу.</span>
                </button>

                {!isYooMoneyOnly && (
                  <button className="outline-button w-full flex-col py-3 h-auto" onClick={() => setPaymentStep('info')}>
                    <span className="font-bold text-foreground">СБП / Перевод (Ручная проверка)</span>
                    <span className="text-xs text-muted-foreground font-normal mt-1">Без комиссии ({price.toLocaleString('ru-RU')} ₽). Потребуется ввести ваше имя и нажать кнопку.</span>
                  </button>
                )}
              </div>
            )}
            
            {!isYooMoneyOnly && paymentStep === 'info' && (
              <div className="flex flex-col gap-4">
                <p className="text-sm text-muted-foreground">Перед оплатой заполните информацию.</p>
                <label className="field">Ваше имя
                  <input className="input" value={paymentSender} onChange={e => setPaymentSender(e.target.value)} placeholder="Иван Иванов" />
                </label>
                <label className="field">Комментарий
                  <textarea className="textarea text-sm" value={paymentComment} onChange={e => setPaymentComment(e.target.value)} placeholder="Опционально" />
                </label>
                <div className="flex flex-col gap-3 mt-2">
                  <button className="button w-full" disabled={!paymentSender.trim()} onClick={() => setPaymentStep('sbp')}>
                    Далее — реквизиты
                  </button>
                  <button className="outline-button w-full" onClick={() => setPaymentStep('method')}>
                    Назад
                  </button>
                </div>
              </div>
            )}
            
            {!isYooMoneyOnly && paymentStep === 'sbp' && (
              <div className="flex flex-col gap-4 text-center">
                <div className="rounded-xl bg-muted/30 p-6">
                  <p className="text-muted-foreground">Переведите по номеру телефона (СБП):</p>
                  <b className="mt-2 block text-2xl tracking-widest">+7 (999) 813-78-70</b>
                  <p className="mt-1 text-sm text-muted-foreground">Банк: Альфа-Банк / Получатель: Кирилл П.</p>
                </div>
                <p className="text-sm">Сумма к оплате: <b>{price.toLocaleString('ru-RU')} ₽</b></p>
                <div className="mt-2 flex flex-col gap-3">
                  <button className="button w-full" onClick={handleManualPayment}>
                    Я перевел(а) деньги
                  </button>
                  <button className="outline-button w-full" onClick={() => setPaymentStep('info')}>
                    <ArrowLeft className="size-4" />Назад
                  </button>
                </div>
              </div>
            )}
          </Modal>
        )
      })()}

      {paymentModuleId && (() => {
        const mod = modules.find(m => m.id === paymentModuleId)
        if (!mod) return null
        return (
          <Modal title="Оплата модуля" close={() => setPaymentModuleId(null)}>
            {paymentStep === 'method' && (
              <div className="flex flex-col gap-4">
                <p className="text-sm text-center">Сумма к оплате: <b>{mod.price.toLocaleString('ru-RU')} ₽</b></p>
                
                <button className="button w-full flex-col py-3 h-auto" onClick={async () => {
                  try {
                    const res = await fetch('/api/payments/create', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ moduleId: paymentModuleId, senderName: '', comment: '', paymentMethod: 'yoomoney' })
                    })
                    if (res.ok) {
                      const { purchase } = await res.json()
                      const form = document.createElement('form')
                      form.method = 'POST'
                      form.action = 'https://yoomoney.ru/quickpay/confirm.xml'
                      const fields: any = { receiver: '4100119573095433', label: purchase.id, 'quickpay-form': 'button', sum: (mod.price * 1.03).toFixed(2), paymentType: 'AC', successURL: window.location.origin + '?section=modules&payment_success=true' }
                      for (const k in fields) {
                        const input = document.createElement('input')
                        input.type = 'hidden'
                        input.name = k
                        input.value = fields[k]
                        form.appendChild(input)
                      }
                      document.body.appendChild(form)
                      form.submit()
                    } else notify('Ошибка создания заявки.')
                  } catch { notify('Ошибка сети.') }
                }}>
                  <span className="font-bold">ЮMoney (Автоматически)</span>
                  <span className="text-xs opacity-80 font-normal mt-1">Оплата картой. Комиссия сервиса 3% ({(mod.price * 1.03).toLocaleString('ru-RU')} ₽). Доступ откроется сразу.</span>
                </button>

                <button className="outline-button w-full flex-col py-3 h-auto" onClick={() => setPaymentStep('info')}>
                  <span className="font-bold text-foreground">СБП / Перевод (Ручная проверка)</span>
                  <span className="text-xs text-muted-foreground font-normal mt-1">Без комиссии ({mod.price.toLocaleString('ru-RU')} ₽). Потребуется ввести ваше имя и нажать кнопку.</span>
                </button>
              </div>
            )}
            {paymentStep === 'info' && (
              <div className="flex flex-col gap-4">
                <p className="text-sm text-muted-foreground">Перед оплатой заполните информацию.</p>
                <label className="field">Ваше имя
                  <input className="input" value={paymentSender} onChange={e => setPaymentSender(e.target.value)} placeholder="Иван Иванов" />
                </label>
                <label className="field">Комментарий
                  <textarea className="textarea text-sm" value={paymentComment} onChange={e => setPaymentComment(e.target.value)} placeholder="Опционально" />
                </label>
                <div className="flex flex-col gap-3 mt-2">
                  <button className="button w-full" disabled={!paymentSender.trim()} onClick={() => setPaymentStep('sbp')}>
                    Далее — реквизиты
                  </button>
                  <button className="outline-button w-full" onClick={() => setPaymentStep('method')}>
                    Назад
                  </button>
                </div>
              </div>
            )}
            {paymentStep === 'sbp' && (
              <div className="flex flex-col gap-4 text-center">
                <div className="rounded-xl bg-muted/30 p-6">
                  <p className="text-muted-foreground">Переведите по номеру телефона (СБП):</p>
                  <b className="mt-2 block text-2xl tracking-widest">+7 (999) 813-78-70</b>
                  <p className="mt-1 text-sm text-muted-foreground">Банк: Альфа-Банк / Получатель: Кирилл П.</p>
                </div>
                <p className="text-sm">Сумма к оплате: <b>{mod.price.toLocaleString('ru-RU')} ₽</b></p>
                <div className="mt-2 flex flex-col gap-3">
                  <button className="button w-full" onClick={async () => {
                    try {
                      const res = await fetch('/api/payments/create', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ moduleId: paymentModuleId, senderName: paymentSender, comment: paymentComment })
                      })
                      if (res.ok) {
                        const { purchase } = await res.json()
                        setPurchases(prev => [purchase, ...prev])
                        notify('Заявка отправлена! Как только проверим перевод, модуль появится в вашем кабинете.')
                      } else {
                        notify('Произошла ошибка или заявка уже существует.')
                      }
                    } catch { notify('Ошибка сети.') }
                    setPaymentModuleId(null)
                  }}>
                    Я перевел(а) деньги
                  </button>
                  <button className="outline-button w-full" onClick={() => setPaymentStep('info')}>
                    <ArrowLeft className="size-4" />Назад
                  </button>
                </div>
              </div>
            )}
          </Modal>
        )
      })()}

      {toast && (
        <div className="fixed bottom-4 right-4 z-50 rounded-lg border bg-background p-4 shadow-xl">
          <p className="text-sm font-medium">{toast}</p>
        </div>
      )}
    </div>
  )
}


// ─── Overview sections ────────────────────────────────────────────────────────

/**
 * PersonalStatsSection — the four metric cards, activity calendar, and quick-launch
 * buttons shared by both StudentOverview and TeacherOverview. Accepts only raw numbers
 * so neither overview needs to know how to compute them.
 */
function PersonalStatsSection({
  userRating = 1200,
  puzzlesSolvedTotal = 0,
  puzzlesAttempted = 0,
  activityStreak = 0,
  onGoSection,
}: {
  userRating?: number
  puzzlesSolvedTotal?: number
  puzzlesAttempted?: number
  activityStreak?: number
  onGoSection?: (s: string) => void
}) {
  const accuracy = puzzlesAttempted > 0
    ? Math.round((puzzlesSolvedTotal / puzzlesAttempted) * 100)
    : 0

  return (
    <>
      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Metric
          label="Рейтинг"
          value={String(userRating)}
          note="Текущий Эло"
          icon={<Trophy className="w-5 h-5" />}
          accentClass="text-yellow-500"
        />
        <Metric
          label="Решено"
          value={String(puzzlesSolvedTotal)}
          note="задач"
          icon={<CheckCircle2 className="w-5 h-5" />}
          accentClass="text-emerald-500"
        />
        <Metric
          label="Серия занятий"
          value={pluralDays(activityStreak)}
          note="Активность"
          icon={<Award className="w-5 h-5" />}
          accentClass="text-orange-500"
        />
        <Metric
          label="Точность"
          value={`${accuracy}%`}
          note={`${puzzlesSolvedTotal} задач`}
          icon={<Zap className="w-5 h-5" />}
          accentClass="text-blue-500"
        />
      </section>
      <div className="my-2">
        <ActivityCalendar />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <button
          onClick={() => onGoSection?.('puzzles')}
          className="flex items-center gap-4 bg-card border rounded-xl p-4 text-left hover:border-primary/40 hover:shadow-sm transition group"
        >
          <div className="w-10 h-10 rounded-xl bg-yellow-500/10 flex items-center justify-center shrink-0">
            <Trophy className="w-5 h-5 text-yellow-500 group-hover:scale-110 transition-transform" />
          </div>
          <div>
            <p className="font-semibold text-sm text-foreground">Задачи (Puzzles)</p>
            <p className="text-xs text-muted-foreground mt-0.5">Ежедневная тренировка тактики и расчёта</p>
          </div>
        </button>
        <button
          onClick={() => onGoSection?.('achievements')}
          className="flex items-center gap-4 bg-card border rounded-xl p-4 text-left hover:border-primary/40 hover:shadow-sm transition group"
        >
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <Award className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="font-semibold text-sm text-foreground">Мои достижения</p>
            <p className="text-xs text-muted-foreground mt-0.5">Следи за прогрессом и открывай бейджи</p>
          </div>
        </button>
      </div>
    </>
  )
}


function TeacherOverview({
  userName, go, homeworks, students, videosCount, onOpenHw, onSelectStudent, notify,
  userRating = 1200, puzzlesSolvedTotal = 0, puzzlesAttempted = 0, activityStreak = 0
}: {
  userName: string
  go: (s: Section) => void
  homeworks: HW[]
  students: Student[]
  videosCount: number
  onOpenHw: (id: string | number) => void
  onSelectStudent: (id: string | number) => void
  notify: (s: string) => void
  userRating?: number
  puzzlesSolvedTotal?: number
  puzzlesAttempted?: number
  activityStreak?: number
}) {
  const recent = homeworks.slice(0, 3)

  const handleInvite = async () => {
    try {
      const res = await fetch('/api/invite', { method: 'POST', body: JSON.stringify({ role: 'STUDENT' }) })
      const data = await res.json()
      if (res.ok) {
        navigator.clipboard.writeText(data.url)
        notify('Ссылка-приглашение скопирована в буфер обмена!')
      } else {
        notify('Ошибка: ' + data.error)
      }
    } catch (e) {
      notify('Ошибка при создании приглашения')
    }
  }

  return (
    <>
      <Head over="Рабочее пространство" title={`Добрый день, ${userName}`} text="Ученики, задания и авторские материалы 64 Lines."
        action={<button className="button" onClick={() => go('homework')}><Plus />Создать задание</button>} />

      {/* ── Personal stats (identical logic to StudentOverview but no HW block) ── */}
      <PersonalStatsSection
        userRating={userRating}
        puzzlesSolvedTotal={puzzlesSolvedTotal}
        puzzlesAttempted={puzzlesAttempted}
        activityStreak={activityStreak}
        onGoSection={go}
      />

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Metric label="Активные ученики" value={String(students.length)}  note="всего" />
        <Metric label="Активных заданий" value={String(homeworks.filter(h => !h.solved).length)} note="не завершено" />
        <Metric label="Видеоуроков"      value={String(videosCount)}  note="в библиотеке" />
        <Metric label="Выполнено"        value={String(homeworks.filter(h => h.solved).length)} note="всего" />
      </section>

      <section className="rounded-lg border">
        <div className="flex items-center justify-between border-b p-5">
          <div><h2 className="font-semibold">Ученики</h2><p className="mt-1 text-sm text-muted-foreground">Управление учениками</p></div>
          <div className="flex gap-2">
            <button className="outline-button text-xs" onClick={handleInvite}><UserPlus className="size-4 mr-1"/>Пригласить по ссылке</button>
            <button className="text-button text-xs" onClick={() => go('students')}>Все<ChevronRight className="size-4 ml-1"/></button>
          </div>
        </div>
        <div className="flex flex-col">
          {students.slice(0, 5).map(s => {
            const sHws = homeworks.filter(h => h.studentId === s.id)
            const done = sHws.filter(h => h.solved).length
            const pct  = sHws.length > 0 ? Math.round(done / sHws.length * 100) : 0
            return (
              <button key={s.id} onClick={() => onSelectStudent(s.id)}
                className="flex w-full items-center gap-4 border-b p-4 text-left last:border-0 transition-colors hover:bg-muted/30">
                <span className="flex size-8 items-center justify-center rounded-full bg-muted text-xs font-semibold">{initials(s.name)}</span>
                <span className="flex-1">
                  <b className="text-sm">{s.name}</b>
                  <small className="block text-muted-foreground">Рейтинг {s.rating} · {done}/{sHws.length} заданий</small>
                </span>
                <span className="w-24"><ProgressBar value={pct} /></span>
              </button>
            )
          })}
          {students.length === 0 && <div className="p-4 text-sm text-muted-foreground text-center">Нет учеников</div>}
        </div>
      </section>

      <section className="rounded-lg border">
        <div className="flex items-center justify-between border-b p-5">
          <div><h2 className="font-semibold">Последние домашние задания</h2><p className="mt-1 text-sm text-muted-foreground">Нажмите, чтобы открыть задание</p></div>
          <button className="text-button" onClick={() => go('homework')}>Все<ChevronRight /></button>
        </div>
        <div className="grid gap-3 p-4 lg:grid-cols-3">
          {recent.map(hw => <HwCard key={hw.id} hw={hw} onOpen={() => onOpenHw(hw.id)} />)}
        </div>
      </section>
    </>
  )
}

function pluralDays(n: number) {
  const abs = Math.abs(n) % 100
  const n1 = abs % 10
  if (abs > 10 && abs < 20) return `${n} дней`
  if (n1 > 1 && n1 < 5) return `${n} дня`
  if (n1 === 1) return `${n} день`
  return `${n} дней`
}

function StudentOverview({ 
  userName, 
  userRating, 
  userRank = 0,
  homeworks, 
  onOpenHw, 
  notify,
  onGoSection,
  puzzlesSolvedTotal = 0,
  puzzlesAttempted = 0,
  activityStreak = 0,
}: { 
  userName: string; 
  userRating: number; 
  userRank?: number;
  homeworks: HW[]; 
  onOpenHw: (id: string | number) => void;
  onGoSection?: (s: string) => void;
  notify: (s: string) => void;
  puzzlesSolvedTotal?: number;
  puzzlesAttempted?: number;
  activityStreak?: number;
}) {
  const solvedHw = homeworks.filter(h => h.solved).length
  const totalSolved = solvedHw + puzzlesSolvedTotal
  
  let accuracy = 0
  if (puzzlesAttempted > 0) {
    accuracy = Math.round((puzzlesSolvedTotal / puzzlesAttempted) * 100)
  }

  // Time-based greeting
  const hour = new Date().getHours()
  const greeting =
    hour < 5  ? 'Доброй ночи' :
    hour < 12 ? 'Доброе утро' :
    hour < 17 ? 'Добрый день' :
    'Добрый вечер'

  const activeHw = homeworks.filter(h => !h.solved)

  return (
    <>
      <Head over="Личный кабинет" title={`${greeting}, ${userName} — продолжим тренировку?`} text="Статистика и задания тренера." />
      <OverviewInvitesWidget role="STUDENT" notify={notify} />

      <PersonalStatsSection
        userRating={userRating}
        puzzlesSolvedTotal={puzzlesSolvedTotal}
        puzzlesAttempted={puzzlesAttempted}
        activityStreak={activityStreak}
        onGoSection={onGoSection}
      />

      <div><h2 className="text-lg font-semibold">Мои домашние задания</h2></div>
      {activeHw.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center bg-card border rounded-xl gap-3">
          <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center">
            <BookOpen className="w-7 h-7 text-muted-foreground" />
          </div>
          <div>
            <p className="font-semibold text-foreground">Пока нет активных заданий</p>
            <p className="text-sm text-muted-foreground mt-1">Самое время порешать</p>
          </div>
          <button
            onClick={() => onGoSection?.('puzzles')}
            className="mt-1 px-5 py-2 bg-foreground text-background rounded-xl font-semibold text-sm hover:bg-foreground/90 transition flex items-center gap-2"
          >
            <Trophy className="w-4 h-4" />
            Решать задачи
          </button>
        </div>
      ) : (
        <section className="grid gap-3 lg:grid-cols-3">
          {activeHw.map(hw => <HwCard key={hw.id} hw={hw} isStudent onOpen={() => onOpenHw(hw.id)} />)}
        </section>
      )}
    </>
  )
}

// ─── Students ────────────────────────────────────────────────────────────────

function Students({ students, homeworks, onSelect, onAddStudent, notify }: { students: Student[]; homeworks: HW[]; onSelect: (id: string | number) => void; onAddStudent: (s: any) => void; notify: (s: string) => void }) {
  const [search, setSearch] = useState('')
  const [results, setResults] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  const handleSearch = async (val: string) => {
    setSearch(val)
    if (val.length < 3) { setResults([]); return }
    setLoading(true)
    try {
      const res = await fetch(`/api/students/search?q=${encodeURIComponent(val)}`)
      if (res.ok) setResults(await res.json())
    } catch {} finally { setLoading(false) }
  }

  const handleInvite = async () => {
    try {
      const res = await fetch('/api/invite', { method: 'POST', body: JSON.stringify({ role: 'STUDENT' }) })
      const data = await res.json()
      if (res.ok) {
        navigator.clipboard.writeText(data.url)
        notify('Ссылка-приглашение скопирована в буфер обмена!')
      } else {
        notify('Ошибка: ' + data.error)
      }
    } catch (e) {
      notify('Ошибка при создании приглашения')
    }
  }

  return (
    <>
      <Head over="Обучение" title="Мои ученики" text="Нажмите на ученика, чтобы открыть профиль."
        action={<button className="button" onClick={handleInvite}><UserPlus />Сгенерировать ссылку</button>} />
      
      <div className="rounded-lg border p-4 mb-4 bg-muted/20 relative">
        <label className="field mb-0">
          <span className="text-sm font-medium">Добавить ученика по Email</span>
          <input className="input w-full" placeholder="Введите email ученика..." value={search} onChange={e => handleSearch(e.target.value)} />
        </label>
        {search.length >= 3 && (
          <div className="absolute top-full left-0 right-0 z-10 mt-1 bg-background border rounded-lg shadow-lg overflow-hidden">
            {loading ? <div className="p-3 text-sm text-muted-foreground">Поиск...</div> :
             results.length === 0 ? <div className="p-3 text-sm text-muted-foreground">Ученики не найдены</div> :
             results.map(r => (
               <div key={r.id} className="flex items-center justify-between p-3 border-b last:border-0 hover:bg-muted/50">
                 <div>
                   <p className="font-semibold text-sm">{r.name}</p>
                   <p className="text-xs text-muted-foreground">{r.email}</p>
                 </div>
                 <button className="button text-xs py-1 px-3 h-auto" onClick={() => { onAddStudent(r); setSearch(''); setResults([]) }}>Добавить</button>
               </div>
             ))}
          </div>
        )}
      </div>

      <div className="rounded-lg border">
        {students.map(s => {
          const sHws = homeworks.filter(h => h.studentId === s.id)
          const done = sHws.filter(h => h.solved).length
          const pct  = sHws.length > 0 ? Math.round(done / sHws.length * 100) : 0
          return (
            <button key={s.id} onClick={() => onSelect(s.id)}
              className="flex w-full items-center gap-4 border-b p-5 text-left last:border-0 transition-colors hover:bg-muted/30">
              <span className="flex size-10 items-center justify-center rounded-full bg-muted text-xs font-semibold">{initials(s.name)}</span>
              <span className="flex-1">
                <b className="text-sm">{s.name}</b>
                <small className="block text-muted-foreground">Рейтинг {s.rating} · {done}/{sHws.length} заданий</small>
              </span>
              <span className="w-28"><ProgressBar value={pct} /></span>
              <ChevronRight className="size-4 text-muted-foreground" />
            </button>
          )
        })}
      </div>
    </>
  )
}

// ─── Student Profile ──────────────────────────────────────────────────────────

function StudentProfile({ student, homeworks, onOpenHw, onAddHw, onDeleteStudent, notify }: {
  student: Student; homeworks: HW[]; onOpenHw: (id: string | number) => void
  onAddHw: (hw: Omit<HW, 'id' | 'attempts' | 'solved'>) => void; onDeleteStudent: (id: string) => void; notify: (s: string) => void
}) {
  const [showAdd, setShowAdd] = useState(false)
  const [hwTitle, setHwTitle] = useState('')
  const [hwDue,   setHwDue]   = useState('')
  const [hwPgn,   setHwPgn]   = useState('')
  const [hwRating, setHwRating] = useState('1200')
  const [hwFen, setHwFen] = useState('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1')
  const [hwChess, setHwChess] = useState(() => new Chess())
  const [boardOrientation, setBoardOrientation] = useState<'white' | 'black'>('white')
  const fileRef = useRef<HTMLInputElement>(null)

  const [weakThemes, setWeakThemes] = useState<{ themesJson: string, recommendation: string } | null>(null)
  const [generatingWeakThemes, setGeneratingWeakThemes] = useState(false)

  useEffect(() => {
    fetch(`/api/teacher/students/${student.id}/weak-themes`)
      .then(r => r.json())
      .then(d => { if (d.report) setWeakThemes(d.report) })
      .catch(() => {})
  }, [student.id])

  const generateWeakThemes = async () => {
    setGeneratingWeakThemes(true)
    try {
      const res = await fetch(`/api/teacher/students/${student.id}/weak-themes`, { method: 'POST' })
      const data = await res.json()
      if (data.report) {
        setWeakThemes(data.report)
        notify('Отчет успешно сгенерирован!')
      } else {
        notify(data.error || 'Ошибка при генерации')
      }
    } catch {
      notify('Ошибка сети')
    }
    setGeneratingWeakThemes(false)
  }

  // Reset editor when opened
  useEffect(() => {
    if (showAdd) {
      setHwTitle(''); setHwDue(''); setHwPgn(''); setHwRating('1200');
      setHwFen('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
      setHwChess(new Chess());
      setBoardOrientation('white');
    }
  }, [showAdd])

  const handleFenChange = (newFen: string) => {
    setHwFen(newFen)
    try {
      const g = new Chess(newFen)
      setHwChess(g)
      setHwPgn(g.pgn())
      setBoardOrientation(newFen.split(' ')[1] === 'w' ? 'white' : 'black')
    } catch(e) {}
  }

  const onPieceDrop = (sourceSquare: string, targetSquare: string) => {
    const clone = new Chess()
    clone.loadPgn(hwChess.pgn())
    try {
      clone.move({ from: sourceSquare, to: targetSquare, promotion: 'q' })
      setHwChess(clone)
      setHwPgn(clone.pgn())
      return true
    } catch(e) {
      return false
    }
  }

  const handleUndo = () => {
    const clone = new Chess()
    clone.loadPgn(hwChess.pgn())
    clone.undo()
    setHwChess(clone)
    setHwPgn(clone.pgn())
  }

  const done = homeworks.filter(h => h.solved).length
  const avgAttempts = done > 0 ? (homeworks.filter(h => h.solved).reduce((a, h) => a + h.attempts, 0) / done).toFixed(1) : '—'

  const handleAdd = () => {
    if (!hwTitle || !hwPgn) { notify('Заполните название и добавьте ходы на доске (PGN)'); return }
    onAddHw({ studentId: student.id, title: hwTitle, dueDate: hwDue || undefined, progress: 0, pgn: hwPgn, rating: parseInt(hwRating) })
    setShowAdd(false);
  }

  return (
    <>
      <div className="flex items-center gap-5 flex-wrap">
        <span className="flex size-16 items-center justify-center rounded-full bg-muted text-2xl font-semibold">{initials(student.name)}</span>
        <div>
          <h1 className="text-2xl font-semibold">{student.name}</h1>
          <p className="text-sm text-muted-foreground">Рейтинг {student.rating} · {done}/{homeworks.length} заданий выполнено</p>
        </div>
        <div className="ml-auto flex gap-2">
          <button className="button" onClick={() => setShowAdd(true)}><Plus />Добавить ДЗ</button>
          <button className="outline-button text-red-500 hover:bg-red-50" onClick={() => {
            if (confirm('Удалить ученика?')) { onDeleteStudent(student.id) }
          }}><Trash2 className="size-4 mr-1"/>Удалить</button>
        </div>
      </div>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Metric label="Рейтинг"          value={String(student.rating)} note="ELO" />
        <Metric label="Выполнено"         value={`${done}/${homeworks.length}`} note="заданий" />
        <Metric label="Просрочено"        value={String(homeworks.filter(h => !h.solved && h.status !== 'Новое').length)} note="заданий" />
        <Metric label="Ср. попыток"       value={String(avgAttempts)} note="на задачу" />
      </section>

      <div>
        <h2 className="text-lg font-semibold">Домашние задания</h2>
        {homeworks.length === 0
          ? <p className="mt-2 text-sm text-muted-foreground">Заданий пока нет. Нажмите «Добавить ДЗ».</p>
          : <div className="mt-3 grid gap-3 lg:grid-cols-3">{homeworks.map(hw => <HwCard key={hw.id} hw={hw} onOpen={() => onOpenHw(hw.id)} />)}</div>}
      </div>

      <div className="mt-8">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold flex items-center gap-2"><Zap className="size-5 text-amber-500" /> AI-анализ слабых тем</h2>
          <button className="outline-button text-xs py-1.5" onClick={generateWeakThemes} disabled={generatingWeakThemes}>
            {generatingWeakThemes ? 'Генерация...' : 'Обновить анализ'}
          </button>
        </div>
        {weakThemes ? (
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-5">
            <p className="text-sm font-semibold mb-2">Рекомендация:</p>
            <p className="text-sm">{weakThemes.recommendation}</p>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground mt-2">Анализ пока не проводился. Нажмите "Обновить анализ", чтобы AI проанализировал ошибки ученика.</p>
        )}
      </div>

      {showAdd && (
        <Modal title="Добавить домашнее задание" close={() => setShowAdd(false)} wide>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex flex-col gap-4">
              <label className="field">Название задания<input className="input" value={hwTitle} onChange={e => setHwTitle(e.target.value)} placeholder="Тактика: вилка конём" /></label>
              <div className="flex gap-4">
                <label className="field flex-1">Срок (дата)<input className="input" type="date" value={hwDue} onChange={e => setHwDue(e.target.value)} /></label>
                <label className="field flex-1">Рейтинг (Elo)<input className="input" type="number" value={hwRating} onChange={e => setHwRating(e.target.value)} placeholder="1200" /></label>
              </div>
              <label className="field">Стартовая позиция (FEN)<input className="input font-mono text-xs" value={hwFen} onChange={e => handleFenChange(e.target.value)} placeholder="rnbqkbnr/..." /></label>
              
              <div className="bg-muted/30 p-4 rounded-xl border flex-1 flex flex-col">
                <p className="text-sm font-semibold mb-2">Запись ходов (PGN)</p>
                <p className="text-xs text-muted-foreground mb-3">Двигайте фигуры на доске справа, чтобы записать правильное решение. Либо вставьте готовый PGN.</p>
                <textarea className="textarea font-mono text-xs flex-1 w-full" value={hwPgn} onChange={e => { setHwPgn(e.target.value); try { const g = new Chess(); g.loadPgn(e.target.value); setHwChess(g); } catch(err){} }} placeholder="Или вставьте PGN вручную" />
                <div className="flex items-center gap-2 mt-3">
                  <label className="outline-button flex-1 text-center cursor-pointer text-xs py-2">
                    <Upload className="size-4 inline-block mr-1"/>Загрузить PGN
                    <input ref={fileRef} className="sr-only" type="file" accept=".pgn,.txt" onChange={e => { const f = e.target.files?.[0]; if (f) { const r = new FileReader(); r.onload = () => { const pgnStr = String(r.result); setHwPgn(pgnStr); try { const g = new Chess(); g.loadPgn(pgnStr); setHwChess(g); } catch(err){} }; r.readAsText(f) } }} />
                  </label>
                  <button className="outline-button flex-1 text-xs py-2" onClick={handleUndo}><RotateCcw className="size-4 inline-block mr-1"/>Отменить ход</button>
                </div>
              </div>
            </div>
            <div className="flex flex-col">
              <div className="w-full aspect-square border rounded-md overflow-hidden bg-muted/20">
                 <Chessboard 
                  options={{
                    position: hwChess.fen(),
                    boardOrientation: boardOrientation,
                    onPieceDrop: ({ sourceSquare, targetSquare }) => onPieceDrop(sourceSquare, targetSquare),
                    animationDurationInMs: 200
                  }}
                />
              </div>
              <button className="button mt-auto pt-4" onClick={handleAdd}>Назначить ученику</button>
            </div>
          </div>
        </Modal>
      )}
    </>
  )
}

// ─── Homework List ────────────────────────────────────────────────────────────

function HomeworkList({ homeworks, students, isStudent, onOpenHw }: { homeworks: HW[]; students: Student[]; isStudent: boolean; onOpenHw: (id: string | number) => void }) {
  return (
    <>
      <Head over="Практика" title="Домашние задания" text="Нажмите на задание, чтобы открыть его." />
      <div className="grid gap-4 lg:grid-cols-3">
        {homeworks.map(hw => {
          const student = students.find(s => s.id === hw.studentId)
          return (
            <div key={hw.id}>
              {!isStudent && student && <p className="mb-1 text-xs font-semibold text-muted-foreground">{student.name}</p>}
              <HwCard hw={hw} isStudent={isStudent} onOpen={() => onOpenHw(hw.id)} />
            </div>
          )
        })}
      </div>
    </>
  )
}

// ─── Homework Puzzle ──────────────────────────────────────────────────────────

const BOARD_LIGHT = '#f0d9b5', BOARD_DARK = '#b58863'
const COL_SEL = '#7fc97f', COL_LEGAL = 'rgba(0,0,0,0.18)', COL_DROP = '#d4e84b'
const FILES = 'abcdefgh'

function ChessBoard({
  game, selected, setSelected, dragFrom, setDragFrom, dragOver, setDragOver,
  flipped, onMove, extraBg = {}
}: {
  game: Chess; selected: string | null; setSelected: (s: string | null) => void
  dragFrom: string | null; setDragFrom: (s: string | null) => void
  dragOver: string | null; setDragOver: (s: string | null) => void
  flipped: boolean; onMove: (from: string, to: string) => void; extraBg?: Record<string, string>
}) {
  const legalMoves = game.moves({ verbose: true })
  const legalDests = selected ? legalMoves.filter(m => m.from === selected).map(m => m.to) : []
  const board = game.board()

  function sqName(r: number, c: number) { return `${FILES[flipped ? 7 - c : c]}${flipped ? r + 1 : 8 - r}` }

  function sqBg(sqn: string, light: boolean) {
    if (extraBg[sqn]) return extraBg[sqn]
    if (sqn === selected) return COL_SEL
    if (sqn === dragOver) return COL_DROP
    return light ? BOARD_LIGHT : BOARD_DARK
  }

  function handleClick(sqn: string, sq: { color: string; type: string } | null) {
    const isOwn = !!sq && sq.color === game.turn()
    if (selected) {
      if (legalDests.includes(sqn)) { onMove(selected, sqn); setSelected(null); return }
      setSelected(isOwn ? sqn : null); return
    }
    if (isOwn) setSelected(sqn)
  }

  const rows = flipped ? [...board].reverse() : board
  return (
    <div className="grid size-full grid-cols-8 grid-rows-8">
      {rows.flatMap((rank, r) => {
        const cells = flipped ? [...rank].reverse() : rank
        return cells.map((sq, c) => {
          const rR = flipped ? 7 - r : r, rC = flipped ? 7 - c : c
          const light = (rR + rC) % 2 === 0
          const sqn = sqName(r, c)
          const isLegal = legalDests.includes(sqn)
          const bg = sqBg(sqn, light)
          const lblColor = light ? BOARD_DARK : BOARD_LIGHT
          return (
            <div key={sqn}
              className="relative flex items-center justify-center select-none"
              style={{ backgroundColor: bg, cursor: sq ? 'pointer' : 'default' }}
              onMouseDown={() => handleClick(sqn, sq)}
              onDragOver={e => { e.preventDefault(); setDragOver(sqn) }}
              onDrop={e => { e.preventDefault(); if (dragFrom) onMove(dragFrom, sqn); setDragFrom(null); setDragOver(null) }}>
              {isLegal && !sq && <div style={{ width: '34%', height: '34%', borderRadius: '50%', background: COL_LEGAL, pointerEvents: 'none' }} />}
              {isLegal && sq  && <div style={{ position: 'absolute', inset: 0, border: `3px solid ${COL_LEGAL}`, pointerEvents: 'none', boxSizing: 'border-box' }} />}
              {sq && <img className="size-[88%] object-contain" style={{ position: 'relative', zIndex: 1, userSelect: 'none' }}
                src={`https://lichess1.org/assets/piece/cburnett/${sq.color}${sq.type.toUpperCase()}.svg`}
                alt={sq.type} draggable
                onDragStart={() => { setDragFrom(sqn); setSelected(sqn) }}
                onDragEnd={() => { setDragFrom(null); setDragOver(null) }} />}
              {c === 0 && <span style={{ position: 'absolute', left: 2, top: 1, fontSize: 9, fontWeight: 700, color: lblColor, lineHeight: 1, pointerEvents: 'none' }}>{flipped ? r + 1 : 8 - r}</span>}
              {r === 7 && <span style={{ position: 'absolute', right: 2, bottom: 1, fontSize: 9, fontWeight: 700, color: lblColor, lineHeight: 1, pointerEvents: 'none' }}>{FILES[flipped ? 7 - c : c]}</span>}
            </div>
          )
        })
      })}
    </div>
  )
}

function HomeworkPuzzle({ hw, isStudent, onProgress, onUpdate, onDelete, notify }: {
  hw: HW; isStudent: boolean
  onProgress: (id: string | number, progress: number, solved: boolean, attempts: number) => void
  onUpdate?: (id: string | number, patch: Partial<HW>) => void
  onDelete?: (id: string | number) => void
  notify?: (s: string) => void
}) {
  const puzzles = useMemo(() => parseHwPgn(hw.pgn), [hw.pgn])
  const totalPuzzles = puzzles.length
  
  const [puzzleIdx, setPuzzleIdx] = useState(() => {
    if (hw.solved) return 0
    const idx = Math.floor((hw.progress / 100) * totalPuzzles)
    return Math.min(Math.max(0, idx), totalPuzzles - 1)
  })

  const currentPuzzle = puzzles[puzzleIdx] || { startFen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', solution: [] }
  const { startFen, solution } = currentPuzzle

  const studentColor = useMemo(() => { try { return new Chess(startFen).turn() } catch { return 'w' as const } }, [startFen])
  const [game,         setGame]         = useState(() => { try { return new Chess(startFen) } catch { return new Chess() } })
  const [moveIdx,      setMoveIdx]      = useState(0)
  const [wrongCount,   setWrongCount]   = useState(0)
  const [status,       setStatus]       = useState<'playing' | 'solved' | 'revealed'>(hw.solved ? 'solved' : 'playing')
  const [message,      setMessage]      = useState('')
  const [selected,     setSelected]     = useState<string | null>(null)
  const [dragFrom,     setDragFrom]     = useState<string | null>(null)
  const [dragOver,     setDragOver]     = useState<string | null>(null)
  const [flipped,      setFlipped]      = useState(studentColor === 'b')

  const [showEdit,     setShowEdit]     = useState(false)
  const [editTitle,    setEditTitle]    = useState(hw.title)
  const [editDue,      setEditDue]      = useState(hw.due)
  const [editPgn,      setEditPgn]      = useState(hw.pgn)
  const [teacherNote,  setTeacherNote]  = useState('')
  const editFileRef = useRef<HTMLInputElement>(null)

  // Reset puzzle state when navigating
  useEffect(() => {
    try { setGame(new Chess(startFen)) } catch { setGame(new Chess()) }
    setMoveIdx(0); setWrongCount(0); setMessage(''); setSelected(null)
    setFlipped(studentColor === 'b')
    
    // Determine status based on overall homework progress
    if (hw.solved) {
      setStatus('solved')
    } else {
      const solvedCount = Math.floor((hw.progress / 100) * totalPuzzles)
      if (puzzleIdx < solvedCount) setStatus('solved')
      else setStatus('playing')
    }
  }, [puzzleIdx, startFen, studentColor, hw.solved, hw.progress, totalPuzzles])

  function applyStudentMove(from: string, to: string) {
    if (status !== 'playing' || !isStudent) return
    if (game.turn() !== studentColor) return
    if (moveIdx >= solution.length) return

    const legalMoves = game.moves({ verbose: true })
    const mv = legalMoves.find(m => m.from === from && m.to === to)
    if (!mv) return

    const expectedSan = solution[moveIdx]
    let correct = false
    try {
      const eg = new Chess(game.fen()); eg.move(expectedSan)
      const sg = new Chess(game.fen()); sg.move(mv.san)
      correct = eg.fen() === sg.fen()
    } catch { correct = false }

    if (correct) {
      let g = new Chess(game.fen())
      g.move(mv.san)
      let idx = moveIdx + 1
      while (idx < solution.length) {
        const g2 = new Chess(g.fen())
        if (g2.turn() === studentColor) break
        try { g.move(solution[idx]); idx++ } catch { break }
      }
      setGame(g); setMoveIdx(idx); setSelected(null)
      if (idx >= solution.length) {
        setStatus('solved')
        const newSolvedCount = Math.max(puzzleIdx + 1, Math.floor((hw.progress / 100) * totalPuzzles))
        const newProgress = Math.round((newSolvedCount / totalPuzzles) * 100)
        const isFullySolved = newSolvedCount >= totalPuzzles

        if (isFullySolved) {
          setMessage('🏆 Все задачи решены! Отличная работа!')
        } else {
          setMessage('✅ Задача решена! Переходите к следующей.')
        }
        
        onProgress(hw.id, newProgress, isFullySolved, hw.attempts ? hw.attempts + wrongCount + 1 : wrongCount + 1)
      } else {
        setMessage('✅ Верно! Продолжайте.')
      }
    } else {
      const newWrong = wrongCount + 1
      setWrongCount(newWrong)
      setSelected(null)
      if (newWrong >= 3) {
        let g = new Chess(startFen)
        solution.forEach(san => { try { g.move(san) } catch {} })
        setGame(g); setMoveIdx(solution.length)
        setStatus('revealed'); setMessage('❌ Попытки исчерпаны. Показано правильное решение.')
        
        const newSolvedCount = Math.max(puzzleIdx + 1, Math.floor((hw.progress / 100) * totalPuzzles))
        const newProgress = Math.round((newSolvedCount / totalPuzzles) * 100)
        const isFullySolved = newSolvedCount >= totalPuzzles
        
        onProgress(hw.id, newProgress, isFullySolved, hw.attempts ? hw.attempts + 3 : 3)
      } else {
        setMessage(`❌ Неверно! Осталось попыток: ${3 - newWrong}`)
      }
    }
  }

  function reset() {
    try { setGame(new Chess(startFen)) } catch { setGame(new Chess()) }
    setMoveIdx(0); setWrongCount(0); setStatus('playing'); setMessage(''); setSelected(null)
  }

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
      if (isStudent && status === 'playing') return
      if (e.key === 'ArrowLeft') {
        setMoveIdx(prev => Math.max(0, prev - 1))
      } else if (e.key === 'ArrowRight') {
        setMoveIdx(prev => Math.min(solution.length, prev + 1))
      } else if (e.key === 'ArrowUp') {
        setMoveIdx(0)
      } else if (e.key === 'ArrowDown') {
        setMoveIdx(solution.length)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isStudent, status, solution.length])

  // Sync board with moveIdx when reviewing
  useEffect(() => {
    if (!isStudent || status !== 'playing') {
      const g = new Chess(startFen)
      for (let i = 0; i < moveIdx; i++) {
        try { g.move(solution[i]) } catch {}
      }
      setGame(g)
    }
  }, [moveIdx, isStudent, status, startFen, solution])

  const canMove = isStudent && status === 'playing' && game.turn() === studentColor

  return (
    <>
      <Head
        over={isStudent ? 'Домашнее задание' : 'Просмотр задания'}
        title={hw.title}
        text={isStudent
          ? (hw.solved ? `✅ Выполнено (попыток: ${hw.attempts})` : status === 'solved' ? `✅ Задача решена` : status === 'revealed' ? `❌ Показано решение` : `Попытки: ${wrongCount}/3 · Срок: ${hw.dueDate ? formatDate(hw.dueDate) : (hw.due || 'без срока')}`)
          : `Ученик: ${hw.status || 'Новое'} · Срок: ${hw.dueDate ? formatDate(hw.dueDate) : (hw.due || 'без срока')}`}
        action={!isStudent && onUpdate
          ? <div className="flex gap-2">
              <button className="outline-button text-red-500 hover:bg-red-50" onClick={() => { if (onDelete && confirm('Удалить задание?')) onDelete(hw.id) }}><Trash2 className="size-4" />Удалить</button>
              <button className="outline-button" onClick={() => setShowEdit(true)}><Pencil className="size-4" />Редактировать</button>
            </div>
          : undefined} />

      {/* Teacher: progress + note, NOT the raw solution */}
      {!isStudent && (
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-lg border p-5">
            <p className="text-sm font-semibold mb-3">Прогресс ученика</p>
            <div className="mb-1.5 flex justify-between text-xs"><span>Выполнено</span><span>{hw.progress}%</span></div>
            <ProgressBar value={hw.progress} />
            {hw.solved && <p className="mt-2 text-xs text-green-600">✅ Решено с {hw.attempts} попыток</p>}
            {!hw.solved && hw.attempts > 0 && <p className="mt-2 text-xs text-muted-foreground">Неверных попыток: {hw.attempts}</p>}
          </div>
          <div className="rounded-lg border p-5">
            <p className="text-sm font-semibold mb-2">Комментарий тренера</p>
            <textarea className="textarea min-h-16 text-xs" value={teacherNote}
              onChange={e => setTeacherNote(e.target.value)}
              placeholder="Оставьте обратную связь для ученика..." />
            <button className="outline-button mt-2 w-full text-xs"
              onClick={() => { onUpdate?.(hw.id, { teacherNote }); notify?.('Комментарий сохранён') }}>
              Сохранить комментарий
            </button>
          </div>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(280px,500px)_1fr]">
        <div>
          {totalPuzzles > 1 && (
            <div className="flex items-center justify-between mb-3 bg-muted/50 rounded-lg p-2 border">
              <button className="icon-button hover:bg-background" disabled={puzzleIdx === 0} onClick={() => setPuzzleIdx(p => Math.max(0, p - 1))}>
                <ArrowLeft className="size-4" />
              </button>
              <span className="text-sm font-medium tracking-tight">Задача {puzzleIdx + 1} из {totalPuzzles}</span>
              <button className="icon-button hover:bg-background" disabled={puzzleIdx === totalPuzzles - 1} onClick={() => setPuzzleIdx(p => Math.min(totalPuzzles - 1, p + 1))}>
                <ArrowRight className="size-4" />
              </button>
            </div>
          )}
          <ResizableBoardContainer initialWidth={500} minWidth={280} maxWidth={800}>
            <div className="aspect-square overflow-hidden rounded-md" style={{ border: `3px solid ${BOARD_DARK}` }}>
              <ChessBoard game={game} selected={selected} setSelected={canMove ? setSelected : () => {}}
                dragFrom={dragFrom} setDragFrom={setDragFrom} dragOver={dragOver} setDragOver={setDragOver}
                flipped={flipped} onMove={applyStudentMove} />
            </div>
          </ResizableBoardContainer>

          <div className="mt-3 flex items-center gap-2">
            <div className="size-4 rounded-full border-2" style={{ backgroundColor: game.turn() === 'w' ? '#fff' : '#111', borderColor: BOARD_DARK }} />
            <span className="flex-1 text-xs text-muted-foreground">
              {isStudent ? (game.turn() === studentColor ? 'Ваш ход' : 'Ход компьютера') : (game.turn() === 'w' ? 'Ходят белые' : 'Ходят чёрные')}
            </span>
            <button className="icon-button" onClick={() => setFlipped(f => !f)} title="Перевернуть"><RotateCcw /></button>
          </div>

          {message && (
            <div className={`mt-3 rounded-lg border p-3 text-sm font-medium ${status === 'solved' ? 'border-green-300 bg-green-50 text-green-800' : status === 'revealed' ? 'border-orange-300 bg-orange-50 text-orange-800' : message.startsWith('✅') ? 'border-green-200 bg-green-50 text-green-800' : 'border-red-200 bg-red-50 text-red-800'}`}>
              {message}
            </div>
          )}

          {isStudent && status === 'playing' && (
            <div className="mt-3 flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Попытки:</span>
              {[0, 1, 2].map(i => (
                <div key={i} className={`size-3 rounded-full border ${i < wrongCount ? 'border-destructive bg-destructive' : 'border-muted-foreground'}`} />
              ))}
            </div>
          )}
          {isStudent && status === 'playing' && (
            <button className="outline-button mt-3 w-full" onClick={reset}>Сбросить позицию</button>
          )}
          {isStudent && (status === 'solved' || status === 'revealed') && puzzleIdx < totalPuzzles - 1 && (
            <button className="main-button mt-3 w-full" onClick={() => setPuzzleIdx(p => p + 1)}>Следующая задача <ArrowRight className="size-4 ml-2" /></button>
          )}
        </div>

        <div className="flex flex-col gap-4">
          <div className="rounded-lg border p-5">
            <h3 className="font-semibold">Детали задания</h3>
            <div className="mt-4 space-y-3 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Назначено</span><span>{formatDate(hw.assignedAt || hw.assigned)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Срок</span><span>{hw.dueDate ? formatDate(hw.dueDate) : hw.due}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Статус</span><span className="badge">{status === 'solved' ? 'Выполнено' : hw.status}</span></div>
            </div>
          </div>
          {(status === 'solved' || status === 'revealed' || !isStudent) && (
            <div className="rounded-lg border p-5">
              <h3 className="font-semibold mb-3">Правильное решение</h3>
              <div className="flex flex-wrap gap-2 text-sm font-mono">
                {solution.map((san, i) => (
                  <span key={i} className="px-1.5 py-0.5 bg-muted rounded border">{san}</span>
                ))}
              </div>
            </div>
          )}
          {isStudent && status === 'playing' && (
            <div className="rounded-lg border bg-muted/30 p-5">
              <p className="text-sm font-medium">💡 Как это работает</p>
              <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                <li>• Найдите лучший ход для {studentColor === 'w' ? 'белых' : 'чёрных'}</li>
                <li>• Правильный ход — компьютер отвечает автоматически</li>
                <li>• Неправильный — попытка засчитывается</li>
                <li>• 3 неверных попытки → показывается решение</li>
              </ul>
            </div>
          )}
        </div>
      </div>

      {/* Teacher edit modal */}
      {showEdit && onUpdate && (
        <Modal title="Редактировать задание" close={() => setShowEdit(false)}>
          <label className="field">Название<input className="input" value={editTitle} onChange={e => setEditTitle(e.target.value)} /></label>
          <label className="field">Срок<input type="date" className="input" value={editDue} onChange={e => setEditDue(e.target.value)} /></label>
          <div className="field">
            <span>PGN (решение)</span>
            <label className="drop-zone cursor-pointer">
              <Upload /><b>{editPgn ? '✅ PGN загружен' : 'Загрузить новый PGN'}</b>
              <input ref={editFileRef} className="sr-only" type="file" accept=".pgn,.txt"
                onChange={e => { const f = e.target.files?.[0]; if (f) { const r = new FileReader(); r.onload = () => setEditPgn(String(r.result)); r.readAsText(f) } }} />
            </label>
            <textarea className="textarea font-mono text-xs min-h-20" value={editPgn} onChange={e => setEditPgn(e.target.value)} />
          </div>
          <button className="button" onClick={() => {
            onUpdate(hw.id, { title: editTitle, dueDate: editDue, pgn: editPgn })
            setShowEdit(false)
          }}>Сохранить изменения</button>
        </Modal>
      )}
    </>
  )
}

// ─── Videos ───────────────────────────────────────────────────────────────────

function getYouTubeId(url: string) {
  const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([^&?]+)/);
  return match ? match[1] : null;
}

function VideosSection({ 
  videos, 
  setVideos, 
  teacher, 
  notify,
  isUserPremium,
  onPremiumClick
}: { 
  videos: Video[]; 
  setVideos: React.Dispatch<React.SetStateAction<Video[]>>; 
  teacher: boolean; 
  notify: (s: string) => void;
  isUserPremium?: boolean;
  onPremiumClick?: () => void;
}) {
  const [modal, setModal] = useState<null | 'add' | string | number>(null)
  const [form, setForm] = useState({ title: '', meta: '', url: '', isPremium: false })

  function openAdd() {
    setForm({ title: '', meta: '', url: '', isPremium: false })
    setModal('add')
  }

  function openEdit(v: Video) {
    setForm({ title: v.title, meta: v.meta, url: v.url, isPremium: !!v.isPremium })
    setModal(v.id)
  }

  async function handleDelete(id: string | number) {
    if (!confirm('Удалить видео?')) return
    try {
      const res = await fetch(`/api/videos/${id}`, { method: 'DELETE' })
      if (res.ok) {
        setVideos(prev => prev.filter(v => v.id !== id))
        notify('Видео удалено')
      } else {
        notify('Ошибка при удалении')
      }
    } catch {
      notify('Ошибка сети')
    }
  }

  async function handleSave() {
    if (!form.title || !form.url) { notify('Заполните все поля'); return }
    const isEdit = modal !== 'add' && modal !== null
    try {
      if (modal === 'add') {
        const res = await fetch('/api/videos/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form)
        })
        if (res.ok) {
          const { video } = await res.json()
          setVideos(prev => [video, ...prev])
          notify('Видео опубликовано!')
        } else {
          notify('Ошибка при сохранении видео.')
        }
      } else if (isEdit) {
        const res = await fetch(`/api/videos/${modal}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form)
        })
        if (res.ok) {
          const updatedVideo = await res.json()
          setVideos(prev => prev.map(v => v.id === modal ? updatedVideo : v))
          notify('Видео обновлено!')
        } else {
          notify('Ошибка при обновлении видео.')
        }
      }
    } catch {
      notify('Ошибка сети.')
    }
    setModal(null)
  }

  return (
    <>
      <Head over="YouTube библиотека" title="Видеоуроки"
        text={teacher ? 'Публикуйте ссылки на видео с вашего канала.' : 'Смотрите видеоуроки тренера.'}
        action={teacher ? <button className="button" onClick={openAdd}><Plus />Добавить видео</button> : undefined} />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {videos.map(v => {
          const ytId = getYouTubeId(v.url)
          return (
            <article key={v.id} className="overflow-hidden rounded-lg border flex flex-col">
              <div className="w-full aspect-video border-b bg-muted/40 relative shrink-0 overflow-hidden">
                {ytId ? (
                  <img
                    src={`https://img.youtube.com/vi/${ytId}/hqdefault.jpg`}
                    alt={v.title}
                    className="absolute inset-0 w-full h-full object-cover scale-105"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Video className="size-9 text-muted-foreground" />
                  </div>
                )}
              </div>
              <div className="p-5 flex flex-col flex-1">
                <h3 className="font-semibold flex items-center gap-2">
                  {v.title}
                  {v.isPremium && <Crown className="w-4 h-4 text-yellow-500" />}
                </h3>
                <p className="mt-1 text-sm text-muted-foreground flex-1">{v.meta}</p>
                {(!v.isPremium || isUserPremium || teacher) ? (
                  <a className="outline-button mt-5 w-full shrink-0" href={v.url} target="_blank" rel="noreferrer" onClick={() => notify('Открываем YouTube')}>
                    Смотреть на YouTube<ExternalLink />
                  </a>
                ) : (
                  <button className="bg-yellow-500 hover:bg-yellow-600 text-white font-bold py-2 px-4 rounded-md transition-all mt-5 w-full flex justify-center items-center gap-2" onClick={onPremiumClick}>
                    <LockKeyhole className="w-4 h-4" /> Купить Premium
                  </button>
                )}
                {teacher && (
                  <div className="flex items-center gap-2 mt-2 shrink-0">
                    <button className="outline-button flex-1 py-1 text-xs h-auto" onClick={() => openEdit(v)}><Pencil className="size-3" /> Изменить</button>
                    <button className="icon-button border rounded-md" onClick={() => handleDelete(v.id)}><Trash2 className="size-4 text-red-500" /></button>
                  </div>
                )}
              </div>
            </article>
          )
        })}
      </div>
      {(modal === 'add' || (modal !== null)) && (
        <Modal title={modal === 'add' ? 'Добавить видео с YouTube' : 'Редактировать видео'} close={() => setModal(null)}>
          <label className="field">Название<input className="input" value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} /></label>
          <label className="field">Длительность и тема<input className="input" value={form.meta} onChange={e => setForm(p => ({ ...p, meta: e.target.value }))} placeholder="18 мин · Тактика" /></label>
          <label className="field">Ссылка YouTube<input className="input" type="url" value={form.url} onChange={e => setForm(p => ({ ...p, url: e.target.value }))} placeholder="https://youtube.com/watch?v=..." /></label>
          <label className="flex items-center gap-2 mt-2 cursor-pointer">
            <input type="checkbox" checked={form.isPremium} onChange={e => setForm(p => ({ ...p, isPremium: e.target.checked }))} className="rounded border-border" />
            <span>Premium видео</span>
          </label>
          <button className="button mt-4" onClick={handleSave}>{modal === 'add' ? 'Опубликовать' : 'Сохранить'}</button>
        </Modal>
      )}
    </>
  )
}

// ─── PGN Board (full tree editor) ────────────────────────────────────────────

export function PgnBoard({ openings = [], setOpenings, isTeacher, notify }: { openings?: any[], setOpenings?: any, isTeacher?: boolean, notify?: (s: string) => void }) {
  const [tree,        setTree]        = useState<GameTree>({ children: [], comment: '' })
  const [path,        setPath]        = useState<string[]>([])
  const [flipped,     setFlipped]     = useState(false)
  const [error,       setError]       = useState('')
  const [selected,    setSelected]    = useState<string | null>(null)
  const [dragFrom,    setDragFrom]    = useState<string | null>(null)
  const [dragOver,    setDragOver]    = useState<string | null>(null)
  const [ctxMenu,     setCtxMenu]     = useState<{ x: number; y: number; nodePath: string[] } | null>(null)
  const [editComment, setEditComment] = useState<string[] | null>(null)
  const [commentDraft, setCommentDraft] = useState('')

  async function saveCurrent() {
    const title = prompt('Введите название дебюта:')
    if (!title) return
    const pgn = JSON.stringify(tree)
    try {
      const res = await fetch('/api/openings', { method: 'POST', body: JSON.stringify({ title, pgn }) })
      if (res.ok) {
        const op = await res.json()
        if (setOpenings) setOpenings((prev: any) => [op, ...prev])
        if (notify) notify('Дебют сохранён')
      }
    } catch { if (notify) notify('Ошибка сохранения') }
  }

  async function deleteOpening(id: string) {
    if (!confirm('Удалить дебют?')) return
    try {
      const res = await fetch(`/api/openings/${id}`, { method: 'DELETE' })
      if (res.ok) {
        if (setOpenings) setOpenings((prev: any) => prev.filter((o: any) => o.id !== id))
        if (notify) notify('Дебют удалён')
      }
    } catch { if (notify) notify('Ошибка удаления') }
  }

  async function editTitle(o: any) {
    const title = prompt('Новое название:', o.title)
    if (!title || title === o.title) return
    try {
      const res = await fetch(`/api/openings/${o.id}`, { method: 'PUT', body: JSON.stringify({ title }) })
      if (res.ok) {
        const up = await res.json()
        if (setOpenings) setOpenings((prev: any) => prev.map((x: any) => x.id === o.id ? up : x))
        if (notify) notify('Дебют переименован')
      }
    } catch { if (notify) notify('Ошибка переименования') }
  }

  // Candidate continuations from tree at current path
  const { nodes: candidateNodes } = walkTo(tree, path)

  // ── Keyboard Navigation ──
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
      if (e.key === 'ArrowLeft') {
        setPath(p => p.length > 0 ? p.slice(0, p.length - 1) : p)
        setSelected(null)
      } else if (e.key === 'ArrowRight') {
        if (candidateNodes.length > 0) makeMove(candidateNodes[0].san)
      } else if (e.key === 'ArrowUp') {
        setPath([])
        setSelected(null)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [candidateNodes, path, tree])

  // ── Tree helpers ──
  function walkTo(t: GameTree, p: string[]): { nodes: TreeNode[]; node: TreeNode | null } {
    let nodes = t.children
    let node: TreeNode | null = null
    for (const san of p) {
      node = nodes.find(n => n.san === san) ?? null
      if (!node) return { nodes, node: null }
      nodes = node.children
    }
    return { nodes, node }
  }

  function buildGame(p: string[]): Chess {
    const g = new Chess()
    p.forEach(san => { try { g.move(san) } catch {} })
    return g
  }

  const currentGame = buildGame(path)
  const legalMoves  = currentGame.moves({ verbose: true })

  const candidateTos = candidateNodes.map(n => { try { const g = buildGame(path); const m = g.move(n.san); return m?.to ?? '' } catch { return '' } }).filter(Boolean)

  function makeMove(san: string) {
    const newTree = cloneTree(tree)
    const { nodes } = walkTo(newTree, path)
    if (!nodes.find(n => n.san === san)) nodes.push({ san, comment: '', children: [] })
    setTree(newTree)
    setPath([...path, san])
    setSelected(null)
  }

  function goToStep(idx: number) { setPath(path.slice(0, idx)); setSelected(null) }

  function deleteFromNodePath(nodePath: string[]) {
    const parentPath = nodePath.slice(0, -1)
    const sanToRemove = nodePath[nodePath.length - 1]
    const newTree = cloneTree(tree)
    const { nodes } = walkTo(newTree, parentPath)
    const i = nodes.findIndex(n => n.san === sanToRemove)
    if (i !== -1) nodes.splice(i, 1)
    setTree(newTree)
    if (path.length >= nodePath.length && path.slice(0, nodePath.length).join() === nodePath.join()) {
      setPath(parentPath)
    }
    setCtxMenu(null)
  }

  function saveComment(nodePath: string[], text: string) {
    const parentPath = nodePath.slice(0, -1)
    const san = nodePath[nodePath.length - 1]
    const newTree = cloneTree(tree)
    const { nodes } = walkTo(newTree, parentPath)
    const nd = nodes.find(n => n.san === san)
    if (nd) nd.comment = text
    setTree(newTree)
    setEditComment(null)
  }

  function load(text: string) {
    try { setTree(parsePgnToTree(text)); setPath([]); setSelected(null); setError('') }
    catch { setError('Не удалось прочитать PGN.') }
  }

  function onMove(from: string, to: string) {
    const mv = legalMoves.find(m => m.from === from && m.to === to)
    if (mv) makeMove(mv.san)
  }

  // Candidate extra bg squares
  const extraBg: Record<string, string> = {}
  candidateTos.forEach(sq => { extraBg[sq] = '#f6f669' })

  // Get node info for path rendering
  function nodeAt(idx: number): TreeNode | null {
    const { node } = walkTo(tree, path.slice(0, idx + 1))
    return node
  }
  function siblingsAt(idx: number): TreeNode[] {
    const { nodes } = walkTo(tree, path.slice(0, idx))
    return nodes
  }

  return (
    <>
      {/* Context menu */}
      {ctxMenu && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setCtxMenu(null)} />
          <div className="fixed z-50 rounded-lg border bg-background shadow-lg py-1 min-w-[190px]"
            style={{ left: ctxMenu.x, top: ctxMenu.y }}>
            <button className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-muted text-destructive"
              onClick={() => deleteFromNodePath(ctxMenu.nodePath)}>
              <Trash2 className="size-4" />Удалить ветку с этого хода
            </button>
          </div>
        </>
      )}

      {/* Comment editor */}
      {editComment !== null && (
        <Modal title={`Комментарий к ходу ${editComment[editComment.length - 1]}`} close={() => setEditComment(null)}>
          <textarea className="textarea min-h-28" autoFocus value={commentDraft} onChange={e => setCommentDraft(e.target.value)}
            placeholder="Например: После этого хода белые захватывают центр..." />
          <div className="flex gap-2">
            <button className="button flex-1" onClick={() => saveComment(editComment, commentDraft)}>Сохранить</button>
            <button className="outline-button" onClick={() => saveComment(editComment, '')}>Удалить</button>
          </div>
        </Modal>
      )}

      <Head over="Дебютный анализ" title="Мои дебюты"
        text="Двигайте фигуры — ходы сохраняются в дереве. ПКМ по ходу — удалить ветку. 💬 — добавить комментарий." />

      <section className="grid gap-6 rounded-lg border p-4 lg:grid-cols-[minmax(200px,250px)_minmax(280px,450px)_1fr]">
        {/* Openings List */}
        <div className="flex flex-col gap-2 border-r pr-4">
          <b className="mb-2">Сохранённые дебюты</b>
          {openings.map((o: any) => (
            <div key={o.id} className="flex flex-col gap-1 rounded p-2 border hover:border-primary/50 transition-colors">
              <button onClick={() => load(o.pgn)} className="text-sm font-semibold text-left">{o.title}</button>
              {isTeacher && (
                <div className="flex gap-2">
                  <button onClick={() => editTitle(o)} className="text-[10px] text-blue-500 hover:underline">Изменить</button>
                  <button onClick={() => deleteOpening(o.id)} className="text-[10px] text-red-500 hover:underline">Удалить</button>
                </div>
              )}
            </div>
          ))}
          {openings.length === 0 && <span className="text-xs text-muted-foreground">Нет сохранённых дебютов</span>}
          {isTeacher && (
            <button className="outline-button mt-4 text-xs py-1.5" onClick={saveCurrent}>Сохранить текущий</button>
          )}
        </div>

        {/* Board column */}
        <div>
          <div className="aspect-square overflow-hidden rounded-md" style={{ border: `3px solid ${BOARD_DARK}` }}>
            <ChessBoard game={currentGame} selected={selected} setSelected={setSelected}
              dragFrom={dragFrom} setDragFrom={setDragFrom} dragOver={dragOver} setDragOver={setDragOver}
              flipped={flipped} onMove={onMove} extraBg={extraBg} />
          </div>

          {/* Nav */}
          <div className="mt-3 flex items-center gap-2">
            <button className="outline-button" disabled={path.length === 0} onClick={() => goToStep(path.length - 1)}>←</button>
            <button className="outline-button" disabled={path.length === 0} onClick={() => goToStep(0)}>Начало</button>
            <span className="flex-1 text-center text-xs text-muted-foreground">{path.length === 0 ? 'Начальная позиция' : `Ход ${path.length}`}</span>
            <button className="icon-button" title="Перевернуть" onClick={() => setFlipped(f => !f)}><RotateCcw /></button>
          </div>

          {/* Branch picker */}
          {candidateNodes.length > 0 && (
            <div className="mt-3 rounded-lg border-2 p-3" style={{ borderColor: '#f6f669' }}>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Выберите продолжение ({currentGame.turn() === 'w' ? 'Белые' : 'Чёрные'}):
              </p>
              <div className="flex flex-wrap gap-2">
                {candidateNodes.map((node, i) => (
                  <button key={node.san} className="outline-button px-3 py-1 text-sm font-semibold"
                    style={i === 0 ? { borderColor: BOARD_DARK, color: BOARD_DARK } : {}}
                    onClick={() => makeMove(node.san)}>
                    {i === 0 ? '★ ' : ''}{Math.floor(path.length / 2) + 1}{path.length % 2 === 0 ? '.' : '...'}{node.san}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Turn */}
          <div className="mt-3 flex items-center gap-2">
            <div className="size-4 rounded-full border-2" style={{ backgroundColor: currentGame.turn() === 'w' ? '#fff' : '#111', borderColor: BOARD_DARK }} />
            <span className="text-xs text-muted-foreground">
              {currentGame.isGameOver()
                ? (currentGame.isCheckmate() ? 'Мат!' : 'Партия завершена')
                : currentGame.isCheck()
                  ? (currentGame.turn() === 'w' ? 'Белым шах!' : 'Чёрным шах!')
                  : currentGame.turn() === 'w' ? 'Ходят белые' : 'Ходят чёрные'}
            </span>
          </div>
        </div>

        {/* Sidebar column */}
        <div className="flex flex-col gap-4">
          <label className="drop-zone">
            <Upload /><b>Загрузить PGN-файл</b><span>Варианты в скобках поддерживаются</span>
            <input className="sr-only" type="file" accept=".pgn,.txt"
              onChange={e => { const f = e.target.files?.[0]; if (f) { const r = new FileReader(); r.onload = () => load(String(r.result)); r.readAsText(f) } }} />
          </label>

          <label className="field">Или вставьте PGN
            <textarea className="textarea min-h-32 font-mono text-xs"
              placeholder={'1. e4 e5 (1... c5 2. Nf3) 2. Nf3 Nc6'}
              onBlur={e => { if (e.target.value) load(e.target.value) }} />
          </label>

          {error && <p className="text-sm text-destructive">{error}</p>}

          {/* Move tree list */}
          <div className="rounded-md border p-3">
            <div className="mb-2 flex items-center justify-between">
              <b className="text-sm">Дерево ходов</b>
              <span className="text-[10px] text-muted-foreground">ПКМ — удалить · 💬 — комментарий</span>
            </div>
            <div className="flex flex-wrap items-start gap-x-0.5 gap-y-1 leading-7">
              {tree.children.length === 0
                ? <span className="text-xs text-muted-foreground">Загрузите PGN или двигайте фигуры</span>
                : <TreeNodesRenderer 
                    nodes={tree.children} 
                    currentPath={[]} 
                    activePath={path} 
                    onSelect={setPath} 
                    onContextMenu={(e, nodePath) => setCtxMenu({ x: e.clientX, y: e.clientY, nodePath })}
                    onComment={(nodePath, node) => { setEditComment(nodePath); setCommentDraft(node?.comment ?? '') }} 
                  />
              }
            </div>
          </div>

          <button className="outline-button w-full"
            onClick={() => { setTree({ children: [], comment: '' }); setPath([]); setSelected(null); setError('') }}>
            Сбросить позицию
          </button>
        </div>
      </section>
    </>
  )
}

function Openings() { return <PgnBoard /> }

// ─── Modules Editor (Teacher) ─────────────────────────────────────────────────

const ALL_TAGS = ['Дебют', 'Миттельшпиль', 'Эндшпиль', 'Тактика', 'Стратегия', 'Другое']

function ModulesEditor({ modules, setModules, students, notify }: {
  modules: Module[]
  setModules: React.Dispatch<React.SetStateAction<Module[]>>
  students: Student[]
  notify: (s: string) => void
}) {
  const [openId, setOpenId] = useState<string | null>(null)
  const [editModule, setEditModule] = useState<Partial<Module> & { id?: string } | null>(null)
  const [editLesson, setEditLesson] = useState<{ moduleId: string; lesson?: Lesson } | null>(null)
  const [accessModuleId, setAccessModuleId] = useState<string | null>(null)
  const [accesses, setAccesses] = useState<{ id: string; user: { id: string; name: string; email: string } }[]>([])

  const saveModule = async () => {
    if (!editModule?.title?.trim()) return
    const isNew = !editModule.id
    const url = isNew ? '/api/modules' : `/api/modules/${editModule.id}`
    const method = isNew ? 'POST' : 'PUT'
    const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(editModule) })
    if (res.ok) {
      const saved = await res.json()
      setModules(prev => isNew ? [saved, ...prev] : prev.map(m => m.id === saved.id ? { ...m, ...saved } : m))
      notify(isNew ? 'Модуль создан!' : 'Модуль сохранён!')
      setEditModule(null)
    } else notify('Ошибка при сохранении')
  }

  const deleteModule = async (id: string) => {
    if (!confirm('Удалить модуль вместе со всеми уроками?')) return
    const res = await fetch(`/api/modules/${id}`, { method: 'DELETE' })
    if (res.ok) { setModules(prev => prev.filter(m => m.id !== id)); notify('Модуль удалён') }
    else notify('Ошибка при удалении')
  }

  const saveLesson = async () => {
    if (!editLesson || !editLesson.lesson?.title?.trim()) return
    const isNew = !editLesson.lesson.id || editLesson.lesson.id === ''
    const url = isNew ? `/api/modules/${editLesson.moduleId}/lessons` : `/api/lessons/${editLesson.lesson.id}`
    const method = isNew ? 'POST' : 'PUT'
    const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(editLesson.lesson) })
    if (res.ok) {
      const saved = await res.json()
      setModules(prev => prev.map(m => {
        if (m.id !== editLesson.moduleId) return m
        const lessons = isNew ? [...m.lessons, saved] : m.lessons.map(l => l.id === saved.id ? saved : l)
        return { ...m, lessons }
      }))
      notify(isNew ? 'Урок добавлен!' : 'Урок сохранён!')
      setEditLesson(null)
    } else notify('Ошибка при сохранении урока')
  }

  const deleteLesson = async (moduleId: string, lessonId: string) => {
    if (!confirm('Удалить урок?')) return
    const res = await fetch(`/api/lessons/${lessonId}`, { method: 'DELETE' })
    if (res.ok) {
      setModules(prev => prev.map(m => m.id === moduleId ? { ...m, lessons: m.lessons.filter(l => l.id !== lessonId) } : m))
      notify('Урок удалён')
    } else notify('Ошибка при удалении урока')
  }

  const openAccess = async (moduleId: string) => {
    setAccessModuleId(moduleId)
    const res = await fetch(`/api/modules/${moduleId}/access`)
    if (res.ok) setAccesses(await res.json())
  }

  const grantAccess = async (userId: string) => {
    if (!accessModuleId) return
    const res = await fetch(`/api/modules/${accessModuleId}/access`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId }) })
    if (res.ok) {
      const student = students.find(s => s.id === userId)
      if (student) setAccesses(prev => [...prev, { id: Date.now().toString(), user: { id: userId, name: student.name, email: (student as any).email || '' } }])
      notify('Доступ выдан!')
    } else notify('Ошибка при выдаче доступа')
  }

  const revokeAccess = async (userId: string) => {
    if (!accessModuleId) return
    const res = await fetch(`/api/modules/${accessModuleId}/access`, { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId }) })
    if (res.ok) { setAccesses(prev => prev.filter(a => a.user.id !== userId)); notify('Доступ отозван') }
    else notify('Ошибка')
  }

  return (
    <>
      <Head over="Программы" title="Учебные модули" text="Создавайте модули с видеоуроками и управляйте доступом." />
      <button className="button w-fit" onClick={() => setEditModule({ title: '', description: '', tags: [], visibility: 'ALL', price: 0 })}>
        <Plus className="size-4" />Создать модуль
      </button>

      <div className="mt-6 flex flex-col gap-4">
        {modules.length === 0 && <p className="text-muted-foreground">Пока нет модулей. Создайте первый!</p>}
        {modules.map(m => (
          <div key={m.id} className="rounded-lg border overflow-hidden">
            <div className="flex items-center gap-3 p-4 bg-muted/30">
              <button className="flex-1 text-left font-semibold flex items-center gap-2" onClick={() => setOpenId(openId === m.id ? null : m.id)}>
                <ChevronRight className={`size-4 shrink-0 transition-transform ${openId === m.id ? 'rotate-90' : ''}`} />
                {m.title}
                <span className="badge text-xs ml-1">{m.visibility === 'ALL' ? 'Всем' : m.visibility === 'PAID' ? `${m.price.toLocaleString()} ₽` : 'По спискам'}</span>
                {m.tags.map(t => <span key={t} className="badge text-xs bg-blue-50 text-blue-600">{t}</span>)}
              </button>
              <button className="icon-button" onClick={() => openAccess(m.id)} title="Управление доступом"><Users className="size-4" /></button>
              <button className="icon-button" onClick={() => setEditModule({ ...m })} title="Редактировать"><Pencil className="size-4" /></button>
              <button className="icon-button text-red-500 hover:bg-red-50" onClick={() => deleteModule(m.id)} title="Удалить"><Trash2 className="size-4" /></button>
            </div>
            {openId === m.id && (
              <div className="p-4 flex flex-col gap-2">
                {m.description && <div data-color-mode="light" className="mb-2"><MarkdownPreview source={m.description} style={{ backgroundColor: 'transparent', fontSize: '0.875rem' }} /></div>}
                {m.lessons.map(l => (
                  <div key={l.id} className="flex items-center gap-3 rounded-md border p-3">
                    <span className="flex-1">
                      <p className="text-sm font-medium">{l.title}</p>
                      <div className="flex gap-2 mt-1">
                        {l.videoUrl && <a href={l.videoUrl} target="_blank" rel="noreferrer" className="text-xs text-blue-600 hover:underline flex items-center gap-1"><Video className="size-3" />Видео</a>}
                        {l.fileUrl && <a href={l.fileUrl} target="_blank" rel="noreferrer" className="text-xs text-green-600 hover:underline flex items-center gap-1"><ExternalLink className="size-3" />Файл</a>}
                      </div>
                    </span>
                    <button className="icon-button" onClick={() => setEditLesson({ moduleId: m.id, lesson: { ...l } })}><Pencil className="size-4" /></button>
                    <button className="icon-button text-red-500 hover:bg-red-50" onClick={() => deleteLesson(m.id, l.id)}><Trash2 className="size-4" /></button>
                  </div>
                ))}
                <button className="outline-button w-fit mt-2" onClick={() => setEditLesson({ moduleId: m.id, lesson: { id: '', title: '', videoUrl: '', fileUrl: '', order: m.lessons.length, moduleId: m.id } })}>
                  <Plus className="size-4" />Добавить урок
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Module modal */}
      {editModule !== null && (
        <Modal title={editModule.id ? 'Редактировать модуль' : 'Создать модуль'} close={() => setEditModule(null)}>
          <div className="flex flex-col gap-4">
            <label className="field">Название модуля
              <input className="input" value={editModule.title || ''} onChange={e => setEditModule(p => ({ ...p!, title: e.target.value }))} placeholder="Например: Эндшпиль для начинающих" />
            </label>
            <div className="field">
              <span className="text-sm font-medium">Описание</span>
              <div data-color-mode="light" className="mt-1 border rounded-md overflow-hidden">
                <MDEditor value={editModule.description || ''} onChange={val => setEditModule(p => ({ ...p!, description: val || '' }))} textareaProps={{ placeholder: "Кратко о содержании..." }} height={200} />
              </div>
            </div>
            <div className="field">
              <span className="text-sm font-medium">Теги</span>
              <div className="flex flex-wrap gap-2 mt-1">
                {ALL_TAGS.map(tag => {
                  const sel = editModule.tags?.includes(tag)
                  return <button key={tag} type="button" onClick={() => setEditModule(p => ({ ...p!, tags: sel ? (p!.tags || []).filter(t => t !== tag) : [...(p!.tags || []), tag] }))} className={`badge cursor-pointer ${sel ? 'bg-primary text-primary-foreground' : ''}`}>{tag}</button>
                })}
              </div>
            </div>
            <label className="field">Видимость
              <select className="input" value={editModule.visibility || 'ALL'} onChange={e => setEditModule(p => ({ ...p!, visibility: e.target.value as any }))}>
                <option value="ALL">🌐 Всем (бесплатно)</option>
                <option value="PREMIUM">👑 Только с премиумом</option>
                <option value="PAID">💳 По оплате</option>
                <option value="STUDENTS">👤 Конкретным ученикам</option>
              </select>
            </label>
            <label className="field">Цена (₽)
              <input className="input" type="number" min={0} value={editModule.price || 0} onChange={e => setEditModule(p => ({ ...p!, price: Number(e.target.value) }))} disabled={editModule.visibility !== 'PAID'} />
              {editModule.visibility !== 'PAID' && <span className="text-xs text-muted-foreground mt-1">Цена учитывается только при видимости «По оплате»</span>}
            </label>
            <div className="flex gap-2">
              <button className="button flex-1" onClick={saveModule} disabled={!editModule.title?.trim()}>Сохранить</button>
              <button className="outline-button flex-1" onClick={() => setEditModule(null)}>Отмена</button>
            </div>
          </div>
        </Modal>
      )}

      {/* Lesson modal */}
      {editLesson !== null && (
        <Modal title={editLesson.lesson?.id ? 'Редактировать урок' : 'Добавить урок'} close={() => setEditLesson(null)}>
          <div className="flex flex-col gap-4">
            <label className="field">Название урока
              <input className="input" value={editLesson.lesson?.title || ''} onChange={e => setEditLesson(p => ({ ...p!, lesson: { ...p!.lesson!, title: e.target.value } }))} placeholder="Например: Урок 1 — Правило квадрата" />
            </label>
            <label className="field">Ссылка на YouTube
              <input className="input" value={editLesson.lesson?.videoUrl || ''} onChange={e => setEditLesson(p => ({ ...p!, lesson: { ...p!.lesson!, videoUrl: e.target.value } }))} placeholder="https://youtube.com/watch?v=..." />
            </label>
            <label className="field">Ссылка на файл (PDF / PGN / Диск)
              <input className="input" value={editLesson.lesson?.fileUrl || ''} onChange={e => setEditLesson(p => ({ ...p!, lesson: { ...p!.lesson!, fileUrl: e.target.value } }))} placeholder="https://drive.google.com/..." />
            </label>
            <div className="flex gap-2">
              <button className="button flex-1" onClick={saveLesson} disabled={!editLesson.lesson?.title?.trim()}>Сохранить</button>
              <button className="outline-button flex-1" onClick={() => setEditLesson(null)}>Отмена</button>
            </div>
          </div>
        </Modal>
      )}

      {/* Access modal */}
      {accessModuleId !== null && (
        <Modal title="Управление доступом" close={() => setAccessModuleId(null)}>
          <div className="flex flex-col gap-4">
            <p className="text-sm text-muted-foreground">Добавьте учеников, которые получат доступ к этому модулю.</p>
            <select className="input" onChange={e => { if (e.target.value) { grantAccess(e.target.value); e.target.value = '' } }}>
              <option value="">— Выбрать ученика —</option>
              {students.filter(s => !accesses.some(a => a.user.id === s.id)).map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
            <div className="flex flex-col gap-2">
              {accesses.length === 0 && <p className="text-sm text-muted-foreground">Пока никто не добавлен.</p>}
              {accesses.map(a => (
                <div key={a.id} className="flex items-center justify-between rounded-md border p-3">
                  <span className="text-sm font-medium">{a.user.name || a.user.email}</span>
                  <button className="icon-button text-red-500 hover:bg-red-50" onClick={() => revokeAccess(a.user.id)}><X className="size-4" /></button>
                </div>
              ))}
            </div>
          </div>
        </Modal>
      )}
    </>
  )
}

// ─── My Library (only purchased) ──────────────────────────────────────────────

function MyLibrary({ modules, purchases, courses, onOpen }: {
  modules: Module[]
  purchases: any[]
  courses: Course[]
  onOpen: (id: string | number) => void
}) {
  const [search, setSearch] = useState('')
  const [analyses, setAnalyses] = useState<any[]>([])
  const [activeAnalysis, setActiveAnalysis] = useState<any>(null)

  useEffect(() => {
    fetch('/api/analysis')
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) {
          // For students, we only want to show completed analyses in the library
          setAnalyses(data.filter(a => a.status === 'COMPLETED'))
        }
      })
      .catch(() => {})
  }, [])

  const approvedPurchases = purchases.filter(p => p.status === 'APPROVED' || p.status === 'PAID')
  const purchasedCourseIds = approvedPurchases.map(p => p.courseId).filter(Boolean)
  const purchasedModuleIds = approvedPurchases.map(p => p.moduleId).filter(Boolean)

  const ownedCourses = courses.filter(c => purchasedCourseIds.includes(c.id))
  const accessibleModules = modules.filter(m => m.hasAccess || m.visibility === 'ALL')

  const filteredModules = accessibleModules.filter(m => 
    m.title.toLowerCase().includes(search.toLowerCase()) || 
    m.tags.some(t => t.toLowerCase().includes(search.toLowerCase()))
  )

  const isEmpty = ownedCourses.length === 0 && accessibleModules.length === 0 && analyses.length === 0

  if (activeAnalysis) {
    return (
      <>
        <div className="flex items-center gap-4 mb-6">
          <button className="icon-button" onClick={() => setActiveAnalysis(null)}>
            <ChevronLeft className="size-5" />
          </button>
          <h2 className="text-xl font-bold">{activeAnalysis.title || 'Разбор партии'}</h2>
        </div>
        <div className="flex flex-col md:flex-row gap-6">
          {activeAnalysis.answerVideo && (
            <div className="w-full md:w-1/3 aspect-[9/16] bg-black rounded-xl overflow-hidden shadow-lg border">
              <iframe 
                src={activeAnalysis.answerVideo.replace('youtube.com/shorts/', 'youtube.com/embed/').replace('youtu.be/', 'youtube.com/embed/')} 
                className="w-full h-full"
                allowFullScreen
              />
            </div>
          )}
          <div className="flex-1 flex flex-col gap-4">
            <div className="bg-card border rounded-xl p-6 shadow-sm">
              <h3 className="text-lg font-semibold mb-2">Комментарий тренера</h3>
              <p className="whitespace-pre-wrap text-muted-foreground">{activeAnalysis.teacherComment || 'Нет комментариев.'}</p>
            </div>
            
            {activeAnalysis.answerPgn && (
              <div className="bg-card border rounded-xl p-6 shadow-sm flex flex-col items-center">
                <h3 className="text-lg font-semibold mb-4 self-start">PGN с разбором</h3>
                <div className="w-full max-w-sm aspect-square mb-4">
                  <Chessboard options={{ position: 'start' }} />
                </div>
                <div className="w-full bg-muted/30 p-3 rounded-lg border font-mono text-xs whitespace-pre-wrap overflow-y-auto max-h-48">
                  {activeAnalysis.answerPgn}
                </div>
              </div>
            )}
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      <Head over="Библиотека" title="Мои курсы" text="Все материалы, к которым у вас есть доступ." />
      {isEmpty && (
        <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
          <BookOpen className="size-12 text-muted-foreground" />
          <p className="text-muted-foreground">У вас пока нет купленных курсов и разборов.</p>
          <p className="text-sm text-muted-foreground">Перейдите в <b>Магазин</b>, чтобы приобрести курс или закажите разбор в Настройках.</p>
        </div>
      )}

      {analyses.length > 0 && (
        <div className="mb-8">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2"><FileSearch className="size-5" /> Мои разборы партий</h3>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {analyses.map(a => (
              <div key={a.id} className="rounded-lg border bg-card hover:shadow-md transition-shadow p-5 flex flex-col cursor-pointer" onClick={() => setActiveAnalysis(a)}>
                <div className="flex items-center gap-2 mb-2">
                  <span className="badge bg-green-50 text-green-600 text-xs">Готово</span>
                  <span className="text-xs text-muted-foreground">{new Date(a.updatedAt).toLocaleDateString('ru-RU')}</span>
                </div>
                <h4 className="font-bold text-lg mb-1">{a.title || 'Разбор партии'}</h4>
                <p className="text-sm text-muted-foreground line-clamp-2 flex-1">{a.teacherComment || 'Видеоразбор от тренера'}</p>
                <div className="mt-4 pt-4 border-t flex items-center text-primary text-sm font-medium">
                  Смотреть разбор <ChevronRight className="size-4 ml-1" />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {(ownedCourses.length > 0 || accessibleModules.length > 0) && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {/* Owned debut courses */}
          {ownedCourses.map(c => (
            <div key={`c-${c.id}`} className="rounded-lg border flex flex-col overflow-hidden">
              {c.imageUrl && <img src={c.imageUrl} alt={c.name} className="w-full aspect-video object-cover" />}
              <div className="p-5 flex flex-col flex-1">
                <div className="flex flex-wrap gap-1 mb-2">
                  <span className="badge bg-blue-50 text-blue-600 text-xs">Дебют</span>
                  <span className="badge border border-green-200 bg-transparent text-green-700 dark:border-green-800 dark:text-green-400 font-medium"><CheckCircle2 className="size-3 mr-1" />Куплен</span>
                </div>
                <h3 className="font-semibold">{c.name}</h3>
                {c.description && <p className="mt-1 text-sm text-muted-foreground line-clamp-3">{c.description}</p>}
                <div className="mt-4">
                  <button className="button w-full" onClick={() => onOpen(c.id)}>Открыть<ChevronRight className="size-4" /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      <div className="flex flex-col gap-4 mt-8">
        {accessibleModules.length > 0 && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-2">
            <h3 className="text-lg font-semibold flex items-center gap-2"><BookOpen className="size-5" /> Учебные модули</h3>
            <div className="relative max-w-sm w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Поиск по названию или тегам..." className="input pl-9 w-full" />
            </div>
          </div>
        )}
        {/* Accessible modules as wide horizontal cards */}
        {filteredModules.map(m => (
          <div key={`m-${m.id}`} className="rounded-lg border flex flex-col sm:flex-row overflow-hidden items-stretch hover:shadow-md transition-shadow">
            <div className="w-full sm:w-48 bg-muted/30 flex items-center justify-center p-6 border-b sm:border-b-0 sm:border-r">
              <BookOpen className="size-10 text-purple-400" />
            </div>
            <div className="p-5 flex flex-col flex-1 justify-between gap-4 sm:flex-row sm:items-center">
              <div className="flex-1">
                <div className="flex flex-wrap gap-2 mb-2">
                  <span className="badge bg-purple-50 text-purple-600 text-xs">Модуль</span>
                  {m.visibility === 'ALL'
                    ? <span className="badge border border-green-200 bg-transparent text-green-700 dark:border-green-800 dark:text-green-400 font-medium"><Unlock className="size-3 mr-1" />Бесплатно</span>
                    : <span className="badge border border-green-200 bg-transparent text-green-700 dark:border-green-800 dark:text-green-400 font-medium"><CheckCircle2 className="size-3 mr-1" />Открыт</span>}
                  {m.tags.map(t => <span key={t} className="badge bg-blue-50 text-blue-600 text-xs">{t}</span>)}
                </div>
                <h3 className="text-lg font-semibold">{m.title}</h3>
                {m.description && <p className="mt-1 text-sm text-muted-foreground line-clamp-2">{m.description}</p>}
                <p className="mt-2 text-xs font-medium text-muted-foreground">{m.lessons.length} уроков</p>
              </div>
              <div className="sm:w-32">
                <button className="button w-full h-full sm:h-12" onClick={() => {}}>Открыть<ChevronRight className="size-4" /></button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </>
  )
}

// ─── Shop Section (buy courses and modules) ───────────────────────────────────

function ShopSection({ modules, courses, purchases, purchasedIds, isGuest, notify, onPurchaseCourse, onPurchaseModule, onOpenCourse, onOpenModule }: {
  modules: Module[]
  courses: Course[]
  purchases: any[]
  purchasedIds: any[]
  isGuest: boolean
  notify: (s: string) => void
  onPurchaseCourse: (id: string | number) => void
  onPurchaseModule: (id: string) => void
  onOpenCourse: (id: string | number) => void
  onOpenModule: (id: string) => void
}) {
  const [detailId, setDetailId] = useState<string | number | null>(null)
  const detail = courses.find(c => c.id === detailId)

  const purchasedModuleIds = purchases
    .filter(p => p.status === 'APPROVED' || p.status === 'PAID')
    .map(p => p.moduleId).filter(Boolean)

  const paidModules = modules.filter(m => m.visibility === 'PAID')

  return (
    <>
      <Head over="Магазин" title="Купить курсы и модули" text="Приобретайте дебютные курсы и учебные модули." />

      {/* Paid modules */}
      {paidModules.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2"><BookOpen className="size-5" /> Учебные модули</h3>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {paidModules.map(m => {
              const owned = purchasedModuleIds.includes(m.id)
              return (
                <div key={m.id} className="rounded-lg border flex flex-col overflow-hidden">
                  <div className="p-5 flex flex-col flex-1">
                    <div className="flex flex-wrap gap-1 mb-2">
                      <span className="badge bg-purple-50 text-purple-600 text-xs">Модуль</span>
                      <span className="badge bg-amber-50 text-amber-700">💳 {m.price.toLocaleString()} ₽</span>
                      {m.tags.map(t => <span key={t} className="badge bg-blue-50 text-blue-600 text-xs">{t}</span>)}
                    </div>
                    <h3 className="font-semibold">{m.title}</h3>
                    {m.description && <p className="mt-1 text-sm text-muted-foreground line-clamp-3">{m.description}</p>}
                    <p className="mt-2 text-xs text-muted-foreground">{m.lessons.length} уроков</p>
                    <div className="mt-4">
                      {owned
                        ? <button className="button w-full" onClick={() => onOpenModule(m.id)}>Открыть<ChevronRight className="size-4 ml-1" /></button>
                        : <button className="button w-full" onClick={() => { if (isGuest) { notify('Зарегистрируйтесь для покупки.'); return }; onPurchaseModule(m.id) }}><LockKeyhole className="size-4 mr-1" />Купить доступ</button>}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {paidModules.length === 0 && (
        <p className="text-muted-foreground">В магазине пока нет товаров.</p>
      )}
    </>
  )
}

// ─── Modules View (Student/Guest) ─────────────────────────────────────────────


function ModulesView({ modules, setModules: _, onPurchase, isGuest, notify, purchases = [], courses = [], onPurchaseCourse, onOpenCourse }: {
  modules: Module[]
  setModules: React.Dispatch<React.SetStateAction<Module[]>>
  onPurchase: (id: string) => void
  isGuest: boolean
  notify: (s: string) => void
  purchases?: any[]
  courses?: Course[]
  onPurchaseCourse?: (id: string | number) => void
  onOpenCourse?: (id: string | number) => void
}) {
  const [openId, setOpenId] = useState<string | null>(null)
  const [activeTag, setActiveTag] = useState<string | null>(null)

  // Compute purchased course IDs
  const purchasedCourseIds = purchases
    .filter(p => p.status === 'APPROVED' || p.status === 'PAID')
    .map(p => p.courseId)
    .filter(Boolean)

  const ownedCourses = (courses || []).filter(c => purchasedCourseIds.includes(c.id))
  const accessibleModules = modules.filter(m => m.hasAccess || m.visibility === 'ALL')

  const allTags = Array.from(new Set([
    ...accessibleModules.flatMap(m => m.tags),
    ...(ownedCourses.length > 0 ? ['Дебют'] : [])
  ]))

  const filtered = activeTag
    ? activeTag === 'Дебют'
      ? []
      : accessibleModules.filter(m => m.tags.includes(activeTag))
    : accessibleModules

  const filteredCourses = activeTag === 'Дебют' || !activeTag ? ownedCourses : []

  const hasAnyContent = accessibleModules.length > 0 || ownedCourses.length > 0

  return (
    <>
      <Head over="Программы" title="Модули" text="Видеоуроки по темам. Откройте бесплатные или приобретите платные." />

      {allTags.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          <button className={`badge cursor-pointer ${!activeTag ? 'bg-primary text-primary-foreground' : ''}`} onClick={() => setActiveTag(null)}>Все</button>
          {allTags.map(tag => (
            <button key={tag} className={`badge cursor-pointer ${activeTag === tag ? 'bg-primary text-primary-foreground' : ''}`} onClick={() => setActiveTag(activeTag === tag ? null : tag)}>{tag}</button>
          ))}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {!hasAnyContent && <p className="text-muted-foreground col-span-3">Модулей пока нет.</p>}

        {/* Purchased / buyable courses shown as module cards */}
        {filteredCourses.map(c => {
          const isPurchased = purchasedCourseIds.includes(c.id)
          return (
            <div key={`course-${c.id}`} className="rounded-lg border flex flex-col overflow-hidden">
              {c.imageUrl && <img src={c.imageUrl} alt={c.name} className="w-full aspect-video object-cover" />}
              <div className="p-5 flex flex-col flex-1">
                <div className="flex flex-wrap gap-1 mb-2">
                  <span className="badge bg-blue-50 text-blue-600 text-xs">Дебют</span>
                  {isPurchased
                    ? <span className="badge bg-green-50 text-green-700">✅ Куплен</span>
                    : c.price > 0
                      ? <span className="badge bg-amber-50 text-amber-700">💳 {c.price.toLocaleString()} ₽</span>
                      : <span className="badge bg-green-50 text-green-700">🌐 Бесплатно</span>}
                </div>
                <h3 className="font-semibold">{c.name}</h3>
                {c.description && <p className="mt-1 text-sm text-muted-foreground line-clamp-3">{c.description}</p>}
                <div className="mt-4 flex gap-2">
                  {isPurchased ? (
                    <button className="button flex-1" onClick={() => onOpenCourse?.(c.id)}>Открыть<ChevronRight className="size-4" /></button>
                  ) : c.price > 0 ? (
                    <button className="button flex-1" onClick={() => { if (isGuest) { notify('Пожалуйста, зарегистрируйтесь для покупки.'); return }; onPurchaseCourse?.(c.id) }}>
                      <LockKeyhole className="size-4" />Купить доступ
                    </button>
                  ) : (
                    <button className="button flex-1" onClick={() => onOpenCourse?.(c.id)}>Открыть<ChevronRight className="size-4" /></button>
                  )}
                </div>
              </div>
            </div>
          )
        })}

        {/* Regular modules */}
        {filtered.map(m => {
          const canOpen = m.hasAccess || m.visibility === 'ALL'
          const isOpen = openId === m.id && canOpen
          return (
            <div key={m.id} className="rounded-lg border flex flex-col overflow-hidden">
              <div className="p-5 flex flex-col flex-1">
                <div className="flex flex-wrap gap-1 mb-2">
                  {m.visibility === 'PAID' && !m.hasAccess && <span className="badge bg-amber-50 text-amber-700">💳 {m.price.toLocaleString()} ₽</span>}
                  {m.visibility === 'STUDENTS' && !m.hasAccess && <span className="badge bg-slate-100 text-slate-600">🔒 По приглашению</span>}
                  {m.visibility === 'ALL' && <span className="badge bg-green-50 text-green-700">🌐 Бесплатно</span>}
                  {m.hasAccess && m.visibility !== 'ALL' && <span className="badge bg-green-50 text-green-700">✅ Открыто</span>}
                  {m.tags.map(t => <span key={t} className="badge bg-blue-50 text-blue-600 text-xs">{t}</span>)}
                </div>
                <h3 className="font-semibold">{m.title}</h3>
                {m.description && <div data-color-mode="light" className="mt-2 line-clamp-3 text-sm text-muted-foreground"><MarkdownPreview source={m.description} style={{ backgroundColor: 'transparent', fontSize: '0.875rem' }} /></div>}
                <p className="mt-3 text-xs font-medium">{m.lessons.length} уроков</p>
                <div className="mt-4">
                  {canOpen
                    ? <button className="button w-full" onClick={() => setOpenId(isOpen ? null : m.id)}>
                        {isOpen ? 'Свернуть' : 'Открыть'}<ChevronRight className={`size-4 transition-transform ${isOpen ? 'rotate-90' : ''}`} />
                      </button>
                    : m.visibility === 'PAID'
                      ? <button className="button w-full" onClick={() => {
                          if (isGuest) { notify('Пожалуйста, зарегистрируйтесь для покупки.'); return }
                          onPurchase(m.id)
                        }}><LockKeyhole className="size-4" />Купить доступ</button>
                      : <button className="outline-button w-full" disabled>🔒 Доступ по приглашению</button>}
                </div>
              </div>
              {isOpen && m.lessons.length > 0 && (
                <div className="border-t p-4 flex flex-col gap-2 bg-muted/20">
                  {m.lessons.map((l, i) => (
                    <div key={l.id} className="flex items-center gap-3 rounded-md border bg-background p-3">
                      <span className="text-xs font-mono text-muted-foreground w-6 shrink-0">{String(i + 1).padStart(2, '0')}</span>
                      <span className="flex-1 text-sm font-medium">{l.title}</span>
                      <div className="flex gap-2">
                        {l.videoUrl && <a href={l.videoUrl} target="_blank" rel="noreferrer" className="icon-button" title="Смотреть видео"><Video className="size-4 text-blue-600" /></a>}
                        {l.fileUrl && <a href={l.fileUrl} target="_blank" rel="noreferrer" className="icon-button" title="Открыть файл"><ExternalLink className="size-4 text-green-600" /></a>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </>
  )
}



// ─── Sales ────────────────────────────────────────────────────────────────────

function Sales({ purchases, onApprove, onReject, onDelete, yoomoneyConfigured }: { purchases: any[]; onApprove: (id: string) => void; onReject: (id: string) => void; onDelete: (id: string) => void; yoomoneyConfigured: boolean | null }) {
  const revenue = purchases.filter(p => p.status === 'APPROVED').reduce((acc, p) => acc + (p.amount ?? p.course?.price ?? p.module?.price ?? 0), 0)
  const pending = purchases.filter(p => p.status === 'PENDING')
  const history = purchases.filter(p => p.status === 'APPROVED' || p.status === 'REJECTED')
  
  return (
    <>
      <Head over="Коммерция" title="Продажи" text="Заявки на оплату и статистика." />
      
      {yoomoneyConfigured === false && (
        <div className="mb-6 p-4 rounded-lg bg-red-50 border border-red-300 text-red-800">
          <p className="font-semibold">⚠️ Внимание: Автоматическая оплата отключена!</p>
          <p className="text-sm">Переменная окружения <code className="bg-red-100 px-1 rounded">YOOMONEY_SECRET</code> не настроена. Автоматические платежи ЮMoney не будут подтверждаться. Пожалуйста, добавьте секретное слово в настройки окружения Vercel.</p>
        </div>
      )}

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Metric label="Выручка"  value={`${revenue.toLocaleString('ru-RU')} ₽`} note="Всего" />
        <Metric label="Заказов"  value={`${purchases.length}`} note={`Ожидают: ${pending.length}`} />
      </section>

      {pending.length > 0 && (
        <div className="mt-8">
          <h3 className="mb-4 text-xl font-semibold text-yellow-600">⏳ Ожидают подтверждения ({pending.length})</h3>
          <div className="flex flex-col gap-3">
            {pending.map(p => (
              <div key={p.id} className="rounded-lg border-2 border-yellow-300 bg-yellow-50/50 p-4">
                <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
                  <div className="flex-1">
                    <p className="font-semibold">{p.user?.name || p.user?.email}</p>
                    <p className="text-sm text-muted-foreground">
                      {p.comment?.startsWith('[Модуль]') ? (
                        <span className="inline-flex items-center gap-1"><span className="badge text-xs bg-blue-100 text-blue-700">Модуль</span> {p.comment.replace('[Модуль] ', '').split(' — ')[0]}</span>
                      ) : p.type === 'SUBSCRIPTION' || p.type === 'PREMIUM' ? (
                        <span className="inline-flex items-center gap-1"><span className="badge text-xs bg-purple-100 text-purple-700">Подписка</span> Premium (30 дней)</span>
                      ) : p.type === 'ANALYSIS' ? (
                        <span className="inline-flex items-center gap-1"><span className="badge text-xs bg-amber-100 text-amber-700">Разбор</span> Анализ партии</span>
                      ) : (
                        <span className="inline-flex items-center gap-1"><span className="badge text-xs">Дебют</span> {p.course?.name}</span>
                      )}
                      {' · '}{(p.amount ?? p.course?.price ?? p.module?.price ?? 0).toLocaleString('ru-RU')} ₽
                      {' · '}<span className="text-[10px] font-mono uppercase bg-slate-100 px-1.5 py-0.5 rounded">{p.paymentMethod === 'yoomoney' ? 'ЮMoney (Авто)' : 'СБП (Ручной)'}</span>
                    </p>
                    {p.senderName && <p className="mt-1 text-sm"><b>Отправитель:</b> {p.senderName}</p>}
                    {p.comment && <p className="mt-0.5 text-sm text-muted-foreground"><b>Комментарий:</b> {p.comment}</p>}
                    <p className="mt-1 text-xs text-muted-foreground">{formatDate(p.createdAt)}</p>
                  </div>
                  <div className="flex gap-2 w-full sm:w-auto">
                    <button className="button w-full sm:w-auto text-sm py-1.5 px-4 bg-red-100 hover:bg-red-200 text-red-700" onClick={() => onReject(p.id)}>❌ Отклонить</button>
                    <button className="button w-full sm:w-auto text-sm py-1.5 px-4 bg-green-600 hover:bg-green-700 text-white" onClick={() => onApprove(p.id)}>✅ Одобрить</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-8">
        <h3 className="mb-4 text-xl font-semibold">История заказов</h3>
        <div className="flex flex-col gap-3">
          {history.map(p => (
            <div key={p.id} className="flex items-center justify-between rounded-lg border p-4">
              <div>
                <p className="font-medium">{p.user?.name || p.user?.email}</p>
                <p className="text-sm text-muted-foreground">
                  {p.comment?.startsWith('[Модуль]') ? (
                    <span className="inline-flex items-center gap-1"><span className="badge text-xs bg-slate-100 text-slate-700">Модуль</span> {p.comment.replace('[Модуль] ', '').split(' — ')[0]}</span>
                  ) : p.type === 'SUBSCRIPTION' || p.type === 'PREMIUM' ? (
                    <span className="inline-flex items-center gap-1"><span className="badge text-xs bg-slate-100 text-slate-700">Подписка</span> Premium</span>
                  ) : p.type === 'ANALYSIS' ? (
                    <span className="inline-flex items-center gap-1"><span className="badge text-xs bg-slate-100 text-slate-700">Разбор</span> Анализ партии</span>
                  ) : (
                    <span className="inline-flex items-center gap-1"><span className="badge text-xs">Дебют</span> {p.course?.name}</span>
                  )}
                  {' · '}{(p.amount ?? p.course?.price ?? p.module?.price ?? 0).toLocaleString('ru-RU')} ₽
                  {' · '}<span className="text-[10px] font-mono uppercase bg-slate-100 px-1 py-0.5 rounded">{p.paymentMethod === 'yoomoney' ? 'ЮMoney' : 'СБП'}</span>
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className={`badge ${p.status === 'APPROVED' ? 'bg-slate-100 text-slate-600' : 'bg-slate-100 text-slate-600'}`}>
                  {p.status === 'APPROVED' ? 'Оплачено' : 'Отклонено'}
                </span>
                <button className="icon-button text-red-500 hover:bg-red-50" onClick={() => onDelete(p.id)} title="Удалить из базы">
                  <Trash2 className="size-4" />
                </button>
              </div>
            </div>
          ))}
          {history.length === 0 && <p className="text-muted-foreground">Пока нет завершённых заказов.</p>}
        </div>
      </div>
    </>
  )
}

// ─── Storefront (Витрина) ─────────────────────────────────────────────────────

function Storefront({ courses, purchasedIds, onPurchase, onOpen }: { courses: Course[]; purchasedIds: number[]; onPurchase: (id: string | number) => void; onOpen?: (id: string | number) => void }) {
  const [detailId, setDetailId] = useState<string | number | null>(null)
  const detail = courses.find(c => c.id === detailId)

  // Only real courses (no more static module placeholders)
  const allItems = [...courses].sort((a, b) => b.createdAt - a.createdAt).map(c => ({
    id: c.id, name: c.name, desc: c.description, price: c.price, img: c.imageUrl
  }))

  return (
    <>
      <Head over="Витрина" title="Все материалы" text="Все доступные курсы и модули — от нового к старому." />
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {allItems.map(item => {
          const owned = purchasedIds.includes(item.id as any)
          return (
            <article key={item.id} className="flex flex-col overflow-hidden rounded-lg border">
              <div className="flex aspect-video items-center justify-center border-b bg-muted/30">
                {item.img ? <img src={item.img} alt={item.name} className="size-full object-cover" /> : <Library className="size-10 text-muted-foreground" />}
              </div>
              <div className="flex flex-1 flex-col p-5">
                <span className="badge w-fit">Курс</span>
                <h3 className="mt-3 font-semibold">{item.name}</h3>
                <p className="mt-1 flex-1 text-sm text-muted-foreground line-clamp-2">{item.desc}</p>
                <div className="mt-4">
                  {item.price > 0 && !owned && <b className="block mb-2">{item.price.toLocaleString('ru-RU')} ₽</b>}
                  {owned
                    ? <div className="flex gap-2">
                        <button className="outline-button flex-1" onClick={() => setDetailId(item.id)}>Подробнее</button>
                        <button className="button flex-1" onClick={() => onOpen?.(item.id)}>Открыть<ChevronRight /></button>
                      </div>
                    : <div className="flex gap-2">
                        <button className="outline-button flex-1" onClick={() => setDetailId(item.id)}>Подробнее</button>
                        <button className="button flex-1" onClick={() => { if (item.id) onPurchase(item.id) }}><LockKeyhole />Купить</button>
                      </div>}
                </div>
              </div>
            </article>
          )
        })}
      </div>
      {detail && (
        <Modal title={detail.name} close={() => setDetailId(null)}>
          {detail.imageUrl && <img src={detail.imageUrl} alt={detail.name} className="max-h-48 w-full rounded-lg object-cover" />}
          <div data-color-mode="light"><MarkdownPreview source={detail.desc} style={{ backgroundColor: 'transparent' }} /></div>
          <div className="flex items-center justify-between border-t pt-4">
            <span className="text-2xl font-semibold">{detail.price.toLocaleString('ru-RU')} ₽</span>
            {purchasedIds.includes(detail.id)
              ? <span className="badge"><Check className="size-3" />Куплен</span>
              : <button className="button" onClick={() => { onPurchase(detail.id); setDetailId(null) }}><LockKeyhole />Оплатить</button>}
          </div>
        </Modal>
      )}
    </>
  )
}

// ─── Opening Courses (CRUD) ───────────────────────────────────────────────────

type CourseForm = { name: string; description: string; price: string; imageUrl: string; pgn: string; isPremium: boolean }

function OpeningCourses({ courses, isTeacher, purchasedIds, onPurchase, onOpen, onAdd, onUpdate, onDelete, notify }: {
  courses: Course[]; isTeacher: boolean; purchasedIds: number[]
  onPurchase: (id: string | number) => void
  onOpen?: (id: string | number) => void
  onAdd: (c: Omit<Course, 'id' | 'createdAt'>) => void
  onUpdate: (id: string | number, u: Partial<Course>) => void
  onDelete: (id: string | number) => void
  notify: (s: string) => void
}) {
  const [modal, setModal] = useState<null | 'add' | 'detail' | string | number>(null)
  const [detailId, setDetailId] = useState<string | number | null>(null)
  const [form, setForm] = useState<CourseForm>({ name: '', description: '', price: '', imageUrl: '', pgn: '', isPremium: false })
  const fileRef = useRef<HTMLInputElement>(null)
  const pgnFileRef = useRef<HTMLInputElement>(null)

  const sorted = [...courses].sort((a, b) => b.createdAt - a.createdAt)
  const detailCourse = courses.find(c => c.id === detailId)

  function openAdd() { setForm({ name: '', description: '', price: '', imageUrl: '', pgn: '', isPremium: false }); setModal('add') }
  function openEdit(c: Course) { setForm({ name: c.name, description: c.description, price: String(c.price), imageUrl: c.imageUrl ?? '', pgn: c.pgn ?? '', isPremium: !!c.isPremium }); setModal(c.id) }
  async function handleImg(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]; if (!f) return
    const formData = new FormData()
    formData.append('file', f)
    try {
      const res = await fetch('/api/upload', { method: 'POST', body: formData })
      const data = await res.json()
      if (res.ok) setForm(p => ({ ...p, imageUrl: data.url }))
      else notify('Ошибка загрузки: ' + data.error)
    } catch (err) {
      notify('Ошибка загрузки')
    }
  }
  function handleSave() {
    if (!form.name || !form.price) { notify('Заполните название и цену'); return }
    const data = { name: form.name, description: form.description, price: Number(form.price), imageUrl: form.imageUrl, pgn: form.pgn || undefined, isPremium: form.isPremium }
    const isEdit = modal !== 'add' && modal !== 'detail' && modal !== null
    if (modal === 'add') onAdd(data)
    else if (isEdit) onUpdate(modal as string | number, data)
    setModal(null); notify(modal === 'add' ? 'Курс добавлен!' : 'Курс обновлён!')
  }

  return (
    <>
      <Head over={isTeacher ? 'Управление курсами' : 'Каталог'} title="Дебютные курсы"
        text={isTeacher ? 'Создавайте и редактируйте авторские дебютные курсы.' : 'Авторские курсы по дебютам от тренера.'}
        action={isTeacher ? <button className="button" onClick={openAdd}><Plus />Добавить курс</button> : undefined} />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {sorted.map(c => {
          const purchased = purchasedIds.includes(c.id)
          return (
            <article key={c.id} className="flex flex-col overflow-hidden rounded-lg border">
              <div className="flex aspect-video items-center justify-center border-b bg-muted/30">
                {c.imageUrl ? <img src={c.imageUrl} alt={c.name} className="size-full object-cover" /> : <GraduationCap className="size-10 text-muted-foreground" />}
              </div>
              <div className="flex flex-1 flex-col p-5">
                <h3 className="font-semibold flex items-center gap-2">
                  {c.name}
                  {c.isPremium && <Crown className="size-4 text-yellow-500 shrink-0" title="Доступно по подписке Premium" />}
                </h3>
                <div data-color-mode="light" className="mt-2 flex-1 line-clamp-3"><MarkdownPreview source={c.description} style={{ backgroundColor: 'transparent', color: 'var(--muted-foreground)', fontSize: '0.875rem' }} /></div>
                {isTeacher && c.pgn && (
                  <p className="mt-1 text-xs text-green-600">✅ PGN загружен ({c.pgn.split(/(?=\[Event )/).filter(Boolean).length} партий)</p>
                )}
                {isTeacher && !c.pgn && (
                  <p className="mt-1 text-xs text-muted-foreground">⚠️ PGN не загружен</p>
                )}
                <div className="mt-4 flex items-center justify-between">
                  <b className="text-lg">{c.price.toLocaleString('ru-RU')} ₽</b>
                  {purchased && <span className="badge"><Check className="size-3" />Куплен</span>}
                </div>
                <div className="mt-3 flex gap-2">
                  {isTeacher ? (
                    <>
                      <button className="outline-button" onClick={() => openEdit(c)} title="Изменить"><Pencil className="size-4" /></button>
                      <button className="button flex-1" onClick={() => onOpen?.(c.id)}>Просмотр<ChevronRight className="size-4" /></button>
                      <button className="icon-button border rounded-md text-destructive hover:bg-destructive/10 shrink-0" onClick={() => onDelete(c.id)} title="Удалить"><Trash2 className="size-4" /></button>
                    </>
                  ) : (
                    <>
                      <button className="outline-button flex-1" onClick={() => { setDetailId(c.id); setModal('detail') }}>Подробнее</button>
                      {purchased 
                        ? <button className="button flex-1" onClick={() => onOpen?.(c.id)}>Открыть<ChevronRight className="size-4"/></button>
                        : <button className="button flex-1" onClick={() => onPurchase(c.id)}><LockKeyhole className="size-4"/>Купить</button>}
                    </>
                  )}
                </div>
              </div>
            </article>
          )
        })}
      </div>

      {/* Add / Edit modal */}
      {(modal === 'add' || (modal !== null && modal !== 'detail')) && (
        <Modal title={modal === 'add' ? 'Добавить курс' : 'Редактировать курс'} close={() => setModal(null)}>
          <label className="field">Название<input className="input" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Сицилианская защита" /></label>
          <div className="field">
            <span className="text-sm font-medium">Описание</span>
            <div data-color-mode="light" className="mt-1 border rounded-md overflow-hidden">
              <MDEditor value={form.description} onChange={val => setForm(p => ({ ...p, description: val || '' }))} textareaProps={{ placeholder: 'Подробное описание курса...' }} height={200} />
            </div>
          </div>
          <label className="field">Цена (₽)<input className="input" type="number" value={form.price} onChange={e => setForm(p => ({ ...p, price: e.target.value }))} placeholder="4900" /></label>
          <label className="flex items-center gap-2 p-3 border rounded-lg cursor-pointer bg-yellow-500/5 hover:bg-yellow-500/10 transition-colors">
            <input type="checkbox" className="size-5 rounded border-yellow-500 text-yellow-500 focus:ring-yellow-500" checked={form.isPremium} onChange={e => setForm(p => ({ ...p, isPremium: e.target.checked }))} />
            <div className="flex flex-col">
              <span className="font-semibold text-yellow-700 flex items-center gap-1"><Crown className="size-4"/>Доступно по подписке (Premium)</span>
              <span className="text-xs text-muted-foreground">Если включено, подписчики получат этот курс бесплатно. Остальные смогут купить его за цену выше.</span>
            </div>
          </label>
          <div className="field">
            <span>Превью-картинка</span>
            <label className="drop-zone cursor-pointer">
              {form.imageUrl
                ? <img src={form.imageUrl} alt="preview" className="max-h-32 rounded object-contain" />
                : <><ImagePlus className="size-5 text-muted-foreground" /><b>Выбрать изображение</b></>}
              <input ref={fileRef} className="sr-only" type="file" accept="image/*" onChange={handleImg} />
            </label>
          </div>
          <div className="field">
            <span>PGN-база дебютов (файл курса)</span>
            <label className="drop-zone cursor-pointer">
              <Upload className="size-5 text-muted-foreground" />
              <b>{form.pgn ? `✅ PGN загружен (${form.pgn.split(/(?=\[Event )/).filter(Boolean).length} партий)` : 'Загрузить PGN-файл с базой'}</b>
              <span>Ученики смогут просматривать и скачивать этот файл после покупки</span>
              <input ref={pgnFileRef} className="sr-only" type="file" accept=".pgn,.txt"
                onChange={e => { const f = e.target.files?.[0]; if (f) { const r = new FileReader(); r.onload = () => setForm(p => ({ ...p, pgn: String(r.result) })); r.readAsText(f) } }} />
            </label>
            {form.pgn && (
              <textarea className="textarea font-mono text-xs min-h-20 mt-2" value={form.pgn}
                onChange={e => setForm(p => ({ ...p, pgn: e.target.value }))}
                placeholder="Или вставьте PGN вручную..." />
            )}
          </div>
          <button className="button" onClick={handleSave}>{modal === 'add' ? 'Добавить курс' : 'Сохранить изменения'}</button>
        </Modal>
      )}

      {/* Detail modal (student) */}
      {modal === 'detail' && detailCourse && (
        <Modal title={
          <div className="flex items-center gap-2">
            {detailCourse.name}
            {detailCourse.isPremium && <Crown className="size-5 text-yellow-500" title="Доступно по подписке Premium" />}
          </div>
        } close={() => setModal(null)}>
          {detailCourse.imageUrl && <img src={detailCourse.imageUrl} alt={detailCourse.name} className="max-h-52 w-full rounded-lg object-cover" />}
          <div data-color-mode="light" className="text-sm leading-6"><MarkdownPreview source={detailCourse.description} style={{ backgroundColor: 'transparent' }} /></div>
          <div className="flex items-center justify-between border-t pt-5">
            <span className="text-2xl font-semibold">{detailCourse.price.toLocaleString('ru-RU')} ₽</span>
            {purchasedIds.includes(detailCourse.id)
              ? <span className="badge"><Check />Куплен</span>
              : <button className="button" onClick={() => { onPurchase(detailCourse.id); setModal(null) }}><LockKeyhole />Оплатить</button>}
          </div>
        </Modal>
      )}
    </>
  )
}

// ─── Course Viewer ────────────────────────────────────────────────────────────

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
      console.warn('Failed to parse game with mliebelt', e)
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
        } catch (e) {
          // fallback
        }
        
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
    
    const white = parsedGame.tags?.White === '?' ? '' : (parsedGame.tags?.White || '')
    const black = parsedGame.tags?.Black === '?' ? '' : (parsedGame.tags?.Black || '')
    const event = parsedGame.tags?.Event === '?' ? '' : (parsedGame.tags?.Event || 'Партия')
    
    return {
      event,
      white,
      black,
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

function CourseViewer({ course }: { course: Course }) {
  const games = useMemo(() => parsePgnGames(course.pgn ?? ''), [course.pgn])
  const [selectedIdx, setSelectedIdx] = useState(0)
  const [activeMoveId, setActiveMoveId] = useState<string | null>(null)
  const [flipped, setFlipped] = useState(false)
  const [selected, setSelected] = useState<string | null>(null)
  const [dragFrom, setDragFrom] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState<string | null>(null)

  const currentGame = games[selectedIdx]
  
  const currentFen = useMemo(() => {
    if (!currentGame) return 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'
    if (!activeMoveId) return currentGame.startFen
    return currentGame.nodeMap[activeMoveId]?.fen ?? currentGame.startFen
  }, [currentGame, activeMoveId])

  const boardGame = useMemo(() => {
    try { return new Chess(currentFen) } catch { return new Chess() }
  }, [currentFen])

  const candidateNodes = useMemo(() => {
    if (!currentGame) return []
    return Object.values(currentGame.nodeMap).filter(n => n.parentId === activeMoveId)
  }, [currentGame, activeMoveId])

  useEffect(() => { setActiveMoveId(null); setSelected(null) }, [selectedIdx])

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
      if (!currentGame) return
      
      if (e.key === 'ArrowLeft') {
        if (activeMoveId) {
          const node = currentGame.nodeMap[activeMoveId]
          setActiveMoveId(node?.parentId ?? null)
        }
      }
      if (e.key === 'ArrowRight') {
        const candidates = Object.values(currentGame.nodeMap).filter(n => n.parentId === activeMoveId)
        if (candidates.length > 0) setActiveMoveId(candidates[0].id)
      }
      if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
        if (!activeMoveId) return
        const parentId = currentGame.nodeMap[activeMoveId]?.parentId ?? null
        const siblings = Object.values(currentGame.nodeMap).filter(n => n.parentId === parentId)
        if (siblings.length > 1) {
          e.preventDefault()
          const currentIdx = siblings.findIndex(n => n.id === activeMoveId)
          let nextIdx = currentIdx + (e.key === 'ArrowDown' ? 1 : -1)
          if (nextIdx >= siblings.length) nextIdx = 0
          if (nextIdx < 0) nextIdx = siblings.length - 1
          setActiveMoveId(siblings[nextIdx].id)
        }
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [currentGame, activeMoveId])

  if (games.length === 0) {
    return (
      <>
        <Head over="Курс" title={course.name} text="Просмотрщик дебютной базы" />
        <div className="rounded-lg border p-8 text-center text-muted-foreground">
          <p>В этом курсе пока нет PGN-базы. Тренер ещё не загрузил материалы.</p>
        </div>
      </>
    )
  }

  return (
    <>
      <Head over="Курс" title={course.name} text={`${games.length} партий · используйте ← → ↑ ↓ для навигации по ходам`} />
      <div className="flex flex-col xl:flex-row gap-6 items-start">
        {/* Left: Game list */}
        <div className="w-full xl:w-[280px] shrink-0 flex flex-col gap-2">
          <div className="flex items-center justify-between mb-1">
            <p className="text-sm font-semibold">Партии ({games.length})</p>
            {course.pgn && (
              <a
                href={`data:application/x-chess-pgn;charset=utf-8,${encodeURIComponent(course.pgn)}`}
                download={`${course.name}.pgn`}
                className="outline-button text-xs py-1 px-2 h-auto"
              >⬇ Скачать PGN</a>
            )}
          </div>
          <div className="rounded-lg border overflow-hidden max-h-[600px] overflow-y-auto">
            {games.map((g, i) => {
              const label = (g.white || g.black) ? [g.white, g.black].filter(Boolean).join(' - ') : g.event
              return (
                <button
                  key={i}
                  onClick={() => setSelectedIdx(i)}
                  className={`w-full text-left p-3 border-b last:border-0 transition-colors ${i === selectedIdx ? 'bg-primary text-primary-foreground' : 'hover:bg-muted/60'}`}
                >
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-mono w-6 shrink-0 ${i === selectedIdx ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>{i + 1}</span>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{label}</p>
                      {(g.white || g.black) && <p className={`text-xs truncate ${i === selectedIdx ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>{g.event}</p>}
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* Middle: Board + Navigation */}
        <div className="flex-1 w-full max-w-[560px] flex flex-col gap-4 mx-auto xl:mx-0 shrink-0">
          <div className="flex items-center justify-between rounded-lg border p-2 bg-muted/30">
            <div className="flex gap-1">
              <button className="icon-button" onClick={() => setActiveMoveId(null)} title="Начало" disabled={!activeMoveId}>
                <ArrowLeft className="size-3" /><ArrowLeft className="size-3 -ml-2" />
              </button>
              <button className="icon-button" onClick={() => {
                if (activeMoveId) setActiveMoveId(currentGame.nodeMap[activeMoveId]?.parentId ?? null)
              }} disabled={!activeMoveId}>
                <ArrowLeft className="size-4" />
              </button>
            </div>
            <span className="text-xs font-medium text-muted-foreground">
              {!activeMoveId ? 'Начальная позиция' : `Ход: ${currentGame.nodeMap[activeMoveId]?.san ?? ''}`}
            </span>
            <div className="flex gap-1">
              <button className="icon-button" onClick={() => {
                const candidates = Object.values(currentGame.nodeMap).filter(n => n.parentId === activeMoveId)
                if (candidates.length > 0) setActiveMoveId(candidates[0].id)
              }}>
                <ArrowRight className="size-4" />
              </button>
            </div>
          </div>

          <div className="w-full">
            <div className="aspect-square overflow-hidden rounded-md" style={{ border: `3px solid ${BOARD_DARK}` }}>
              <ChessBoard
                game={boardGame}
                selected={selected}
                setSelected={setSelected}
                dragFrom={dragFrom}
                setDragFrom={setDragFrom}
                dragOver={dragOver}
                setDragOver={setDragOver}
                flipped={flipped}
                onMove={() => {}} 
              />
            </div>
            <div className="mt-3 flex items-center gap-2">
              <div className="size-4 rounded-full border-2" style={{ backgroundColor: boardGame.turn() === 'w' ? '#fff' : '#111', borderColor: BOARD_DARK }} />
              <span className="flex-1 text-xs text-muted-foreground">
                {boardGame.turn() === 'w' ? 'Ходят белые' : 'Ходят чёрные'}
              </span>
              <button className="icon-button" onClick={() => setFlipped(f => !f)} title="Перевернуть"><RotateCcw /></button>
            </div>
          </div>
        </div>

        {/* Right: Variations and Move list */}
        <div className="flex-1 w-full min-w-[300px] flex flex-col gap-4">
          {candidateNodes.length > 0 && (
            <div className="rounded-lg border p-3 bg-muted/20">
              <p className="text-xs font-semibold mb-2 text-muted-foreground">Варианты ({candidateNodes.length}):</p>
              <div className="flex flex-col gap-1.5">
                {candidateNodes.map(n => (
                  <button 
                    key={n.id} 
                    onClick={() => setActiveMoveId(n.id)} 
                    className="outline-button text-xs py-2 px-3 h-auto hover:bg-primary hover:text-primary-foreground transition-colors text-left flex gap-2 items-start"
                  >
                    <span className="font-semibold shrink-0">{n.turn === 'w' ? `${n.moveNumber}. ${n.san}` : `${n.moveNumber}... ${n.san}`}</span>
                    {n.comment && <span className="text-muted-foreground italic font-normal line-clamp-2">{n.comment}</span>}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="rounded-lg border p-4 bg-white/50">
            <p className="text-sm font-semibold mb-3">Вся теория</p>
            <div className="text-sm leading-relaxed font-medium max-h-[600px] overflow-y-auto pr-2 break-words">
              {currentGame.rootMoves.length === 0 ? (
                <span className="text-muted-foreground text-sm">Ходы не записаны</span>
              ) : (
                <MoveNodeList nodes={currentGame.rootMoves} activeId={activeMoveId} onSelect={setActiveMoveId} />
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

// ─── Analysis Requests ────────────────────────────────────────────────────────
function AnalysisRequests({ notify }: { notify: (s: string) => void }) {
  const [requests, setRequests] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [activeReqId, setActiveReqId] = useState<string | null>(null)
  
  const [answerPgn, setAnswerPgn] = useState('')
  const [answerVideo, setAnswerVideo] = useState('')
  const [title, setTitle] = useState('')
  const [teacherComment, setTeacherComment] = useState('')

  useEffect(() => {
    fetch('/api/analysis')
      .then(r => r.json())
      .then(data => { if (Array.isArray(data)) setRequests(data) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const handleSubmitAnswer = async (id: string) => {
    try {
      const res = await fetch('/api/analysis', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, title, answerPgn, answerVideo, teacherComment, status: 'COMPLETED' })
      })
      if (res.ok) {
        notify('Ответ успешно отправлен ученику!')
        setRequests(prev => prev.map(r => r.id === id ? { ...r, status: 'COMPLETED', title, answerPgn, answerVideo, teacherComment } : r))
        setActiveReqId(null)
      } else notify('Ошибка сохранения ответа')
    } catch { notify('Ошибка сети') }
  }

  if (loading) return <p className="text-sm text-muted-foreground p-8">Загрузка заявок...</p>

  return (
    <>
      <Head over="Заказы" title="Разборы партий" text="Ученики заказывают разбор партии. Вы можете отправить им проанализированный PGN и ссылку на видеоразбор." />
      <div className="mt-6 flex flex-col gap-4">
        {requests.length === 0 ? (
          <p className="text-sm text-muted-foreground">Нет заявок на разбор.</p>
        ) : requests.map(req => (
          <article key={req.id} className="rounded-xl border p-5">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-lg">{req.user?.name || 'Ученик'}</h3>
              <span className={`badge ${req.status === 'COMPLETED' ? 'bg-green-500/10 text-green-600' : 'bg-yellow-500/10 text-yellow-600'}`}>
                {req.status === 'COMPLETED' ? 'Выполнено' : 'Ожидает разбора'}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">От: {new Date(req.createdAt).toLocaleString('ru-RU')}</p>
            
            <div className="mt-4 p-4 rounded-lg bg-muted/30">
              <p className="text-sm font-semibold mb-2">Исходный PGN:</p>
              <div className="text-xs font-mono whitespace-pre-wrap break-all max-h-32 overflow-y-auto bg-background p-2 rounded border">
                {req.pgn}
              </div>
              
              {req.comment && (
                <div className="mt-4">
                  <p className="text-sm font-semibold mb-1">Вопросы / Комментарий ученика:</p>
                  <p className="text-sm italic">{req.comment}</p>
                </div>
              )}
            </div>

            {req.status === 'COMPLETED' ? (
              <div className="mt-4 border-t pt-4">
                <p className="text-sm font-semibold text-green-600 mb-2">Ответ тренера отправлен:</p>
                {req.title && <p className="text-sm font-bold mb-2">Тема: {req.title}</p>}
                {req.answerVideo && (
                  <a href={req.answerVideo} target="_blank" rel="noreferrer" className="text-sm text-blue-500 underline mb-2 block">Смотреть видеоразбор</a>
                )}
                {req.answerPgn && (
                  <div className="text-xs font-mono whitespace-pre-wrap break-all max-h-32 overflow-y-auto bg-background p-2 rounded border mt-2">
                    {req.answerPgn}
                  </div>
                )}
                {req.teacherComment && (
                  <div className="mt-4 p-3 bg-primary/10 rounded-lg text-sm">
                    <strong>Комментарий тренера:</strong> {req.teacherComment}
                  </div>
                )}
              </div>
            ) : (
              <div className="mt-4 border-t pt-4">
                {activeReqId === req.id ? (
                  <div className="flex flex-col gap-3">
                    <p className="text-sm font-semibold">Ответить ученику:</p>
                    <input 
                      className="input font-bold" 
                      placeholder="Название разбора (например: Защита Каро-Канн, ошибки в миттельшпиле)"
                      value={title}
                      onChange={e => setTitle(e.target.value)}
                    />
                    <textarea 
                      className="input min-h-[100px] font-mono text-xs" 
                      placeholder="Вставьте PGN с вашими комментариями и вариантами..."
                      value={answerPgn}
                      onChange={e => setAnswerPgn(e.target.value)}
                    />
                    <input 
                      className="input" 
                      placeholder="Ссылка на видео (YouTube / Cloud / и т.д.) (необязательно)"
                      value={answerVideo}
                      onChange={e => setAnswerVideo(e.target.value)}
                    />
                    <textarea 
                      className="input min-h-[80px]" 
                      placeholder="Пожелания и текстовый комментарий для ученика"
                      value={teacherComment}
                      onChange={e => setTeacherComment(e.target.value)}
                    />
                    <div className="flex gap-3">
                      <button className="button" onClick={() => handleSubmitAnswer(req.id)}>Отправить ответ</button>
                      <button className="outline-button" onClick={() => setActiveReqId(null)}>Отмена</button>
                    </div>
                  </div>
                ) : (
                  <button 
                    className="button w-full sm:w-auto" 
                    onClick={() => { setActiveReqId(req.id); setAnswerPgn(''); setAnswerVideo('') }}
                  >
                    Взять в работу и отправить ответ
                  </button>
                )}
              </div>
            )}
          </article>
        ))}
      </div>
    </>
  )
}

// ─── Settings ─────────────────────────────────────────────────────────────────

function SettingsPanel({ notify, initialName, isStudent, isAdmin, globalSettings, onPurchaseSubscription, onPurchaseAnalysis }: { notify: (s: string) => void; initialName: string; isStudent: boolean; isAdmin?: boolean; globalSettings?: { subscriptionPrice: number, analysisPrice: number }; onPurchaseSubscription?: () => void; onPurchaseAnalysis?: (pgn: string, comment: string) => void }) {
  const [name, setName] = useState(initialName)
  const [loading, setLoading] = useState(false)
  const [subPrice, setSubPrice] = useState(globalSettings?.subscriptionPrice?.toString() || '300')
  const [anPrice, setAnPrice] = useState(globalSettings?.analysisPrice?.toString() || '70')
  
  const [analysisPgn, setAnalysisPgn] = useState('')
  const [analysisComment, setAnalysisComment] = useState('')
  
  const router = useRouter()

  const handleSave = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name })
      })
      
      if (res.ok) {
        notify('Профиль успешно обновлен!')
        router.refresh()
      } else {
        const err = await res.json()
        notify('Ошибка: ' + err.error)
      }
    } catch (e) {
      notify('Ошибка при сохранении')
    } finally {
      setLoading(false)
    }
  }

  const handleSaveSettings = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscriptionPrice: Number(subPrice), analysisPrice: Number(anPrice) })
      })
      if (res.ok) {
        notify('Глобальные цены сохранены!')
      } else notify('Ошибка сохранения цен')
    } catch { notify('Ошибка сети') }
    finally { setLoading(false) }
  }

  return (
    <>
      <Head over="Управление" title="Настройки профиля" text="Редактирование ваших личных данных и услуг." />
      
      <section className="settings-section">
        <h2>Основные настройки</h2>
        <div className="setting-row">
          <div><b>Ваше имя</b><p>Отображается в кабинете {isStudent ? 'тренера' : 'ученика'}.</p></div>
          <input className="input max-w-xs" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="mt-4">
          <button disabled={loading} className="button" onClick={handleSave}>
            {loading ? 'Сохранение...' : 'Сохранить изменения'}
          </button>
        </div>
      </section>

      {isAdmin && (
        <section className="settings-section mt-8">
          <h2>Глобальные настройки цен</h2>
          <div className="setting-row">
            <div><b>Цена подписки (₽ / мес)</b><p>Стоимость Premium-подписки на месяц.</p></div>
            <input type="number" className="input max-w-xs" value={subPrice} onChange={e => setSubPrice(e.target.value)} />
          </div>
          <div className="setting-row">
            <div><b>Цена разбора партии (₽)</b><p>Стоимость заказа разбора одной партии.</p></div>
            <input type="number" className="input max-w-xs" value={anPrice} onChange={e => setAnPrice(e.target.value)} />
          </div>
          <div className="mt-4">
            <button disabled={loading} className="button" onClick={handleSaveSettings}>
              {loading ? 'Сохранение...' : 'Сохранить цены'}
            </button>
          </div>
        </section>
      )}

      {isStudent && (
        <>
          <section className="settings-section mt-8">
            <h2>Premium Подписка</h2>
            <div className="setting-row">
              <div>
                <b>Доступ к закрытым материалам</b>
                <p>Получите доступ ко всем курсам и урокам по подписке, а также золотую корону в лидерборде. Стоимость: {globalSettings?.subscriptionPrice ?? 300} ₽ в месяц.</p>
              </div>
              <button className="button bg-yellow-500 hover:bg-yellow-600 text-white" onClick={onPurchaseSubscription}>Оформить подписку</button>
            </div>
          </section>

          <section className="settings-section mt-8">
            <h2>Заказать Разбор Партии</h2>
            <div className="flex flex-col gap-4 max-w-2xl mt-4">
              <p className="text-sm text-muted-foreground">Загрузите PGN вашей партии и напишите вопросы тренеру. Тренер пришлет вам PGN с комментариями и видеоразбор! Стоимость: {globalSettings?.analysisPrice ?? 70} ₽.</p>
              
              <textarea 
                className="input min-h-[100px] font-mono text-xs" 
                placeholder="Вставьте PGN партии сюда..."
                value={analysisPgn}
                onChange={e => setAnalysisPgn(e.target.value)}
              />
              <textarea 
                className="input min-h-[80px]" 
                placeholder="Ваши вопросы, на что обратить внимание..."
                value={analysisComment}
                onChange={e => setAnalysisComment(e.target.value)}
              />
              
              {analysisPgn && <EngineAnalysis pgn={analysisPgn} />}

              <button 
                className="button w-fit" 
                onClick={() => {
                  if (!analysisPgn.trim()) {
                    notify('Вставьте PGN партии!'); return;
                  }
                  onPurchaseAnalysis?.(analysisPgn, analysisComment)
                }}
              >
                Оплатить разбор партии ({globalSettings?.analysisPrice ?? 70} ₽)
              </button>
            </div>
          </section>
        </>
      )}
    </>
  )
}

// ─── Leaderboard ──────────────────────────────────────────────────────────────

function Leaderboard() {
  const [top, setTop] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState<'all-time' | 'week' | 'month'>('all-time')

  useEffect(() => {
    setLoading(true)
    const url = period === 'all-time' ? '/api/leaderboard' : `/api/leaderboard?period=${period}`
    fetch(url)
      .then(r => r.json())
      .then(data => { if (Array.isArray(data)) setTop(data) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [period])

  const medals = [
    <Trophy key={1} className="size-5 text-foreground" />,
    <Trophy key={2} className="size-5 text-muted-foreground" />,
    <Trophy key={3} className="size-5 text-muted-foreground/50" />
  ]

  return (
    <>
      <Head over="Геймификация" title="Таблица рейтинга" text="Рейтинг растёт за каждое решённое домашнее задание. +15 с первой попытки, +10 со второй, +5 с третьей и далее." />
      
      {/* Period Selector */}
      <div className="flex gap-1.5 mb-5 bg-muted/40 border p-1 rounded-xl w-fit">
        <button
          onClick={() => setPeriod('all-time')}
          className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition ${
            period === 'all-time'
              ? 'bg-card text-foreground shadow-xs border border-border/40'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Всё время
        </button>
        <button
          onClick={() => setPeriod('week')}
          className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition ${
            period === 'week'
              ? 'bg-card text-foreground shadow-xs border border-border/40'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Неделя
        </button>
        <button
          onClick={() => setPeriod('month')}
          className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition ${
            period === 'month'
              ? 'bg-card text-foreground shadow-xs border border-border/40'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Месяц
        </button>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Загрузка...</p>
      ) : top.length === 0 ? (
        <p className="text-sm text-muted-foreground">Пока нет учеников в рейтинге за этот период.</p>
      ) : (
        <div className="rounded-xl border overflow-hidden">
          {top.map((u, i) => (
            <div key={u.id}
              className={`flex items-center gap-4 px-5 py-4 border-b last:border-0 ${i === 0 && !u.isPremium ? 'bg-muted/30' : ''} ${u.isPremium ? 'bg-gradient-to-r from-yellow-500/10 to-transparent border-yellow-500/30' : ''}`}>
              <span className="w-8 text-center text-lg shrink-0">
                {i < 3 ? medals[i] : <span className="text-sm font-semibold text-muted-foreground">{i + 1}</span>}
              </span>
              <div className={`flex size-9 shrink-0 items-center justify-center rounded-full border text-sm font-semibold ${u.isPremium ? 'bg-yellow-500/20 border-yellow-500/50 text-yellow-600' : 'bg-muted'}`}>
                {(u.name || 'U').split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold truncate flex items-center gap-2">
                  {u.name || 'Ученик'}
                  {u.isPremium && <Crown className="size-4 text-yellow-500" title="Premium Пользователь" />}
                </p>
                <p className="text-xs text-muted-foreground">
                  {period === 'all-time'
                    ? `${(u._count?.homeworks ?? 0) + (u.puzzlesSolvedTotal ?? 0)} заданий и задач решено`
                    : `${u.solvedCount ?? 0} задач решено за период`}
                </p>
              </div>
              <div className="text-right shrink-0">
                <p className={`text-lg font-semibold tabular-nums ${u.isPremium ? 'text-yellow-600' : ''}`}>
                  {period === 'all-time' ? u.rating : u.solvedCount ?? 0}
                </p>
                <p className="text-xs text-muted-foreground">
                  {period === 'all-time' ? 'очков' : 'задач'}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  )
}

// ─── UsersManager ─────────────────────────────────────────────────────────────

const ROLES = ['STUDENT', 'TEACHER', 'ADMIN'] as const
type UserRole = typeof ROLES[number]

const ROLE_LABELS: Record<UserRole, string> = {
  STUDENT: 'Ученик',
  TEACHER: 'Учитель',
  ADMIN: 'Администратор',
}

function UsersManager({ notify }: { notify: (s: string) => void }) {
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/users')
      .then(r => r.json())
      .then(data => { if (Array.isArray(data)) setUsers(data) })
      .catch(() => notify('Ошибка загрузки пользователей'))
      .finally(() => setLoading(false))
  }, [])

  const changeRole = async (userId: string, newRole: UserRole) => {
    setSaving(userId)
    try {
      const res = await fetch('/api/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, role: newRole })
      })
      if (res.ok) {
        const updated = await res.json()
        setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: updated.role } : u))
        notify(`Роль изменена на «${ROLE_LABELS[newRole]}»`)
      } else {
        const err = await res.json().catch(() => ({}))
        notify(err.error || 'Ошибка при изменении роли')
      }
    } catch {
      notify('Ошибка сети')
    } finally {
      setSaving(null)
    }
  }

  const roleColor: Record<UserRole, string> = {
    ADMIN: 'bg-foreground text-background',
    TEACHER: 'bg-muted text-foreground',
    STUDENT: 'border text-muted-foreground',
  }

  return (
    <>
      <Head
        over="Администрирование"
        title="Пользователи"
        text={`Все зарегистрированные пользователи сайта. Всего: ${users.length}`}
      />
      {loading ? (
        <p className="text-sm text-muted-foreground">Загрузка...</p>
      ) : (
        <div className="rounded-xl border overflow-hidden">
          {users.map(u => (
            <div key={u.id} className="flex flex-wrap items-center gap-3 px-5 py-4 border-b last:border-0">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-full border bg-muted text-sm font-semibold">
                {(u.name || 'U').split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold truncate flex items-center gap-2">
                  {u.name || '—'}
                  {u.isPremium && <Crown className="size-4 text-yellow-500" title="Premium Пользователь" />}
                </p>
                <p className="text-xs text-muted-foreground truncate">{u.email}</p>
              </div>
              <div className="shrink-0 text-right">
                <p className="text-sm tabular-nums text-muted-foreground">{u.rating} очков</p>
              </div>
              <div className="shrink-0">
                <select
                  disabled={saving === u.id}
                  value={u.role}
                  onChange={e => changeRole(u.id, e.target.value as UserRole)}
                  className={`rounded-md border px-2 py-1 text-xs font-medium cursor-pointer bg-background ${roleColor[u.role as UserRole] || ''}`}
                >
                  {ROLES.map(r => (
                    <option key={r} value={r}>{ROLE_LABELS[r]}</option>
                  ))}
                </select>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  )
}

