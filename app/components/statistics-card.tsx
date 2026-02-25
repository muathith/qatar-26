import { Card, CardContent } from '@/app/components/ui/card';
import { Users, TrendingUp, Building2 } from 'lucide-react';

interface StatisticProps {
  icon: 'users' | 'trending' | 'building';
  value: string;
  label: string;
}

export function StatisticCard({ icon, value, label }: StatisticProps) {
  const getIcon = () => {
    switch (icon) {
      case 'users':
        return <Users className="w-6 h-6 sm:w-8 sm:h-8 text-white" />;
      case 'trending':
        return <TrendingUp className="w-6 h-6 sm:w-8 sm:h-8 text-white" />;
      case 'building':
        return <Building2 className="w-6 h-6 sm:w-8 sm:h-8 text-white" />;
    }
  };

  return (
    <Card className="bg-white">
      <CardContent className="p-4 sm:p-6 text-center space-y-2">
        <div className="mx-auto w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-[#0A3A5C] flex items-center justify-center">
          {getIcon()}
        </div>
        <div className="text-xl sm:text-2xl font-bold text-[#0A3A5C] font-arabic">
          {value}
        </div>
        <div className="text-xs sm:text-sm text-gray-600">{label}</div>
      </CardContent>
    </Card>
  );
}
