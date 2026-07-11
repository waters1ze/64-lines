'use client'

import { useState, useMemo, useRef } from 'react'
import {
  ArrowLeft, Bell, BookOpen, Check, ChevronRight, CircleDollarSign,
  ExternalLink, GraduationCap, ImagePlus, LayoutDashboard, Library,
  LockKeyhole, Menu, Pencil, Plus, RotateCcw,
  Settings, Store, Trash2, Upload, UserPlus, Users, Video, X,
} from 'lucide-react'
import { Chess } from 'chess.js'

// ─── Types ────────────────────────────────────────────────────────────────────

type Role = 'Учитель' | 'Ученик' | 'Покупатель'
type Section =
  | 'overview' | 'students' | 'studentProfile' | 'homework' | 'homeworkPuzzle'
  | 'videos' | 'openings' | 'modules' | 'sales' | 'store' | 'courses' | 'settings'

type TreeNode = { san: string; comment: string; children: TreeNode[] }
type GameTree = { children: TreeNode[]; comment: string }

type Student = { id: number; name: string; rating: number }
type HW = {
  id: number; studentId: number; title: string; assigned: string; due: string
  progress: number; status: string; pgn: string; attempts: number; solved: boolean
}
type Course = {
  id: number; name: string; description: string; price: number
  imageUrl: string; createdAt: number
}

// ─── Seed data ─────────────────────────────────────────────────────────────────

const SAMPLE_PGN = `[Event "Домашнее задание"]

1. e4 e5 2. Nf3 Nc6 3. Bb5`

const INIT_STUDENTS: Student[] = [
  { id: 1, name: 'Михаил Орлов',    rating: 1842 },
  { id: 2, name: 'Анна Волкова',    rating: 1714 },
  { id: 3, name: 'Даниил Соколов',  rating: 1586 },
  { id: 4, name: 'Елена Морозова',  rating: 1458 },
]

const INIT_HW: HW[] = [
  { id: 1, studentId: 1, title: 'Тактика: отвлечение защитника',    assigned: '7 июля 2026',  due: 'до 14 июля', progress: 40,  status: 'В работе',  pgn: SAMPLE_PGN, attempts: 1, solved: false },
  { id: 2, studentId: 1, title: 'Ладейный эндшпиль: активный король', assigned: '2 июля 2026',  due: 'до 10 июля', progress: 100, status: 'Выполнено', pgn: SAMPLE_PGN, attempts: 2, solved: true  },
  { id: 3, studentId: 2, title: 'Сицилианская защита: 12 позиций',  assigned: '10 июля 2026', due: 'до 18 июля', progress: 0,   status: 'Новое',     pgn: SAMPLE_PGN, attempts: 0, solved: false },
  { id: 4, studentId: 3, title: 'Французская защита: основы',       assigned: '5 июля 2026',  due: 'до 15 июля', progress: 0,   status: 'Новое',     pgn: SAMPLE_PGN, attempts: 0, solved: false },
]

const INIT_COURSES: Course[] = [
  { id: 1, name: 'Сицилианская защита: полный репертуар', description: 'Изучите все основные линии: дракон, найдорф, шевенинген. 32 PGN-файла с анализом.', price: 4900, imageUrl: '', createdAt: Date.now() - 86400000 },
  { id: 2, name: 'Испанская партия за белых',             description: 'Классический дебют. Главные линии, ловушки и типичные планы за белых.',            price: 3900, imageUrl: '', createdAt: Date.now() - 86400000 * 7  },
  { id: 3, name: 'Дебют ферзевых пешек: гамбиты',        description: 'Агрессивные начала за белых: гамбит ферзевой пешки, каталонское начало.',          price: 2900, imageUrl: '', createdAt: Date.now() - 86400000 * 14 },
]

