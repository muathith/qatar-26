"use client"

import { useEffect } from 'react'
import { StatisticsSection } from '@/app/components/statistics-section'
import { Hero } from '@/app/components/hero'
import { SupportSection } from '@/app/components/support'
import Link from 'next/link'
import { ChevronLeft, Bookmark, ArrowLeft } from 'lucide-react'
import Image from 'next/image'
import { db } from '@/lib/firebase'
import { doc, increment, setDoc } from 'firebase/firestore'

const services = [
  { name: 'طلب خدمة البطاقة الصحية ', href: '/submit' },
  { name: 'الاستعلام عن حالة البطاقة الصحية', href: '/submit' },
  { name: 'طلب بطاقة موظف جديدة', href: '/submit' },
  { name: 'خدمات الرعاية الصحية الأولية', href: '/submit' },
]

const news = [
  {
    id: 1,
    image: '/bg.avif',
    title: 'تطوير المشاريع الحضرية',
    description: 'مبادرات جديدة لتطوير المناطق الحضرية وتحسين جودة الحياة في قطر',
    date: 'يناير 2025',
  },
  {
    id: 2,
    title: 'اجتماع مجلس الإدارة الوطني',
    image: '/kaw.avif',
    description: 'مناقشة الخطط الاستراتيجية والمشاريع المستقبلية ضمن رؤية 2030',
    date: 'فبراير 2025',
  },
  {
    id: 3,
    image: '/MOJLogo2024.jpg',
    title: 'مبادرات التنمية المستدامة',
    description: 'إطلاق برامج جديدة للتنمية المستدامة والحفاظ على البيئة الطبيعية',
    date: 'مارس 2025',
  },
]

