'use client';

import Image from 'next/image';
import { Card } from '@/app/components/ui/card';
import { cn } from '@/lib/utils';
import { Button } from './ui/button';
import { MessageSquareText } from 'lucide-react';

const categories = [
  {
    id: 'elderly',
    title: 'كبار السن',
    icon: (
      <svg
        className="w-8 h-8"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      >
        <path d="M18 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-2V4a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2H6a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h12zM8 4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2H8V4z" />
        <circle cx="12" cy="10" r="1" />
        <path d="M12 12v4" />
      </svg>
    ),
  },
  {
    id: 'workers',
    title: 'العمالة الوافدة',
    icon: (
      <svg
        className="w-8 h-8"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      >
        <path d="M12 4a4 4 0 0 0-4 4v2h8V8a4 4 0 0 0-4-4z" />
        <path d="M6 10v12h12V10" />
        <path d="M10 14h4" />
        <path d="M10 18h4" />
      </svg>
    ),
  },
  {
    id: 'disabled',
    title: 'الأشخاص ذوو الإعاقة',
    icon: (
      <svg
        className="w-8 h-8"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      >
        <circle cx="12" cy="12" r="3" />
        <circle cx="12" cy="12" r="8" />
        <path d="M12 19v-2" />
        <path d="M12 7V5" />
        <path d="M5 12H3" />
        <path d="M21 12h-2" />
      </svg>
    ),
  },
  {
    id: 'women',
    title: 'المرأة',
    icon: (
      <svg
        className="w-8 h-8"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      >
        <circle cx="12" cy="8" r="4" />
        <path d="M12 12v8" />
        <path d="M8 16h8" />
      </svg>
    ),
  },
  {
    id: 'youth',
    title: 'الشباب',
    icon: (
      <svg
        className="w-8 h-8"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      >
        <rect x="4" y="4" width="16" height="12" rx="2" />
        <path d="M8 20h8" />
        <path d="M12 16v4" />
      </svg>
    ),
  },
];

export default function ServicesPage() {
  return (
    <div className="px-4 space-y-3 sm:space-y-4" dir="rtl">
      {/* Header */}
      <header className="bg-white border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Image
            src="/Hukoomi-new-logo-ar.svg"
            alt="Qatar Government Logo"
            width={120}
            height={40}
            className="h-10 w-auto"
          />
          <button className="p-2">
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
      <h1 className="text-4xl font-bold text-[#8A1538] mb-6 text-right">الحكومة</h1>
        
        <p className="text-gray-700 mb-8 text-lg leading-relaxed text-right">
          هيئة سيادية عليا، تمثل السلطة التنفيذية، ويرأسها سمو الأمير المفدى، وتضم في هيكلها رئاسة مجلس الوزراء، ومجلس الوزراء، والوزارات، إضافة لمجموعة من المجالس العليا، والأجهزة الحكومية المختلفة.
        </p>

        <Card className="bg-white rounded-lg overflow-hidden mb-8">
          <div className="aspect-[3/4] relative">
            <img
              src="/amirs.png"
              alt="Official Portrait"
              className="object-cover"
            />
          </div>
        </Card>

        <div className="space-y-6">
          <h2 className="text-2xl font-bold text-[#8A1538] text-right">سمو الأمير</h2>
          
          <div className="space-y-4">
            <h3 className="text-xl font-semibold text-[#8A1538] text-right">نبذة</h3>
            <p className="text-gray-700 text-right">
              تولى حضرة صاحب السمو الشيخ تميم بن حمد آل ثاني مقاليد الحكم في البلاد يوم 25 يونيو 2013.
            </p>
          </div>

          <div className="space-y-2">
            <h3 className="text-xl font-semibold text-[#8A1538] text-right">مكان وتاريخ الميلاد</h3>
            <p className="text-gray-700 text-right">الدوحة، 3 يونيو 1980</p>
          </div>
        </div>

        <div className="mt-8">
          <Button 
            variant="ghost" 
            className="w-full flex items-center gap-2 text-[#8A1538]"
          >
            <MessageSquareText className="w-6 h-6" />
            <span>عرض المزيد من المعلومات</span>
          </Button>
        </div>
        
      </main>
    </div>
  );
}
