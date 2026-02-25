import { Button } from "@/app/components/ui/button"
import { Card, CardContent } from "@/app/components/ui/card"
import { Building2, Clock, Share2, Bookmark, ChevronLeft } from 'lucide-react'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/app/components/ui/accordion"
import Link from "next/link"

export function ServiceDetails() {
  return (
    <div className="flex flex-col gap-6 p-4" dir="rtl">
      <div className="flex justify-end gap-4">
        <Button variant="outline" size="icon">
          <Share2 className="h-5 w-5" />
        </Button>
        <Button variant="outline" size="icon">
          <Bookmark className="h-5 w-5" />
        </Button>
      </div>

      <h1 className="text-2xl font-bold text-left">طلب تجديد البطاقة الصحية</h1>

      <Card dir="rtl">
        <CardContent className="p-6 space-y-4"  dir="rtl">
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">مؤسسة حمد الطبية</span>
            <Building2 className="h-5 w-5" />
          </div>
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">خدمة إلكترونية</span>
            <span className="text-sm">:نوع الخدمة</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">مختلط (إلكتروني وورقي)</span>
            <span className="text-sm">:نظام التقديم</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">19 ديسمبر 2020</span>
            <Clock className="h-5 w-5" />
          </div>
        </CardContent>
      </Card>
      <Link href="/submit">
      <Button className="w-full bg-[#8A1538] hover:bg-[#6F102D] text-white">
        تقديم
      </Button>
      </Link>
      
      <Accordion type="single" collapsible className="w-full">
        <AccordionItem value="description">
          <AccordionTrigger className="text-right">
            <div className="flex items-center gap-2">
              <span>وصف الخدمة</span>
              <span className="bg-blue-100 rounded-full w-6 h-6 flex items-center justify-center text-primary">
                1
              </span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="text-right">
            محتوى وصف الخدمة هنا
          </AccordionContent>
        </AccordionItem>
        <AccordionItem value="instructions">
          <AccordionTrigger className="text-right">
            <div className="flex items-center gap-2">
              <span>الإرشادات</span>
              <span className="bg-blue-100 rounded-full w-6 h-6 flex items-center justify-center text-primary">
                2
              </span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="text-right">
            محتوى الإرشادات هنا
          </AccordionContent>
        </AccordionItem>
        <AccordionItem value="fees">
          <AccordionTrigger className="text-right">
            <div className="flex items-center gap-2">
              <span>الرسوم</span>
              <span className="bg-blue-100 rounded-full w-6 h-6 flex items-center justify-center text-primary">
                3
              </span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="text-right">
            محتوى الرسوم هنا
          </AccordionContent>
        </AccordionItem>
        <AccordionItem value="additional">
          <AccordionTrigger className="text-right">
            <div className="flex items-center gap-2">
              <span>معلومات إضافية</span>
              <span className="bg-blue-100 rounded-full w-6 h-6 flex items-center justify-center text-primary">
                4
              </span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="text-right">
            محتوى المعلومات الإضافية هنا
          </AccordionContent>
        </AccordionItem>
      </Accordion>

   
    </div>
  )
}

