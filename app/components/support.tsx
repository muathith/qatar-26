import { Headphones, MessageSquare, HelpCircle } from 'lucide-react'
import { Card } from '@/app/components/ui/card'
import Link from 'next/link'

export function SupportSection() {
  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12" dir='rtl'>
      <Card className="bg-gray-50/50">
        <div className="p-8">
          <h2 className="text-2xl font-bold text-right mb-8">هل لديك اسئلة ؟</h2>
          <div className="grid gap-6">
            <Link 
              href="#"
              className="flex items-center justify-between gap-4 text-lg hover:text-[#8A1538] transition-colors"
            >
              <span>اتصل وتحدث إلى وكيل خدمة العملاء.</span>
              <div className="w-10 h-10 rounded-full bg-[#8A1538] flex items-center justify-center flex-shrink-0">
                <Headphones className="h-5 w-5 text-white" />
              </div>
            </Link>
            
            <Link 
              href="#"
              className="flex items-center justify-between gap-4 text-lg hover:text-[#8A1538] transition-colors"
            >
              <span>تواصل مع فريق الدعم لدينا.</span>
              <div className="w-10 h-10 rounded-full bg-[#8A1538] flex items-center justify-center flex-shrink-0">
                <MessageSquare className="h-5 w-5 text-white" />
              </div>
            </Link>
            
            <Link 
              href="#"
              className="flex items-center justify-between gap-4 text-lg hover:text-[#8A1538] transition-colors"
            >
              <span>تصفح الأسئلة الشائعة.</span>
              <div className="w-10 h-10 rounded-full bg-[#8A1538] flex items-center justify-center flex-shrink-0">
                <HelpCircle className="h-5 w-5 text-white" />
              </div>
            </Link>
          </div>
        </div>
      </Card>
    </div>
  )
}

