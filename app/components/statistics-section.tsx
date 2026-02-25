import { StatisticCard } from './statistics-card';

export function StatisticsSection() {
  return (
    <section className="bg-[#0A3A5C] p-4 sm:p-4 rounded-lg space-y-6 sm:space-y-4 ">
      <div className="space-y-2">
        <h2 className="text-xl sm:text-2xl font-bold text-white text-right">
          إحصاءات هامة
        </h2>
        <p className="text-white/80 text-right text-sm leading-relaxed">
          تشكل الإحصائيات عاملاً رئيسياً في صياغة سياسات أفضل لدولة قطر في إطار
          رؤية قطر الوطنية 2030
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        <StatisticCard
          icon="users"
          value="3,054,365"
          label="إجمالي عدد السكان"
        />
        <StatisticCard
          icon="trending"
          value="194.779"
          label="الميزان التجاري (بالمليار ريال)"
        />
        <StatisticCard
          icon="building"
          value="107.11"
          label="عدد المنشآت (بالألف منشأة)"
        />
      </div>
    </section>
  );
}
