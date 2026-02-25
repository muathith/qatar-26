import { Facebook, Instagram, Youtube } from 'lucide-react'
import Image from "next/image"
import Link from "next/link"

export function Footer() {
  return (
    <footer className="bg-gray-900 text-white">
      <div className="max-w-7xl mx-auto  lg:px-8">
        <div className="text-center mb-8 bg-[#891538] w-full p-4  rounded-t-lg">
          <h2 className="text-2xl mb-6">حكومي - بوابتك الرسمية للمعلومات والخدمات في قطر</h2>
          <div className="flex justify-center gap-8">
            <Link href="#" className="hover:opacity-80">
              <Instagram className="w-6 h-6" />
            </Link>
            <Link href="#" className="hover:opacity-80">
              <Youtube className="w-6 h-6" />
            </Link>
            <Link href="#" className="hover:opacity-80">
              <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
              </svg>
            </Link>
            <Link href="#" className="hover:opacity-80">
              <Facebook className="w-6 h-6" />
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 text-center md:text-right mb-12 ">
          <div>
            <h3 className="text-xl mb-4">روابط سريعة</h3>
            <ul className="space-y-2">
              <li><Link href="#" className="hover:underline">علاماتي المرجعية</Link></li>
              <li><Link href="#" className="hover:underline">الخرائط</Link></li>
              <li><Link href="#" className="hover:underline">الأدوات المساعدة</Link></li>
              <li><Link href="#" className="hover:underline">تطبيقات الجوال</Link></li>
              <li><Link href="#" className="hover:underline">الأشخاص ذوو الإعاقة</Link></li>
            </ul>
          </div>
          
          <div>
            <h3 className="text-xl mb-4">الدعم</h3>
            <ul className="space-y-2">
              <li><Link href="#" className="hover:underline">الاتصال بنا</Link></li>
              <li><Link href="#" className="hover:underline">تقديم طلب الدعم</Link></li>
              <li><Link href="#" className="hover:underline">متابعة طلب الدعم</Link></li>
              <li><Link href="#" className="hover:underline">الأسئلة الشائعة</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="text-xl mb-4">معلومات</h3>
            <ul className="space-y-2">
              <li><Link href="#" className="hover:underline">شروط الاستخدام</Link></li>
              <li><Link href="#" className="hover:underline">سياسة الخصوصية</Link></li>
              <li><Link href="#" className="hover:underline">خريطة الموقع</Link></li>
            </ul>
          </div>

          <div className="flex flex-col items-center md:items-end gap-4 ">
            <Image
              src="/Hukoomi-new-logo-ar.svg"
              alt="Qatar Government Logo"
              width={200}
              height={80}
              className="invert"
            />
            <div className="flex gap-4">
              <Link href="#" className="hover:opacity-80">
                <Image
                  src="/app-store.svg"
                  alt="Download on the App Store"
                  width={140}
                  height={42}
                  className="h-12 w-auto invert m-1"
                />
              </Link>
              <Link href="#" className="hover:opacity-80">
                <Image
                  src="/google-play.svg"
                  alt="Get it on Google Play"
                  width={70}
                  height={32}
                  className="h-12 w-auto invert"
                />
              </Link>
            </div>
          </div>
        </div>

        <div className="text-center pt-8 border-t border-white/20">
          <div className="flex justify-center mb-4">
           
          </div>
          <p className="text-sm">© 2025 حكومة قطر</p>
        </div>
      </div>
    </footer>
  )
}