const VIDEOS_DATA = [
  { id: 1, title: 'Как считать форсированные варианты', meta: '18 мин · Тактика',   url: 'https://www.youtube.com/' },
  { id: 2, title: 'План в изолированной ферзевой пешке', meta: '26 мин · Стратегия', url: 'https://www.youtube.com/' },
  { id: 3, title: 'Ладейный эндшпиль: правило пяти',    meta: '14 мин · Эндшпиль',  url: 'https://www.youtube.com/' },
]

const STATIC_MODULES = [
  { name: 'Стратегия для рейтинга 1600+', lessons: 18, progress: 88 },
  { name: 'Полный курс эндшпиля',          lessons: 24, progress: 63 },
  { name: 'Дебютный репертуар за белых',   lessons: 12, progress: 100 },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

function cloneTree<T>(v: T): T { return JSON.parse(JSON.stringify(v)) }
function initials(name: string) { return name.split(' ').map((w: string) => w[0]).join('') }

function parseHwPgn(pgn: string): { startFen: string; solution: string[] } {
  try {
    const fenMatch = pgn.match(/\[FEN "(.+?)"\]/)
    const startFen = fenMatch?.[1] ?? 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'
    const g = new Chess()
    g.loadPgn(pgn)
    return { startFen, solution: g.history() }
  } catch {
    return { startFen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', solution: [] }
  }
}

function parsePgnToTree(pgn: string): GameTree {
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

function HwCard({ hw, isStudent, onOpen }: { hw: HW; isStudent?: boolean; onOpen: () => void }) {
  return (
    <article className="rounded-lg border p-5">
      <div className="flex items-center justify-between gap-3">
        <span className="badge">{hw.status}</span>
        <span className="text-xs text-muted-foreground">{hw.assigned}</span>
      </div>
      <h3 className="mt-4 font-semibold">{hw.title}</h3>
      <p className="mt-1 text-sm text-muted-foreground">Срок: {hw.due}</p>
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

export function TeacherHub() {
  const [role, setRole] = useState<Role>('Учитель')
  const [section, setSection] = useState<Section>('overview')
  const [mobile, setMobile] = useState(false)
  const [toast, setToast] = useState('')

  const [students] = useState<Student[]>(INIT_STUDENTS)
  const [homeworks, setHomeworks] = useState<HW[]>(INIT_HW)
  const [courses, setCourses] = useState<Course[]>(INIT_COURSES)
  const [purchasedIds, setPurchasedIds] = useState<number[]>([])
  const [selectedStudentId, setSelectedStudentId] = useState<number | null>(null)
  const [selectedHwId, setSelectedHwId] = useState<number | null>(null)

  const notify = (s: string) => { setToast(s); setTimeout(() => setToast(''), 2500) }
  const isStudent = role === 'Ученик'
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
    ['videos',    'Видеоуроки',         Video],
    ['courses',   'Дебютные курсы',     GraduationCap],
    ['store',     'Витрина',            Store],
    ['openings',  'Мои дебюты',         Library],
    ...(purchasedIds.length > 0 ? [['modules', 'Учебные модули', BookOpen] as const] : []),
  ] as const

  const nav = isStudent ? studentNavBase : teacherNav

  const selectedStudent = students.find(s => s.id === selectedStudentId) ?? null
  const selectedHw = homeworks.find(h => h.id === selectedHwId) ?? null

  const openStudentProfile = (id: number) => { setSelectedStudentId(id); go('studentProfile') }
  const openHwPuzzle       = (id: number) => { setSelectedHwId(id);      go('homeworkPuzzle') }

  const addHomework = (hw: Omit<HW, 'id' | 'attempts' | 'solved'>) => {
    setHomeworks(prev => [...prev, { ...hw, id: Date.now(), attempts: 0, solved: false }])
    notify('Домашнее задание назначено!')
  }
  const updateHomework = (id: number, patch: Partial<HW>) =>
    setHomeworks(prev => prev.map(h => h.id === id ? { ...h, ...patch } : h))
  const purchaseCourse = (id: number) => {
    setPurchasedIds(prev => prev.includes(id) ? prev : [...prev, id])
    notify('Курс куплен! Он доступен в «Учебных модулях».')
  }

  const sectionLabel = (() => {
    if (section === 'studentProfile' && selectedStudent) return selectedStudent.name
    if (section === 'homeworkPuzzle' && selectedHw)      return selectedHw.title
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
        <div className="border-t p-4">
          <p className="text-sm font-medium">{isStudent ? 'Михаил Орлов' : 'Алексей Карпов'}</p>
          <p className="text-xs text-muted-foreground">{isStudent ? 'Ученик · рейтинг 1842' : 'Владелец школы'}</p>
        </div>
      </aside>

      {/* Content */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 shrink-0 items-center gap-3 border-b px-4 md:px-6">
          <button className="icon-button md:hidden" onClick={() => setMobile(true)}><Menu /></button>
          {(section === 'studentProfile' || section === 'homeworkPuzzle') && (
            <button className="icon-button" onClick={() => go(section === 'studentProfile' ? 'students' : (isStudent ? 'overview' : 'homework'))}><ArrowLeft /></button>
          )}
          <b className="truncate text-sm">{sectionLabel}</b>
          <select className="select ml-auto w-auto" value={role} onChange={e => { setRole(e.target.value as Role); setSection(e.target.value === 'Покупатель' ? 'store' : 'overview') }}>
            <option>Учитель</option><option>Ученик</option><option>Покупатель</option>
          </select>
          <button className="icon-button" onClick={() => notify('Новых уведомлений нет')}><Bell /></button>
        </header>

        <main className="min-w-0 flex-1 overflow-y-auto">
          <div className="mx-auto flex max-w-[1440px] flex-col gap-6 p-4 md:p-7">
            {section === 'overview' && (isStudent
              ? <StudentOverview homeworks={homeworks.filter(h => h.studentId === 1)} onOpenHw={openHwPuzzle} />
              : <TeacherOverview go={go} homeworks={homeworks} onOpenHw={openHwPuzzle} />
            )}
            {section === 'students' && <Students students={students} homeworks={homeworks} onSelect={openStudentProfile} notify={notify} />}
            {section === 'studentProfile' && selectedStudent && (
              <StudentProfile student={selectedStudent} homeworks={homeworks.filter(h => h.studentId === selectedStudent.id)} onOpenHw={openHwPuzzle} onAddHw={addHomework} notify={notify} />
            )}
            {section === 'homework' && (
              <HomeworkList homeworks={isStudent ? homeworks.filter(h => h.studentId === 1) : homeworks} students={students} isStudent={isStudent} onOpenHw={openHwPuzzle} />
            )}
            {section === 'homeworkPuzzle' && selectedHw && (
              <HomeworkPuzzle hw={selectedHw} isStudent={isStudent}
                onSolve={(id, attempts) => { updateHomework(id, { solved: true, attempts, status: 'Выполнено', progress: 100 }); notify(`Задача решена! Попыток: ${attempts}`) }}
                onUpdate={!isStudent ? updateHomework : undefined} />
            )}
            {section === 'videos'   && <VideosSection teacher={!isStudent} notify={notify} />}
            {section === 'openings' && <PgnBoard />}
            {section === 'modules'  && <Modules courses={courses} purchasedIds={purchasedIds} />}
            {section === 'sales'    && !isStudent && <Sales />}
            {section === 'store'    && <Storefront courses={courses} purchasedIds={purchasedIds} onPurchase={purchaseCourse} />}
            {section === 'courses'  && (
              <OpeningCourses courses={courses} isTeacher={!isStudent} purchasedIds={purchasedIds}
                onPurchase={purchaseCourse}
                onAdd={c   => setCourses(prev => [{ ...c, id: Date.now(), createdAt: Date.now() }, ...prev])}
                onUpdate={(id, u) => setCourses(prev => prev.map(c => c.id === id ? { ...c, ...u } : c))}
                onDelete={id => setCourses(prev => prev.filter(c => c.id !== id))}
                notify={notify} />
            )}
            {section === 'settings' && !isStudent && <SettingsPanel notify={notify} />}
          </div>
        </main>
      </div>

      {toast && <div role="status" className="fixed bottom-5 right-5 z-50 rounded-lg border bg-background px-4 py-3 text-sm shadow-lg">{toast}</div>}
    </div>
  )
}

// ─── Overview sections ────────────────────────────────────────────────────────

function TeacherOverview({ go, homeworks, onOpenHw }: { go: (s: Section) => void; homeworks: HW[]; onOpenHw: (id: number) => void }) {
  const recent = homeworks.slice(0, 3)
  return (
    <>
      <Head over="Рабочее пространство" title="Добрый день, Алексей" text="Ученики, задания и авторские материалы 64 Lines."
        action={<button className="button" onClick={() => go('homework')}><Plus />Создать задание</button>} />
      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Metric label="Активные ученики" value="4"  note="+1 за месяц" />
        <Metric label="Активных заданий" value={String(homeworks.filter(h => !h.solved).length)} note="не завершено" />
        <Metric label="Видеоуроков"      value="3"  note="в библиотеке" />
        <Metric label="Выполнено"        value={String(homeworks.filter(h => h.solved).length)} note="всего" />
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

function StudentOverview({ homeworks, onOpenHw }: { homeworks: HW[]; onOpenHw: (id: number) => void }) {
  return (
    <>
      <Head over="Личный кабинет" title="Михаил, продолжим тренировку" text="Статистика и задания тренера." />
      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Metric label="Рейтинг"       value="1842" note="+86 за 90 дней" />
        <Metric label="Выполнено"     value={`${homeworks.filter(h => h.solved).length}/${homeworks.length}`} note="заданий" />
        <Metric label="Серия занятий" value="12 дней" note="Личный рекорд" />
        <Metric label="Точность"      value="78%" note="100 задач" />
      </section>
      <div><h2 className="text-lg font-semibold">Мои домашние задания</h2></div>
      <section className="grid gap-3 lg:grid-cols-3">
        {homeworks.map(hw => <HwCard key={hw.id} hw={hw} isStudent onOpen={() => onOpenHw(hw.id)} />)}
      </section>
    </>
  )
}

// ─── Students ────────────────────────────────────────────────────────────────

function Students({ students, homeworks, onSelect, notify }: { students: Student[]; homeworks: HW[]; onSelect: (id: number) => void; notify: (s: string) => void }) {
  return (
    <>
      <Head over="Обучение" title="Мои ученики" text="Нажмите на ученика, чтобы открыть профиль."
        action={<button className="button" onClick={() => notify('Форма приглашения открыта')}><UserPlus />Добавить ученика</button>} />
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

function StudentProfile({ student, homeworks, onOpenHw, onAddHw, notify }: {
  student: Student; homeworks: HW[]; onOpenHw: (id: number) => void
  onAddHw: (hw: Omit<HW, 'id' | 'attempts' | 'solved'>) => void; notify: (s: string) => void
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
    const today = new Date().toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })
    onAddHw({ studentId: student.id, title: hwTitle, assigned: today, due: hwDue ? `до ${hwDue}` : 'без срока', progress: 0, status: 'Новое', pgn: hwPgn })
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
        <button className="button ml-auto" onClick={() => setShowAdd(true)}><Plus />Добавить ДЗ</button>
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

function HomeworkList({ homeworks, students, isStudent, onOpenHw }: { homeworks: HW[]; students: Student[]; isStudent: boolean; onOpenHw: (id: number) => void }) {
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

function HomeworkPuzzle({ hw, isStudent, onSolve, onUpdate }: {
  hw: HW; isStudent: boolean
  onSolve: (id: number, attempts: number) => void
  onUpdate?: (id: number, patch: Partial<HW>) => void
}) {
  const { startFen, solution } = useMemo(() => parseHwPgn(hw.pgn), [hw.pgn])
  const studentColor = useMemo(() => { try { return new Chess(startFen).turn() } catch { return 'w' as const } }, [startFen])
  const [game,         setGame]         = useState(() => { try { return new Chess(startFen) } catch { return new Chess() } })
  const [moveIdx,      setMoveIdx]      = useState(0)
  const [wrongCount,   setWrongCount]   = useState(0)
  const [status,       setStatus]       = useState<'playing' | 'solved' | 'revealed'>(hw.solved ? 'solved' : 'playing')
  const [message,      setMessage]      = useState('')
  const [selected,     setSelected]     = useState<string | null>(null)
  const [dragFrom,     setDragFrom]     = useState<string | null>(null)
  const [dragOver,     setDragOver]     = useState<string | null>(null)
  // Auto-flip: if first move belongs to black, show from black's side
  const [flipped,      setFlipped]      = useState(studentColor === 'b')
  // Teacher edit state
  const [showEdit,     setShowEdit]     = useState(false)
  const [editTitle,    setEditTitle]    = useState(hw.title)
  const [editDue,      setEditDue]      = useState(hw.due)
  const [editPgn,      setEditPgn]      = useState(hw.pgn)
  const [teacherNote,  setTeacherNote]  = useState('')
  const editFileRef = useRef<HTMLInputElement>(null)

  function applyStudentMove(from: string, to: string) {
    if (status !== 'playing' || !isStudent) return
    if (game.turn() !== studentColor) return
    if (moveIdx >= solution.length) return

    const legalMoves = game.moves({ verbose: true })
    const mv = legalMoves.find(m => m.from === from && m.to === to)
    if (!mv) return

    // Check correctness by comparing resulting FEN
    const expectedSan = solution[moveIdx]
    let correct = false
    try {
      const eg = new Chess(game.fen()); eg.move(expectedSan)
      const sg = new Chess(game.fen()); sg.move(mv.san)
      correct = eg.fen() === sg.fen()
    } catch { correct = false }

    if (correct) {
      // Apply student move then auto-play engine responses
      let g = new Chess(game.fen())
      g.move(mv.san)
      let idx = moveIdx + 1
      // Auto-play engine moves
      while (idx < solution.length) {
        const g2 = new Chess(g.fen())
        if (g2.turn() === studentColor) break  // student's turn again
        try { g.move(solution[idx]); idx++ } catch { break }
      }
      setGame(g); setMoveIdx(idx); setSelected(null)
      if (idx >= solution.length) {
        setStatus('solved'); setMessage('🏆 Задача решена! Отличная работа!')
        onSolve(hw.id, wrongCount + 1)
      } else {
        setMessage('✅ Верно! Продолжайте.')
      }
    } else {
      const newWrong = wrongCount + 1
      setWrongCount(newWrong)
      setSelected(null)
      if (newWrong >= 3) {
        // Reveal: play out full solution
        let g = new Chess(startFen)
        solution.forEach(san => { try { g.move(san) } catch {} })
        setGame(g); setMoveIdx(solution.length)
        setStatus('revealed'); setMessage('❌ Попытки исчерпаны. Показано правильное решение.')
      } else {
        setMessage(`❌ Неверно! Осталось попыток: ${3 - newWrong}`)
      }
    }
  }

  function reset() {
    try { setGame(new Chess(startFen)) } catch { setGame(new Chess()) }
    setMoveIdx(0); setWrongCount(0); setStatus('playing'); setMessage(''); setSelected(null)
  }

  const canMove = isStudent && status === 'playing' && game.turn() === studentColor

  return (
    <>
      <Head
        over={isStudent ? 'Домашнее задание' : 'Просмотр задания'}
        title={hw.title}
        text={isStudent
          ? (status === 'solved' ? `✅ Решено с ${hw.solved ? hw.attempts : wrongCount + 1} попыток` : `Попытки: ${wrongCount}/3 · Срок: ${hw.due}`)
          : `Ученик: ${hw.status} · Срок: ${hw.due}`}
        action={!isStudent && onUpdate
          ? <button className="outline-button" onClick={() => setShowEdit(true)}><Pencil className="size-4" />Редактировать</button>
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
              onClick={() => { onUpdate?.(hw.id, {}); alert('Комментарий сохранён (в памяти)') }}>
              Сохранить комментарий
            </button>
          </div>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(280px,500px)_1fr]">
        <div>
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
        </div>

        <div className="flex flex-col gap-4">
          <div className="rounded-lg border p-5">
            <h3 className="font-semibold">Детали задания</h3>
            <div className="mt-4 space-y-3 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Назначено</span><span>{hw.assigned}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Срок</span><span>{hw.due}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Статус</span><span className="badge">{status === 'solved' ? 'Выполнено' : hw.status}</span></div>
              {(status === 'solved' || hw.solved) && <div className="flex justify-between"><span className="text-muted-foreground">Попыток</span><span className="font-semibold">{hw.solved ? hw.attempts : wrongCount + 1}</span></div>}
            </div>
          </div>
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
          <label className="field">Срок<input className="input" value={editDue} onChange={e => setEditDue(e.target.value)} placeholder="до 20 июля" /></label>
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
            onUpdate(hw.id, { title: editTitle, due: editDue, pgn: editPgn })
            setShowEdit(false)
          }}>Сохранить изменения</button>
        </Modal>
      )}
    </>
  )
}

// ─── Videos ───────────────────────────────────────────────────────────────────

function VideosSection({ teacher, notify }: { teacher: boolean; notify: (s: string) => void }) {
  const [videos, setVideos] = useState(VIDEOS_DATA)
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
          <button className="button" onClick={() => {
            if (!form.title || !form.url) { notify('Заполните все поля'); return }
            setVideos(prev => [...prev, { id: Date.now(), ...form }])
            setShow(false); notify('Видео опубликовано!')
          }}>Опубликовать</button>
        </Modal>
      )}
    </>
  )
}

// ─── PGN Board (full tree editor) ────────────────────────────────────────────

export function PgnBoard() {
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

  // Candidate continuations from tree at current path
  const { nodes: candidateNodes } = walkTo(tree, path)
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

      <section className="grid gap-6 rounded-lg border p-4 lg:grid-cols-[minmax(280px,520px)_1fr]">
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

function Modules({ courses, purchasedIds }: { courses: Course[]; purchasedIds: number[] }) {
  const purchased = courses.filter(c => purchasedIds.includes(c.id))
  const items = [...purchased.map(c => ({ name: c.name, lessons: 20, progress: 0 })), ...STATIC_MODULES]
  return (
    <>
      <Head over="Программы" title="Учебные модули" text="Ваши активные учебные программы." />
      <div className="grid gap-3">
        {items.map((m, i) => (
          <article key={i} className="flex flex-col gap-4 rounded-lg border p-5 md:flex-row md:items-center">
            <span className="flex size-11 items-center justify-center rounded-md border font-mono text-sm">{String(i + 1).padStart(2, '0')}</span>
            <div className="flex-1">
              <h3 className="font-medium">{m.name}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{m.lessons} уроков · Заполнено на {m.progress}%</p>
              <div className="mt-3 max-w-md"><ProgressBar value={m.progress} /></div>
            </div>
            <button className="outline-button">Открыть</button>
          </article>
        ))}
      </div>
    </>
  )
}

// ─── Sales ────────────────────────────────────────────────────────────────────

function Sales() {
  return (
    <>
      <Head over="Коммерция" title="Продажи" text="Статистика продаж курсов и материалов." />
      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Metric label="За 30 дней"  value="184 900 ₽" note="+18%" />
        <Metric label="Заказов"      value="52"        note="Средний чек 3 556 ₽" />
        <Metric label="Конверсия"    value="6,8%"      note="Из просмотра" />
        <Metric label="Возвраты"     value="0 ₽"       note="Нет запросов" />
      </section>
    </>
  )
}

// ─── Storefront (Витрина) ─────────────────────────────────────────────────────

function Storefront({ courses, purchasedIds, onPurchase }: { courses: Course[]; purchasedIds: number[]; onPurchase: (id: number) => void }) {
  const [detailId, setDetailId] = useState<number | null>(null)
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

type CourseForm = { name: string; description: string; price: string; imageUrl: string }

function OpeningCourses({ courses, isTeacher, purchasedIds, onPurchase, onAdd, onUpdate, onDelete, notify }: {
  courses: Course[]; isTeacher: boolean; purchasedIds: number[]
  onPurchase: (id: number) => void
  onAdd: (c: Omit<Course, 'id' | 'createdAt'>) => void
  onUpdate: (id: number, u: Partial<Course>) => void
  onDelete: (id: number) => void
  notify: (s: string) => void
}) {
  const [modal, setModal] = useState<null | 'add' | 'detail' | number>(null)
  const [detailId, setDetailId] = useState<number | null>(null)
  const [form, setForm] = useState<CourseForm>({ name: '', description: '', price: '', imageUrl: '' })
  const fileRef = useRef<HTMLInputElement>(null)

  const sorted = [...courses].sort((a, b) => b.createdAt - a.createdAt)
  const detailCourse = courses.find(c => c.id === detailId)

  function openAdd() { setForm({ name: '', description: '', price: '', imageUrl: '' }); setModal('add') }
  function openEdit(c: Course) { setForm({ name: c.name, description: c.description, price: String(c.price), imageUrl: c.imageUrl }); setModal(c.id) }
  function handleImg(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]; if (!f) return
    const r = new FileReader(); r.onload = () => setForm(p => ({ ...p, imageUrl: String(r.result) })); r.readAsDataURL(f)
  }
  function handleSave() {
    if (!form.name || !form.price) { notify('Заполните название и цену'); return }
    const data = { name: form.name, description: form.description, price: Number(form.price), imageUrl: form.imageUrl }
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
                <div className="mt-4 flex items-center justify-between">
                  <b className="text-lg">{c.price.toLocaleString('ru-RU')} ₽</b>
                  {purchased && <span className="badge"><Check className="size-3" />Куплен</span>}
                </div>
                <div className="mt-3 flex gap-2">
                  {isTeacher ? (
                    <>
                      <button className="outline-button flex-1" onClick={() => openEdit(c)}><Pencil className="size-3" />Изменить</button>
                      <button className="icon-button border rounded-md" onClick={() => { onDelete(c.id); notify('Курс удалён.') }}><Trash2 /></button>
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

// ─── Settings ─────────────────────────────────────────────────────────────────

function SettingsPanel({ notify }: { notify: (s: string) => void }) {
  return (
    <>
      <Head over="Управление" title="Настройки 64 Lines" text="Доступы, Telegram и параметры школы." />
      <section className="settings-section">
        <h2>Основные настройки</h2>
        <div className="setting-row">
          <div><b>Название школы</b><p>Отображается в кабинете ученика.</p></div>
          <input className="input max-w-xs" defaultValue="64 Lines" />
        </div>
        <div className="setting-row">
          <div><b>Telegram-уведомления</b><p>Напоминания ученикам о заданиях.</p></div>
          <button className="outline-button" onClick={() => notify('Настройки Telegram сохранены')}>Настроить</button>
        </div>
      </section>
    </>
  )
}
