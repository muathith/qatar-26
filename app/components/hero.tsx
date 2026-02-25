import Link from 'next/link'
import { Button } from './ui/button'
import { ChevronLeft, Shield } from 'lucide-react'

export function Hero() {
  return (
    <div className="relative min-h-[520px] flex items-center justify-center text-white overflow-hidden">
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{
          backgroundImage: "url('/head.avif')",
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/50 to-black/70" />

      <div className="relative w-full container mx-auto px-4 py-16 text-center">
        <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full px-4 py-1.5 text-sm font-medium mb-6">
          <Shield className="w-4 h-4 text-[#e8c06a]" />
          <span>البوابة الرسمية لحكومة دولة قطر</span>
        </div>

        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-5 leading-tight drop-shadow-lg">
          قطر الأكثر أماناً عالمياً
        </h1>

        <p className="text-base sm:text-lg max-w-2xl mx-auto leading-relaxed text-white/85 mb-10">
          واصلت قطر تصدرها لدول العالم في معدلات الأمان للمرة الخامسة على التوالي،
          متفوقةً على 142 بلداً وفق مؤشر نامبيو للأمان.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link href="/submit">
            <Button className="bg-[#8A1538] hover:bg-[#6d1030] text-white px-8 py-6 text-base font-semibold rounded-xl shadow-lg w-full sm:w-auto">
              تقديم طلب خدمة البطاقة السنوية
              <ChevronLeft className="w-4 h-4 mr-2" />
            </Button>
          </Link>
          <Link href="#services">
            <Button variant="outline" className="bg-white/10 backdrop-blur-sm border-white/30 text-white hover:bg-white/20 px-8 py-6 text-base font-semibold rounded-xl w-full sm:w-auto">
              استعرض الخدمات
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}