export default function HomePage() {
  useEffect(() => {
    const TRACKED_AT_KEY = 'main-page-visit-tracked-at'
    const now = Date.now()
    const lastTrackedAt = Number(window.sessionStorage.getItem(TRACKED_AT_KEY) ?? '0')

    // Avoid duplicate increments from React Strict Mode remounts in development.
    if (Number.isFinite(lastTrackedAt) && now - lastTrackedAt < 2000) return

    window.sessionStorage.setItem(TRACKED_AT_KEY, String(now))
    void setDoc(
      doc(db, 'analytics', 'main-page'),
      { visits: increment(1), updatedAt: now },
      { merge: true },
    ).catch((error) => {
      console.error(error)
    })
  }, [])

  return (
    <div dir="rtl" className="min-h-screen bg-gray-50">
      <Hero />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-6 sm:-mt-8 relative z-10 space-y-6 pb-12">

        <div id="services" className="bg-white rounded-2xl shadow-lg overflow-hidden">
          <div className="px-4 sm:px-6 pt-5 sm:pt-6 pb-2 border-b border-gray-100">
            <h2 className="text-lg font-bold text-gray-900">الخدمات الإلكترونية</h2>
            <p className="text-sm text-gray-500 mt-0.5">اختر الخدمة التي تحتاجها</p>
          </div>
          <div className="divide-y divide-gray-50">
            {services.map((service, i) => (
              <Link key={i} href={service.href}
                className="flex items-start sm:items-center justify-between gap-3 px-4 sm:px-6 py-4 hover:bg-gray-50 transition-colors group">
                <div className="flex items-start sm:items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-[#8A1538]/10 flex items-center justify-center flex-shrink-0">
                    <Bookmark className="w-4 h-4 text-[#8A1538]" />
                  </div>
                  <span className="text-gray-800 text-sm sm:text-base font-medium group-hover:text-[#8A1538] transition-colors leading-relaxed">
                    {service.name}
                  </span>
                </div>
                <ChevronLeft className="w-4 h-4 text-gray-400 group-hover:text-[#8A1538] transition-colors flex-shrink-0 mt-1 sm:mt-0" />
              </Link>
            ))}
          </div>
          <div className="px-4 sm:px-6 py-4 bg-gray-50/50">
            <Link href="/submit"
              className="flex items-center gap-2 text-[#8A1538] text-sm font-semibold hover:underline">
              <ArrowLeft className="w-4 h-4" />
              عرض جميع الخدمات
            </Link>
          </div>
        </div>

        <StatisticsSection />

        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
          <div className="px-4 sm:px-6 pt-5 sm:pt-6 pb-4 border-b border-gray-100">
            <h2 className="text-lg font-bold text-gray-900">آخر الأخبار</h2>
            <p className="text-sm text-gray-500 mt-0.5">تابع أحدث الأخبار والإعلانات الرسمية</p>
          </div>
          <div className="divide-y divide-gray-100">
            {news.map((item) => (
              <div key={item.id} className="flex flex-col sm:flex-row gap-4 p-4 sm:p-5 hover:bg-gray-50 transition-colors">
                <div className="flex-shrink-0 w-full sm:w-20 h-44 sm:h-20 rounded-xl overflow-hidden bg-gray-100">
                  <Image
                    src={item.image}
                    alt={item.title}
                    width={80}
                    height={80}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-900 text-sm leading-snug mb-1">{item.title}</h3>
                  <p className="text-gray-500 text-xs leading-relaxed line-clamp-2">{item.description}</p>
                  <span className="text-xs text-[#8A1538] font-medium mt-2 block">{item.date}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
          <div className="px-4 sm:px-6 pt-5 sm:pt-6 pb-4 border-b border-gray-100">
            <h2 className="text-lg font-bold text-gray-900">الحكومة</h2>
            <p className="text-sm text-gray-500 mt-0.5">معلومات عن القيادة والمؤسسات الحكومية</p>
          </div>
          <div className="p-4 sm:p-5 flex flex-col sm:flex-row gap-4 sm:gap-5">
            <div className="flex-shrink-0 w-full sm:w-28 h-64 sm:h-36 rounded-xl overflow-hidden bg-gray-100">
              <Image src="/amirs.png" alt="سمو الأمير" width={112} height={144} className="w-full h-full object-cover" />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-[#8A1538] text-base mb-1">سمو الأمير</h3>
              <p className="text-sm text-gray-700 leading-relaxed">
                تولى حضرة صاحب السمو الشيخ تميم بن حمد آل ثاني مقاليد الحكم في البلاد يوم 25 يونيو 2013، ويقود قطر نحو تحقيق رؤية 2030.
              </p>
              <div className="mt-3 text-xs text-gray-400">الدوحة، 3 يونيو 1980</div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
          <div className="px-4 sm:px-6 pt-5 sm:pt-6 pb-4 border-b border-gray-100">
            <h2 className="text-lg font-bold text-gray-900">قطر للجميع</h2>
            <p className="text-sm text-gray-500 mt-0.5">خدمات مخصصة لجميع فئات المجتمع</p>
          </div>
          <div className="p-4 sm:p-5 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
            {[
              { label: 'كبار السن', img: '/1.svg' },
              { label: 'العمالة الوافدة', img: '/2.svg' },
              { label: 'ذوو الإعاقة', img: '/3.svg' },
              { label: 'المرأة', img: '/4.svg' },
              { label: 'الشباب', img: '/5.svg' },
            ].map((cat) => (
              <div key={cat.label}
                className="flex flex-col items-center gap-2 p-3 rounded-xl hover:bg-[#8A1538]/5 cursor-pointer transition-colors group">
                <div className="w-14 h-14 rounded-full bg-[#8A1538]/10 flex items-center justify-center group-hover:bg-[#8A1538]/20 transition-colors">
                  <Image src={cat.img} alt={cat.label} width={36} height={36} />
                </div>
                <span className="text-xs text-center font-medium text-gray-700 group-hover:text-[#8A1538] transition-colors leading-tight">
                  {cat.label}
                </span>
              </div>
            ))}
          </div>
        </div>

        <SupportSection />
      </div>
    </div>
  )
}
