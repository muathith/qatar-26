'use client'

import { ArrowLeft, Maximize2 } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/app/components/ui/button'
import { Card } from '@/app/components/ui/card'

export function MapSection() {
  const [isExpanded, setIsExpanded] = useState(false)

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="flex justify-between items-center mb-4">
        <Button 
          variant="ghost" 
          className="text-[#8A1538] hover:text-[#8A1538]/80"
          onClick={() => window.history.back()}
        >
          <ArrowLeft className="ml-2 h-4 w-4" />
          توسيع العرض
        </Button>
      </div>
      
      <Card className="relative overflow-hidden">
        <div className={`relative ${isExpanded ? 'h-[80vh]' : 'h-[400px]'}`}>
          <iframe
            src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d115827.45507040963!2d51.48670895!3d25.2866098!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3e45c534ffdce87f%3A0x1cfa88cf812b4032!2sDoha%2C%20Qatar!5e0!3m2!1sen!2sus!4v1704552161717!5m2!1sen!2sus"
            width="100%"
            height="100%"
            style={{ border: 0 }}
            allowFullScreen
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          />
          <Button
            variant="secondary"
            size="icon"
            className="absolute top-4 right-4 bg-white hover:bg-gray-100"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            <Maximize2 className="h-4 w-4" />
          </Button>
        </div>
      </Card>
    </div>
  )
}
