import Image from "next/image"
import { Card, CardContent } from "@/app/components/ui/card"

export default function NewsFeed() {
  const newsItems = [
    {
      id: 1,
      image: "/bg.avif",
      title: "تطوير المشاريع الحضرية",
      description: "مبادرات جديدة لتطوير المناطق الحضرية وتحسين جودة الحياة"
    },
    {
      id: 2,
      title: "اجتماع مجلس الإدارة",
      image: "/kaw.avif",
      description: "مناقشة الخطط الاستراتيجية والمشاريع المستقبلية"
    },
    {
      id: 3,
      image: "/MOJLogo2024.jpg",
      title: "مبادرات التنمية المستدامة",
      description: "إطلاق برامج جديدة للتنمية المستدامة والحفاظ على البيئة"
    }
  ]

  return (
    <div dir="rtl" className="max-w-2xl mx-auto p-4 space-y-4 bg-[#891538] rounded-lg mt-2">
      {newsItems.map((item) => (
        <Card key={item.id} className="overflow-hidden">
          <CardContent className="p-0">
            <Image
              src={item.image}
              alt={item.title}
              width={600}
              height={300}
              className="w-full h-48 object-cover"
            />
            <div className="p-4">
              <h3 className="text-lg font-bold text-gray-900 mb-2">{item.title}</h3>
              <p className="text-gray-600 text-sm">{item.description}</p>
            </div>
          </CardContent>
        </Card>
      ))}

      <Card className="overflow-hidden">
        <CardContent className="p-4">
          <div className="flex justify-center mb-4">
            <Image
              src="/loho.avif"
              alt="Corporate Logo"
              width={120}
              height={60}
              className="h-12 object-contain"
            />
          </div>
          <div className="text-center space-y-2">
            <h3 className="font-bold text-gray-900">المركز الإعلامي</h3>
            <p className="text-sm text-gray-600">آخر الأخبار والتحديثات</p>
          </div>
        </CardContent>
      </Card>

    </div>
  )
}

