import { Loader2 } from 'lucide-react'

interface FullPageLoaderProps {
  message?: string
}

export function FullPageLoader({ message = " جاري التحقق..." }: FullPageLoaderProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <div className="text-center">
        <Loader2 className="h-16 w-16 animate-spin text-primary mx-auto" />
        <p className="mt-4 text-lg font-semibold text-foreground">{message}</p>
      </div>
    </div>
  )
}

