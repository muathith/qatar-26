import { Button } from '@/app/components/ui/button';
import { Card, CardContent } from '@/app/components/ui/card';
import { BookmarkIcon, CheckCircle } from 'lucide-react';

interface ServiceItemProps {
  icon: 'health' | 'traffic' | 'status' | 'job' | 'supply';
  title: string;
}

export function ServiceItem({ icon, title }: ServiceItemProps) {
  const getIcon = () => {
    switch (icon) {
      case 'health':
        return (
          <div className="w-8 h-8 rounded-full flex items-center justify-center">
            <CheckCircle className="w-5 h-5 text-[#8B0D12]" />
          </div>
        );
      default:
        return (
          <div className="w-8 h-8 rounded-full flex items-center justify-center">
            <BookmarkIcon className="w-5 h-5 text-[#8B0D12]" />
          </div>
        );
    }
  };

  return (
    <Card className="hover:bg-gray-50 transition-colors border-0 shadow-none">
      <CardContent className="flex items-center gap-4 p-4">
        {getIcon()}
        <span className="text-right flex-1 text-lg">{title}</span>
      </CardContent>
    </Card>
  );
}
