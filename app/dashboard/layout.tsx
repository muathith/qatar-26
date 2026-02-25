import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'لوحة التحكم - حكومي',
  description: 'لوحة إدارة الطلبات',
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
