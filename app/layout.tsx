import { Footer } from "@/app/components/footer";
import "./globals.css";
import { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { MenuIcon } from "lucide-react";

export const metadata: Metadata = {
  title: "حكومي - البوابة الرسمية لدولة قطر",
  description: "البوابة الرسمية لحكومة دولة قطر",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ar" dir="rtl">
      <head />
      <body className="min-h-screen flex flex-col bg-gray-50">
        <header className="border-b sticky top-0 bg-white z-50 shadow-sm">
          <div className="container mx-auto px-3 sm:px-4 py-2 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button className="p-2 rounded-md hover:bg-gray-100 transition-colors">
                <MenuIcon className="w-5 h-5 text-gray-600" />
              </button>
            </div>
            <Link href="/">
              <Image
                src="/loho.avif"
                alt="Qatar Government Logo"
                width={180}
                height={50}
                className="h-9 sm:h-12 w-auto"
              />
            </Link>
          </div>
        </header>
        <main className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
