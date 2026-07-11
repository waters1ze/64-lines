'use client'

import { useState, useMemo, useRef, useEffect } from 'react'
import {
  ArrowLeft, ArrowRight, Bell, BookOpen, Check, ChevronRight, CircleDollarSign,
  ExternalLink, GraduationCap, ImagePlus, LayoutDashboard, Library,
  LockKeyhole, Menu, Pencil, Plus, RotateCcw,
  Settings, Store, Trash2, Upload, UserPlus, Users, Video, X, MessageSquare
} from 'lucide-react'
import { Chess } from 'chess.js'

// ─── Types ────────────────────────────────────────────────────────────────────

type Role = 'Учитель' | 'Ученик' | 'Покупатель'
type Section =
  | 'overview' | 'students' | 'studentProfile' | 'homework' | 'homeworkPuzzle'
  | 'videos' | 'openings' | 'modules' | 'sales' | 'store' | 'courses' | 'settings' | 'courseViewer'

type TreeNode = { san: string; comment: string; children: TreeNode[] }
type GameTree = { children: TreeNode[]; comment: string }

type Student = { id: string | number; name: string; rating: number; email?: string }
type HW = {
  id: string | number; studentId: string | number; title: string; assignedAt?: string; dueDate?: string | null
  progress: number; solved: boolean; attempts: number; pgn: string; status?: string; assigned?: string; due?: string
  teacherNote?: string;
}
type Course = {
  id: string | number;
  name: string;
  description: string;
  price: number;
  imageUrl?: string | null;
  fileUrl?: string | null;
  pgn?: string | null;
  createdAt: any;
}

type Video = {
  id: string | number;
  title: string;
  meta: string;
  url: string;
}

