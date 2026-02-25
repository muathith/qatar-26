'use client'

import { useState } from 'react'
import { Button } from "@/app/components/ui/button"
import { Card } from "@/app/components/ui/card"
import { MessageSquareText, ChevronLeft } from 'lucide-react'
import Image from "next/image"
import Link from "next/link"

export default function AboutQatar() {
  const [language, setLanguage] = useState('ar')

  const navigationItems = [
    { title: "رؤية قطر الوطنية 2030", href: "#" },
    { title: "الحكومة والتشريعات", href: "#" },
    { title: "الدستور", href: "#" },
    { title: "مجلس الشورى", href: "#" },
    { title: "المجلس البلدي المركزي", href: "#" },
    { title: "أهداف التنمية المستدامة", href: "#" },
    { title: "حكومي", href: "#" },
    { title: "العلم الوطني", href: "#" },
    { title: "اليوم الوطني", href: "#" },
    { title: "اليوم الرياضي للدولة", href: "#" },
  ]

  const categories = [
    {
      title: "كبار السن",
      icon: (
        <Image src={'/1.svg'} width={ 80} height={80}alt=''/>

      ),
    },
    {
      title: "العمالة الوافدة",
      icon: (
        <Image src={'/2.svg'} width={ 80} height={80}alt=''/>

      ),
    },
    {
      title: "الأشخاص ذوو الإعاقة",
      icon: (
        <Image src={'/3.svg'} width={ 80} height={80}alt=''/>

      ),
    },  {
        title: "المرأه",
        icon: (
            <Image src={'/4.svg'}width={ 80} height={80} alt=''/>

        ),
      },  {
        title: "الشباب",
        icon: (
         <Image src={'/5.svg'} width={ 80} height={80} alt=''/>
        ),
      },
  ]

  return (
    <div className="min-h-screen bg-gray-50" dir={language === 'ar' ? 'rtl' : 'ltr'}>
  

      <main className="max-w-3xl mx-auto px-4 py-8">
        <h1 className="text-4xl font-bold text-[#8A1538] mb-8 text-right">عن قطر</h1>
        
        <nav className="space-y-2 mb-12">
          {navigationItems.map((item, index) => (
            <Link
              key={index}
              href={item.href}
              className="flex items-center justify-between p-3 bg-white rounded-lg hover:bg-gray-50 transition-colors"
            >
              <span className="text-lg text-gray-900">{item.title}</span>
              <ChevronLeft className="w-5 h-5 text-gray-400" />
            </Link>
          ))}
        </nav>

        <section className="mb-12">
          <h2 className="text-2xl font-bold text-[#8A1538] mb-4 text-right">قطر للجميع</h2>
          <p className="text-gray-700 mb-6 text-right leading-relaxed">
            نشجع الإنصاف ونكفل المشاركة الشاملة للفئات المهمشة والأقل حظاً، وذلك في سبيل تحقيق أهداف التنمية المستدامة.
          </p>
          <p className="text-gray-700 mb-8 text-right">
            اطلع على ما تقدمه حكومة دولة قطر للفئات التالية:
          </p>

          <div className="space-y-4">
            {categories.map((category, index) => (
              <Card key={index} className="p-4 hover:bg-gray-50 transition-colors cursor-pointer">
                <div className="flex items-center justify-between">
                  <div className="text-[#8A1538]">{category.icon}</div>
                  <h3 className="text-xl font-semibold text-[#8A1538]">{category.title}</h3>
                </div>
              </Card>
            ))}
          </div>
        </section>

        <div className="fixed bottom-6 left-6">
          <Button variant="secondary" size="icon" className="rounded-full h-12 w-12">
            <MessageSquareText className="h-6 w-6" />
          </Button>
        </div>
      </main>
    </div>
  )
}