type Opening = {
  id: string | number;
  title: string;
  pgn: string;
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
  if (pgn.startsWith('{') && pgn.endsWith('}')) {
    try { return JSON.parse(pgn) } catch {}
  }
  const raw = pgn.replace(/\[.*?\]/gs, '').replace(/\{[^}]*\}/gs, '')
  const tokens = (raw.match(/\d+\.{1,3}|[NBRQK]?[a-h]?[1-8]?x?[a-h][1-8](?:=[NBRQ])?[+#]?|O-O-O|O-O|\(|\)|1-0|0-1|1\/2-1\/2|\*/g) ?? [])
    .filter(t => !t.match(/^\d+\./) && !['1-0','0-1','1/2-1/2','*'].includes(t))
  const pos = { i: 0 }
  function parse(): TreeNode[] {
    const nodes: TreeNode[] = []
    while (pos.i < tokens.length) {
      const t = tokens[pos.i]
      if (t === ')') { pos.i++; break }
      if (t === '(') { pos.i++; const alt = parse(); if (nodes.length) nodes[nodes.length - 1].children.push(...alt); continue }
      nodes.push({ san: t, comment: '', children: [] }); pos.i++
    }
    return nodes
  }
  return { children: parse(), comment: '' }
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

function Metric({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <article className="rounded-lg border p-5">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-3 text-3xl font-semibold tracking-tight">{value}</p>
      <p className="mt-2 text-xs text-muted-foreground">{note}</p>
    </article>
  )
}

function Modal({ title, close, children, wide }: { title: string; close: () => void; children: React.ReactNode; wide?: boolean }) {
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

import { signOut } from 'next-auth/react'
import Link from 'next/link'

import { useRouter, useSearchParams } from 'next/navigation'

export function TeacherHub({ 
  initialRole = 'Учитель', 
  userName = 'Учитель', 
  userRating = 1200,
  initialStudents,
  initialHomeworks,
  initialCourses,
  initialVideos,
  initialOpenings,
  initialPurchases = [],
}: { 
  initialRole?: string, 
  userName?: string, 
  userRating?: number,
  initialStudents?: any[],
  initialHomeworks?: any[],
  initialCourses?: any[],
  initialVideos?: any[],
  initialOpenings?: any[],
  initialPurchases?: any[],
}) {
  const isTeacher = initialRole === 'Учитель' || initialRole === 'ADMIN'
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

  const [students, setStudents] = useState<Student[]>(initialStudents || INIT_STUDENTS)
  const [homeworks, setHomeworks] = useState<HW[]>(initialHomeworks || INIT_HW)
  const [courses, setCourses] = useState<Course[]>(initialCourses || INIT_COURSES)
  const [videos, setVideos] = useState<Video[]>(initialVideos || INIT_VIDEOS)
  const [openings, setOpenings] = useState<Opening[]>(initialOpenings || INIT_OPENINGS)
  const [purchases, setPurchases] = useState<any[]>(initialPurchases)
  
  const purchasedIds = useMemo(() => {
    return purchases.filter(p => p.status === 'APPROVED' || p.status === 'PAID').map(p => p.courseId)
  }, [purchases])
  
  const [selectedStudentId, setSelectedStudentId] = useState<string | number | null>(null)
  const [selectedHwId, setSelectedHwId] = useState<string | number | null>(null)
  const [paymentCourseId, setPaymentCourseId] = useState<string | number | null>(null)
  const [paymentStep, setPaymentStep] = useState<'info' | 'confirm'>('info')
  const [paymentSender, setPaymentSender] = useState('')
  const [paymentComment, setPaymentComment] = useState('')
  const [viewingCourseId, setViewingCourseId] = useState<string | number | null>(null)

  const notify = (s: string) => { setToast(s); setTimeout(() => setToast(''), 2500) }
  const go = (s: Section) => { setSection(s); setMobile(false) }

  const teacherNav = [
    ['overview',       'Обзор',              LayoutDashboard],
    ['students',       'Мои ученики',        Users],
    ['homework',       'Домашние задания',   BookOpen],
    ['videos',         'Видео с YouTube',    Video],
    ['courses',        'Дебютные курсы',     GraduationCap],
    ['openings',       'Мои дебюты',         Library],
    ['modules',        'Учебные модули',     BookOpen],
    ['sales',          'Продажи',            CircleDollarSign],
    ['store',          'Витрина',            Store],
    ['settings',       'Настройки',          Settings],
  ] as const

  const studentNavBase = [
    ['overview',  'Мой обзор',          LayoutDashboard],
    ['videos',    'Видео с YouTube',         Video],
    ['courses',   'Дебютные курсы',     GraduationCap],
    ['store',     'Витрина',            Store],
    ['openings',  'Мои дебюты',         Library],
    ...(purchasedIds.length > 0 ? [['modules', 'Учебные модули', BookOpen] as const] : []),
    ['settings',  'Настройки',          Settings],
  ] as const

  const guestNavBase = [
    ['videos',    'Видео с YouTube',         Video],
    ['courses',   'Дебютные курсы',     GraduationCap],
    ['store',     'Витрина',            Store],
    ['openings',  'Мои дебюты',         Library],
  ] as const

  const nav = isGuest ? guestNavBase : (isStudent ? studentNavBase : teacherNav)

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
  const purchaseCourse = (id: string | number) => {
    if (isGuest) {
      notify('Пожалуйста, зарегистрируйтесь, чтобы совершать покупки.')
      return
    }
    const alreadyPending = purchases.some(p => p.courseId === id && p.status === 'PENDING')
    if (alreadyPending) {
      notify('У вас уже есть заявка на этот курс. Ожидайте подтверждения.')
      return
    }
    setPaymentStep('info')
    setPaymentSender('')
    setPaymentComment('')
    setPaymentCourseId(id)
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

  const approvePurchase = async (purchaseId: string) => {
    try {
      const res = await fetch('/api/payments/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ purchaseId })
      })
      if (res.ok) {
        setPurchases(prev => prev.map(p => p.id === purchaseId ? { ...p, status: 'APPROVED' } : p))
        notify('Оплата подтверждена! Доступ выдан, письмо отправлено.')
      } else {
        notify('Ошибка при подтверждении оплаты.')
      }
    } catch {
      notify('Ошибка сети.')
    }
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
              <small className="text-muted-foreground">{isStudent ? 'Кабинет ученика' : 'Кабинет тренера'}</small>
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
            <p className="text-xs text-muted-foreground">{isStudent ? 'Ученик' : 'Тренер'}</p>
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
            <span className="text-xs text-muted-foreground px-2 py-1 bg-muted rounded-md">{role}</span>
            {isGuest && (
              <Link href="/login" className="button ml-2 py-1 px-3 text-xs">
                Войти / Регистрация
              </Link>
            )}
          </div>
          <button className="icon-button" onClick={() => notify('Новых уведомлений нет')}><Bell /></button>
        </header>

        <main className="min-w-0 flex-1 overflow-y-auto">
          <div className="mx-auto flex max-w-[1440px] flex-col gap-6 p-4 md:p-7">
            {section === 'overview' && (isStudent
              ? <StudentOverview userName={userName} userRating={userRating} homeworks={homeworks} onOpenHw={openHwPuzzle} />
              : <TeacherOverview userName={userName} go={go} homeworks={homeworks} students={students} videosCount={videos.length} onOpenHw={openHwPuzzle} onSelectStudent={openStudentProfile} notify={notify} />
            )}
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
                  if (solved) notify(`Домашнее задание полностью выполнено! Попыток: ${attempts}`)
                }}
                onUpdate={!isStudent ? updateHomework : undefined}
                onDelete={!isStudent ? deleteHomework : undefined}
                notify={notify} />
            )}
            {section === 'videos'   && <VideosSection videos={videos} setVideos={setVideos} teacher={!isStudent} notify={notify} />}
            {section === 'openings' && <PgnBoard openings={openings} setOpenings={setOpenings} isTeacher={!isStudent} notify={notify} />}
            {section === 'modules'  && <Modules courses={courses} purchasedIds={purchasedIds} onOpenCourse={openCourseViewer} />}
            {section === 'courseViewer' && viewingCourse && <CourseViewer course={viewingCourse} />}
            {section === 'sales'    && !isStudent && <Sales purchases={purchases} onApprove={approvePurchase} />}
            {section === 'store'    && <Storefront courses={courses} purchasedIds={purchasedIds} onPurchase={purchaseCourse} />}
            {section === 'courses'  && (
              <OpeningCourses courses={courses} isTeacher={!isStudent} purchasedIds={purchasedIds}
                onPurchase={purchaseCourse}
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
            {section === 'settings' && <SettingsPanel notify={notify} initialName={userName || ''} isStudent={isStudent} />}
          </div>
        </main>
      </div>

      {paymentCourseId && (() => {
        const course = courses.find(c => c.id === paymentCourseId)
        if (!course) return null
        return (
          <Modal title="Оплата курса" close={() => setPaymentCourseId(null)}>
            {paymentStep === 'info' ? (
              <div className="flex flex-col gap-4">
                <p className="text-sm text-muted-foreground">Перед оплатой заполните информацию, чтобы мы могли быстрее подтвердить ваш перевод.</p>
                <label className="field">Ваше имя (отправитель перевода)
                  <input className="input" value={paymentSender} onChange={e => setPaymentSender(e.target.value)} placeholder="Иван Иванов" />
                </label>
                <label className="field">Комментарий к заказу
                  <textarea className="textarea text-sm" value={paymentComment} onChange={e => setPaymentComment(e.target.value)} placeholder="Например: оплачиваю по акции, или ник на lichess..." />
                </label>
                <button className="button w-full" disabled={!paymentSender.trim()} onClick={() => setPaymentStep('confirm')}>
                  Далее — к оплате
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-4 text-center">
                <div className="rounded-xl bg-muted/30 p-6">
                  <p className="text-muted-foreground">Переведите по номеру телефона (СБП):</p>
                  <b className="mt-2 block text-2xl tracking-widest">+7 (999) 813-78-70</b>
                  <p className="mt-1 text-sm text-muted-foreground">Банк: Альфа-Банк / Получатель: Кирилл П.</p>
                </div>
                <p className="text-sm">Сумма к оплате: <b>{course.price.toLocaleString('ru-RU')} ₽</b></p>
                <div className="mt-2 flex flex-col gap-3">
                  <button className="button w-full" onClick={handleManualPayment}>
                    Я перевел(а) деньги
                  </button>
                  <button className="outline-button w-full" onClick={() => setPaymentStep('info')}>
                    <ArrowLeft className="size-4" />Назад
                  </button>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  После нажатия "Я перевел деньги" мы проверим оплату, и курс появится в вашем кабинете. Если что-то пойдет не так, смело пишите в поддержку!
                </p>
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

function TeacherOverview({ userName, go, homeworks, students, videosCount, onOpenHw, onSelectStudent, notify }: { userName: string; go: (s: Section) => void; homeworks: HW[]; students: Student[]; videosCount: number; onOpenHw: (id: string | number) => void; onSelectStudent: (id: string | number) => void; notify: (s: string) => void }) {
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

function StudentOverview({ userName, userRating, homeworks, onOpenHw }: { userName: string; userRating: number; homeworks: HW[]; onOpenHw: (id: string | number) => void }) {
  const solved = homeworks.filter(h => h.solved).length
  const totalAttempts = homeworks.filter(h => h.solved).reduce((a, h) => a + h.attempts, 0)
  
  // Рассчитываем процент точности: если решено с первой попытки - 100%, со второй - 50%, и т.д.
  // Это примерная метрика для "Точности"
  let accuracy = 0
  if (solved > 0) {
    const totalPossibleAccuracy = solved * 100
    const currentAccuracy = homeworks.filter(h => h.solved).reduce((acc, h) => {
      return acc + (100 / h.attempts)
    }, 0)
    accuracy = Math.round((currentAccuracy / totalPossibleAccuracy) * 100)
  }

  // Расчет "серии занятий" (просто пример на основе решенных задач, т.к. нет отдельной таблицы активности)
  // Для более точного нужно сохранять дату каждого решения.
  const streak = solved > 0 ? 1 : 0

  return (
    <>
      <Head over="Личный кабинет" title={`${userName}, продолжим тренировку`} text="Статистика и задания тренера." />
      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Metric label="Рейтинг"       value={String(userRating)} note="Текущий Эло" />
        <Metric label="Выполнено"     value={`${solved}/${homeworks.length}`} note="заданий" />
        <Metric label="Серия занятий" value={`${streak} дней`} note="Активность" />
        <Metric label="Точность"      value={`${accuracy}%`} note={`${solved} задач`} />
      </section>
      <div><h2 className="text-lg font-semibold">Мои домашние задания</h2></div>
      <section className="grid gap-3 lg:grid-cols-3">
        {homeworks.map(hw => <HwCard key={hw.id} hw={hw} isStudent onOpen={() => onOpenHw(hw.id)} />)}
      </section>
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
  const fileRef = useRef<HTMLInputElement>(null)

  const done = homeworks.filter(h => h.solved).length
  const avgAttempts = done > 0 ? (homeworks.filter(h => h.solved).reduce((a, h) => a + h.attempts, 0) / done).toFixed(1) : '—'

  const handleAdd = () => {
    if (!hwTitle || !hwPgn) { notify('Заполните название и добавьте PGN'); return }
    onAddHw({ studentId: student.id, title: hwTitle, dueDate: hwDue || undefined, progress: 0, pgn: hwPgn })
    setShowAdd(false); setHwTitle(''); setHwDue(''); setHwPgn('')
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

      {showAdd && (
        <Modal title="Добавить домашнее задание" close={() => setShowAdd(false)}>
          <label className="field">Название задания<input className="input" value={hwTitle} onChange={e => setHwTitle(e.target.value)} placeholder="Тактика: вилка конём" /></label>
          <label className="field">Срок (дата)<input className="input" type="date" value={hwDue} onChange={e => setHwDue(e.target.value)} /></label>
          <div className="field">
            <span>PGN-файл с позицией и решением</span>
            <label className="drop-zone cursor-pointer">
              <Upload /><b>{hwPgn ? '✅ PGN загружен' : 'Выбрать PGN-файл'}</b><span>Ходы в PGN — это правильное решение</span>
              <input ref={fileRef} className="sr-only" type="file" accept=".pgn,.txt"
                onChange={e => { const f = e.target.files?.[0]; if (f) { const r = new FileReader(); r.onload = () => setHwPgn(String(r.result)); r.readAsText(f) } }} />
            </label>
            <textarea className="textarea font-mono text-xs min-h-24" value={hwPgn} onChange={e => setHwPgn(e.target.value)}
              placeholder="Или вставьте PGN вручную: 1. e4 e5 2. Nf3 Nc6 3. Bb5" />
          </div>
          <button className="button" onClick={handleAdd}>Назначить ученику</button>
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
          <div className="aspect-square overflow-hidden rounded-md" style={{ border: `3px solid ${BOARD_DARK}` }}>
            <ChessBoard game={game} selected={selected} setSelected={canMove ? setSelected : () => {}}
              dragFrom={dragFrom} setDragFrom={setDragFrom} dragOver={dragOver} setDragOver={setDragOver}
              flipped={flipped} onMove={applyStudentMove} />
          </div>

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

function VideosSection({ 
  videos, 
  setVideos, 
  teacher, 
  notify 
}: { 
  videos: Video[]; 
  setVideos: React.Dispatch<React.SetStateAction<Video[]>>; 
  teacher: boolean; 
  notify: (s: string) => void 
}) {
  const [show, setShow] = useState(false)
  const [form, setForm] = useState({ title: '', meta: '', url: '' })
  return (
    <>
      <Head over="YouTube библиотека" title="Видеоуроки"
        text={teacher ? 'Публикуйте ссылки на видео с вашего канала.' : 'Смотрите видеоуроки тренера.'}
        action={teacher ? <button className="button" onClick={() => setShow(true)}><Plus />Добавить видео</button> : undefined} />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {videos.map(v => (
          <article key={v.id} className="overflow-hidden rounded-lg border">
            <div className="flex aspect-video items-center justify-center border-b bg-muted/40"><Video className="size-9 text-muted-foreground" /></div>
            <div className="p-5">
              <h3 className="font-semibold">{v.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{v.meta}</p>
              <a className="outline-button mt-5 w-full" href={v.url} target="_blank" rel="noreferrer" onClick={() => notify('Открываем YouTube')}>
                Смотреть на YouTube<ExternalLink />
              </a>
            </div>
          </article>
        ))}
      </div>
      {show && (
        <Modal title="Добавить видео с YouTube" close={() => setShow(false)}>
          <label className="field">Название<input className="input" value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} /></label>
          <label className="field">Длительность и тема<input className="input" value={form.meta} onChange={e => setForm(p => ({ ...p, meta: e.target.value }))} placeholder="18 мин · Тактика" /></label>
          <label className="field">Ссылка YouTube<input className="input" type="url" value={form.url} onChange={e => setForm(p => ({ ...p, url: e.target.value }))} placeholder="https://youtube.com/watch?v=..." /></label>
          <button className="button" onClick={async () => {
            if (!form.title || !form.url) { notify('Заполните все поля'); return }
            try {
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
            } catch {
              notify('Ошибка сети.')
            }
            setShow(false)
          }}>Опубликовать</button>
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
  const [ctxMenu,     setCtxMenu]     = useState<{ x: number; y: number; idx: number } | null>(null)
  const [editComment, setEditComment] = useState<number | null>(null)
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

  function deleteFromIdx(idx: number) {
    const parentPath = path.slice(0, idx)
    const sanToRemove = path[idx]
    const newTree = cloneTree(tree)
    const { nodes } = walkTo(newTree, parentPath)
    const i = nodes.findIndex(n => n.san === sanToRemove)
    if (i !== -1) nodes.splice(i, 1)
    setTree(newTree); setPath(parentPath); setCtxMenu(null)
  }

  function saveComment(idx: number, text: string) {
    const nodePath = path.slice(0, idx + 1)
    const newTree = cloneTree(tree)
    const { node } = walkTo(newTree, nodePath)
    if (node) node.comment = text
    setTree(newTree); setEditComment(null)
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
              onClick={() => deleteFromIdx(ctxMenu.idx)}>
              <Trash2 className="size-4" />Удалить ветку с этого хода
            </button>
          </div>
        </>
      )}

      {/* Comment editor */}
      {editComment !== null && (
        <Modal title={`Комментарий к ходу ${path[editComment]}`} close={() => setEditComment(null)}>
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
              {path.length === 0 && tree.children.length === 0
                ? <span className="text-xs text-muted-foreground">Загрузите PGN или двигайте фигуры</span>
                : path.map((san, i) => {
                    const nd = nodeAt(i)
                    const siblings = siblingsAt(i).filter(s => s.san !== san)
                    return (
                      <span key={i} className="flex flex-col">
                        <span className="inline-flex items-center gap-0.5">
                          {i % 2 === 0 && <span className="text-xs text-muted-foreground">{Math.floor(i / 2) + 1}.</span>}
                          <button
                            className={`rounded px-1 text-sm transition-colors ${i === path.length - 1 ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}
                            onClick={() => goToStep(i + 1)}
                            onContextMenu={e => { e.preventDefault(); setCtxMenu({ x: e.clientX, y: e.clientY, idx: i }) }}>
                            {san}
                          </button>
                          <button className="text-xs opacity-50 hover:opacity-100" title="Комментарий"
                            onClick={() => { setEditComment(i); setCommentDraft(nd?.comment ?? '') }}>
                            💬
                          </button>
                        </span>
                        {nd?.comment && <span className="ml-2 text-xs italic text-muted-foreground">{`{ ${nd.comment} }`}</span>}
                        {siblings.length > 0 && (
                          <span className="ml-4 flex flex-wrap gap-1">
                            {siblings.map(s => (
                              <button key={s.san}
                                className="rounded border border-dashed px-1 text-xs text-muted-foreground hover:bg-muted"
                                onClick={() => { setPath([...path.slice(0, i), s.san]); setSelected(null) }}>
                                ({i % 2 === 0 ? `${Math.floor(i / 2) + 1}.` : ''}{s.san})
                              </button>
                            ))}
                          </span>
                        )}
                      </span>
                    )
                  })}
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

// ─── Modules ──────────────────────────────────────────────────────────────────

function Modules({ courses, purchasedIds, onOpenCourse }: { courses: Course[]; purchasedIds: (string | number)[]; onOpenCourse: (id: string | number) => void }) {
  const purchased = courses.filter(c => purchasedIds.includes(c.id))
  return (
    <>
      <Head over="Программы" title="Учебные модули" text="Ваши купленные курсы и учебные программы." />
      {purchased.length === 0 && (
        <p className="text-muted-foreground">У вас пока нет купленных курсов. Перейдите в «Дебютные курсы» или «Витрину», чтобы приобрести материалы.</p>
      )}
      <div className="grid gap-3">
        {purchased.map((c, i) => {
          const gameCount = c.pgn ? c.pgn.split(/(?=\[Event )/).filter(Boolean).length : 0
          return (
            <article key={c.id} className="flex flex-col gap-4 rounded-lg border p-5 md:flex-row md:items-center">
              <span className="flex size-11 items-center justify-center rounded-md border font-mono text-sm">{String(i + 1).padStart(2, '0')}</span>
              <div className="flex-1">
                <h3 className="font-medium">{c.name}</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  {gameCount > 0 ? `${gameCount} партий в базе` : 'Курс без PGN-базы'}
                  {c.description ? ` · ${c.description.slice(0, 60)}${c.description.length > 60 ? '…' : ''}` : ''}
                </p>
              </div>
              <button className="button" onClick={() => onOpenCourse(c.id)}>Открыть<ChevronRight className="size-4" /></button>
            </article>
          )
        })}
        {STATIC_MODULES.map((m, i) => (
          <article key={`static-${i}`} className="flex flex-col gap-4 rounded-lg border p-5 md:flex-row md:items-center opacity-60">
            <span className="flex size-11 items-center justify-center rounded-md border font-mono text-sm">{String(purchased.length + i + 1).padStart(2, '0')}</span>
            <div className="flex-1">
              <h3 className="font-medium">{m.name}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{m.lessons} уроков · Заполнено на {m.progress}%</p>
              <div className="mt-3 max-w-md"><ProgressBar value={m.progress} /></div>
            </div>
            <button className="outline-button" disabled>Скоро</button>
          </article>
        ))}
      </div>
    </>
  )
}

// ─── Sales ────────────────────────────────────────────────────────────────────

function Sales({ purchases, onApprove }: { purchases: any[]; onApprove: (id: string) => void }) {
  const revenue = purchases.filter(p => p.status === 'APPROVED').reduce((acc, p) => acc + (p.course?.price || 0), 0)
  const pending = purchases.filter(p => p.status === 'PENDING')
  const approved = purchases.filter(p => p.status === 'APPROVED')
  
  return (
    <>
      <Head over="Коммерция" title="Продажи" text="Заявки на оплату и статистика." />
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
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <p className="font-semibold">{p.user?.name || p.user?.email}</p>
                    <p className="text-sm text-muted-foreground">Курс: {p.course?.name} · {p.course?.price?.toLocaleString('ru-RU')} ₽</p>
                    {p.senderName && <p className="mt-1 text-sm"><b>Отправитель:</b> {p.senderName}</p>}
                    {p.comment && <p className="mt-0.5 text-sm text-muted-foreground"><b>Комментарий:</b> {p.comment}</p>}
                    <p className="mt-1 text-xs text-muted-foreground">{formatDate(p.createdAt)}</p>
                  </div>
                  <button className="button text-sm py-1.5 px-4 h-auto whitespace-nowrap" onClick={() => onApprove(p.id)}>✅ Одобрить</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-8">
        <h3 className="mb-4 text-xl font-semibold">История заказов</h3>
        <div className="flex flex-col gap-3">
          {approved.map(p => (
            <div key={p.id} className="flex items-center justify-between rounded-lg border p-4">
              <div>
                <p className="font-medium">{p.user?.name || p.user?.email}</p>
                <p className="text-sm text-muted-foreground">{p.course?.name} · {p.course?.price?.toLocaleString('ru-RU')} ₽</p>
              </div>
              <span className="badge bg-green-500/10 text-green-500">Оплачено</span>
            </div>
          ))}
          {approved.length === 0 && <p className="text-muted-foreground">Пока нет подтверждённых заказов.</p>}
        </div>
      </div>
    </>
  )
}

// ─── Storefront (Витрина) ─────────────────────────────────────────────────────

function Storefront({ courses, purchasedIds, onPurchase }: { courses: Course[]; purchasedIds: number[]; onPurchase: (id: string | number) => void }) {
  const [detailId, setDetailId] = useState<string | number | null>(null)
  const detail = courses.find(c => c.id === detailId)

  // All items: courses newest first + static modules
  const allItems: { id: number; name: string; desc: string; price: number; img: string; kind: 'course' | 'module' }[] = [
    ...[...courses].sort((a, b) => b.createdAt - a.createdAt).map(c => ({ id: c.id, name: c.name, desc: c.description, price: c.price, img: c.imageUrl, kind: 'course' as const })),
    ...STATIC_MODULES.map((m, i) => ({ id: -(i + 1), name: m.name, desc: `${m.lessons} уроков · ${m.progress}% изучено`, price: 0, img: '', kind: 'module' as const })),
  ]

  return (
    <>
      <Head over="Витрина" title="Все материалы" text="Все доступные курсы и модули — от нового к старому." />
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {allItems.map(item => {
          const owned = item.id < 0 || purchasedIds.includes(item.id)
          return (
            <article key={item.id} className="flex flex-col overflow-hidden rounded-lg border">
              <div className="flex aspect-video items-center justify-center border-b bg-muted/30">
                {item.img ? <img src={item.img} alt={item.name} className="size-full object-cover" /> : <Library className="size-10 text-muted-foreground" />}
              </div>
              <div className="flex flex-1 flex-col p-5">
                <span className="badge w-fit">{item.kind === 'course' ? 'Курс' : 'Модуль'}</span>
                <h3 className="mt-3 font-semibold">{item.name}</h3>
                <p className="mt-1 flex-1 text-sm text-muted-foreground line-clamp-2">{item.desc}</p>
                <div className="mt-4">
                  {item.price > 0 && !owned && <b className="block mb-2">{item.price.toLocaleString('ru-RU')} ₽</b>}
                  {owned
                    ? <button className="button w-full">Открыть<ChevronRight /></button>
                    : <div className="flex gap-2">
                        <button className="outline-button flex-1" onClick={() => setDetailId(item.id)}>Подробнее</button>
                        <button className="button flex-1" onClick={() => { if (item.id > 0) onPurchase(item.id) }}><LockKeyhole />Купить</button>
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
          <p className="text-sm leading-6 text-muted-foreground">{detail.description}</p>
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

type CourseForm = { name: string; description: string; price: string; imageUrl: string; pgn: string }

function OpeningCourses({ courses, isTeacher, purchasedIds, onPurchase, onAdd, onUpdate, onDelete, notify }: {
  courses: Course[]; isTeacher: boolean; purchasedIds: number[]
  onPurchase: (id: string | number) => void
  onAdd: (c: Omit<Course, 'id' | 'createdAt'>) => void
  onUpdate: (id: number, u: Partial<Course>) => void
  onDelete: (id: string | number) => void
  notify: (s: string) => void
}) {
  const [modal, setModal] = useState<null | 'add' | 'detail' | number>(null)
  const [detailId, setDetailId] = useState<number | null>(null)
  const [form, setForm] = useState<CourseForm>({ name: '', description: '', price: '', imageUrl: '', pgn: '' })
  const fileRef = useRef<HTMLInputElement>(null)
  const pgnFileRef = useRef<HTMLInputElement>(null)

  const sorted = [...courses].sort((a, b) => b.createdAt - a.createdAt)
  const detailCourse = courses.find(c => c.id === detailId)

  function openAdd() { setForm({ name: '', description: '', price: '', imageUrl: '', pgn: '' }); setModal('add') }
  function openEdit(c: Course) { setForm({ name: c.name, description: c.description, price: String(c.price), imageUrl: c.imageUrl ?? '', pgn: c.pgn ?? '' }); setModal(c.id) }
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
    const data = { name: form.name, description: form.description, price: Number(form.price), imageUrl: form.imageUrl, pgn: form.pgn || undefined }
    if (modal === 'add') onAdd(data)
    else if (typeof modal === 'number') onUpdate(modal, data)
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
                <h3 className="font-semibold">{c.name}</h3>
                <p className="mt-2 flex-1 text-sm text-muted-foreground line-clamp-3">{c.description}</p>
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
                      <button className="outline-button flex-1" onClick={() => openEdit(c)}><Pencil className="size-3" />Изменить</button>
                      <button className="icon-button border rounded-md" onClick={() => onDelete(c.id)}><Trash2 /></button>
                    </>
                  ) : (
                    <>
                      <button className="outline-button flex-1" onClick={() => { setDetailId(c.id); setModal('detail') }}>Подробнее</button>
                      {!purchased && <button className="button flex-1" onClick={() => onPurchase(c.id)}><LockKeyhole />Купить</button>}
                    </>
                  )}
                </div>
              </div>
            </article>
          )
        })}
      </div>

      {/* Add / Edit modal */}
      {(modal === 'add' || typeof modal === 'number') && (
        <Modal title={modal === 'add' ? 'Добавить курс' : 'Редактировать курс'} close={() => setModal(null)}>
          <label className="field">Название<input className="input" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Сицилианская защита" /></label>
          <label className="field">Описание<textarea className="textarea" value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} placeholder="Подробное описание курса..." /></label>
          <label className="field">Цена (₽)<input className="input" type="number" value={form.price} onChange={e => setForm(p => ({ ...p, price: e.target.value }))} placeholder="4900" /></label>
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
        <Modal title={detailCourse.name} close={() => setModal(null)}>
          {detailCourse.imageUrl && <img src={detailCourse.imageUrl} alt={detailCourse.name} className="max-h-52 w-full rounded-lg object-cover" />}
          <p className="text-sm leading-6 text-muted-foreground">{detailCourse.description}</p>
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

type PgnGame = { event: string; white: string; black: string; result: string; startFen: string; moves: string[] }

function parsePgnGames(pgn: string): PgnGame[] {
  if (!pgn?.trim()) return []
  const blocks = pgn.split(/(?=\[Event )/).map(s => s.trim()).filter(Boolean)
  return blocks.map(block => {
    const get = (tag: string) => block.match(new RegExp(`\\[${tag} "(.+?)"\\]`))?.[1] ?? ''
    const fenMatch = block.match(/\[FEN "(.+?)"\]/)
    const startFen = fenMatch?.[1] ?? 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'
    let normalizedPgn = block
    if (fenMatch && !block.includes('[SetUp "1"]')) normalizedPgn = '[SetUp "1"]\n' + block
    let moves: string[] = []
    try { const g = new Chess(); g.loadPgn(normalizedPgn); moves = g.history() } catch {}
    return { event: get('Event') || 'Партия', white: get('White'), black: get('Black'), result: get('Result'), startFen, moves }
  })
}

function CourseViewer({ course }: { course: Course }) {
  const games = useMemo(() => parsePgnGames(course.pgn ?? ''), [course.pgn])
  const [selectedIdx, setSelectedIdx] = useState(0)
  const [moveIdx, setMoveIdx] = useState(0)
  const [selected, setSelected] = useState<string | null>(null)
  const [dragFrom, setDragFrom] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState<string | null>(null)
  const [flipped, setFlipped] = useState(false)

  const currentGame = games[selectedIdx]
  const { startFen, moves } = currentGame ?? { startFen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', moves: [] }

  const boardGame = useMemo(() => {
    try {
      const g = new Chess(startFen)
      for (let i = 0; i < moveIdx; i++) { try { g.move(moves[i]) } catch {} }
      return g
    } catch { return new Chess() }
  }, [startFen, moves, moveIdx])

  useEffect(() => { setMoveIdx(0); setSelected(null) }, [selectedIdx])

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
      if (e.key === 'ArrowLeft')  setMoveIdx(p => Math.max(0, p - 1))
      if (e.key === 'ArrowRight') setMoveIdx(p => Math.min(moves.length, p + 1))
      if (e.key === 'ArrowUp')    setMoveIdx(0)
      if (e.key === 'ArrowDown')  setMoveIdx(moves.length)
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [moves.length])

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
      <Head over="Курс" title={course.name} text={`${games.length} партий · используйте ← → для навигации по ходам`} />
      <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
        {/* Game list */}
        <div className="flex flex-col gap-2">
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
          <div className="rounded-lg border overflow-hidden">
            {games.map((g, i) => (
              <button
                key={i}
                onClick={() => setSelectedIdx(i)}
                className={`w-full text-left p-3 border-b last:border-0 transition-colors ${i === selectedIdx ? 'bg-primary text-primary-foreground' : 'hover:bg-muted/60'}`}
              >
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-mono w-6 shrink-0 ${i === selectedIdx ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>{i + 1}</span>
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{g.event}</p>
                    {(g.white || g.black) && (
                      <p className={`text-xs truncate ${i === selectedIdx ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                        {[g.white, g.black].filter(Boolean).join(' vs ')}
                      </p>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Board + moves */}
        <div className="flex flex-col gap-4">
          {/* Navigation controls */}
          <div className="flex items-center justify-between rounded-lg border p-2 bg-muted/30">
            <div className="flex gap-1">
              <button className="icon-button" onClick={() => setMoveIdx(0)} title="Начало" disabled={moveIdx === 0}>
                <ArrowLeft className="size-3" /><ArrowLeft className="size-3 -ml-2" />
              </button>
              <button className="icon-button" onClick={() => setMoveIdx(p => Math.max(0, p - 1))} disabled={moveIdx === 0}>
                <ArrowLeft className="size-4" />
              </button>
            </div>
            <span className="text-xs font-medium text-muted-foreground">
              {moveIdx === 0 ? 'Начальная позиция' : `Ход ${Math.ceil(moveIdx / 2)}: ${moves[moveIdx - 1]}`}
            </span>
            <div className="flex gap-1">
              <button className="icon-button" onClick={() => setMoveIdx(p => Math.min(moves.length, p + 1))} disabled={moveIdx === moves.length}>
                <ArrowRight className="size-4" />
              </button>
              <button className="icon-button" onClick={() => setMoveIdx(moves.length)} title="Конец" disabled={moveIdx === moves.length}>
                <ArrowRight className="size-3" /><ArrowRight className="size-3 -ml-2" />
              </button>
            </div>
          </div>

          {/* Board */}
          <div className="max-w-[560px] w-full mx-auto">
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

          {/* Move list */}
          <div className="rounded-lg border p-4">
            <p className="text-sm font-semibold mb-3">Ходы партии</p>
            <div className="flex flex-wrap gap-x-1 gap-y-1.5 text-sm font-mono leading-7">
              {moves.length === 0
                ? <span className="text-xs text-muted-foreground">Ходы не записаны</span>
                : moves.map((san, i) => (
                    <span key={i} className="inline-flex items-center gap-0.5">
                      {i % 2 === 0 && <span className="text-xs text-muted-foreground">{Math.floor(i / 2) + 1}.</span>}
                      <button
                        className={`rounded px-1 transition-colors ${i === moveIdx - 1 ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}
                        onClick={() => setMoveIdx(i + 1)}
                      >{san}</button>
                    </span>
                  ))}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

// ─── Settings ─────────────────────────────────────────────────────────────────

function SettingsPanel({ notify, initialName, isStudent }: { notify: (s: string) => void; initialName: string; isStudent: boolean }) {
  const [name, setName] = useState(initialName)
  const [loading, setLoading] = useState(false)
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
        router.refresh() // Обновляем сессию на клиенте
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

  return (
    <>
      <Head over="Управление" title="Настройки профиля" text="Редактирование ваших личных данных." />
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
    </>
  )
}
