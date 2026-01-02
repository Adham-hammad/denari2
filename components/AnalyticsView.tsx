
import React, { useMemo, useState } from 'react';
import { format } from 'date-fns';
import { Search, ShoppingBag, Utensils, Pill, Car, Zap, Package, TrendingDown, Info, PieChart as PieChartIcon } from 'lucide-react';
import { MonthData, Transaction } from '../types';

const CATEGORY_MAP: Record<string, { icon: React.ReactNode, color: string, hex: string, keywords: string[] }> = {
  'طعام ومطاعم': { 
    icon: <Utensils className="w-5 h-5" />, 
    color: 'bg-orange-500', 
    hex: '#f97316',
    keywords: ['مطعم', 'اكل', 'وجبة', 'فطور', 'غداء', 'عشاء', 'سناك', 'بيتزا', 'شاورما', 'منسف'] 
  },
  'سوبر ماركت وبقالة': { 
    icon: <ShoppingBag className="w-5 h-5" />, 
    color: 'bg-emerald-500', 
    hex: '#10b981',
    keywords: ['سوبر', 'ماركت', 'بقالة', 'خضار', 'فواكه', 'دكان', 'كارفور', 'سيفوي'] 
  },
  'صحة وأدوية': { 
    icon: <Pill className="w-5 h-5" />, 
    color: 'bg-red-500', 
    hex: '#ef4444',
    keywords: ['دواء', 'صيدلية', 'مستشفى', 'دكتور', 'طبيب', 'علاج', 'تحليل'] 
  },
  'نقل ومواصلات': { 
    icon: <Car className="w-5 h-5" />, 
    color: 'bg-blue-500', 
    hex: '#3b82f6',
    keywords: ['بنزين', 'تكسي', 'اوبر', 'كريم', 'باص', 'كراج', 'صيانة', 'سيارة'] 
  },
  'فواتير وخدمات': { 
    icon: <Zap className="w-5 h-5" />, 
    color: 'bg-amber-500', 
    hex: '#f59e0b',
    keywords: ['فاتورة', 'كهرباء', 'مياه', 'نت', 'اشتراك', 'تلفون', 'شحن'] 
  },
  'أخرى': { 
    icon: <Package className="w-5 h-5" />, 
    color: 'bg-gray-500', 
    hex: '#6b7280',
    keywords: [] 
  }
};

const CategoryDonut: React.FC<{ stats: Record<string, number>, total: number }> = ({ stats, total }) => {
  const radius = 70;
  const circumference = 2 * Math.PI * radius;
  let currentOffset = 0;

  const segments = useMemo(() => {
    return Object.entries(CATEGORY_MAP)
      .map(([name, data]) => {
        const amount = stats[name] || 0;
        const percentage = total > 0 ? (amount / total) : 0;
        const strokeDasharray = `${percentage * circumference} ${circumference}`;
        const strokeDashoffset = -currentOffset;
        currentOffset += percentage * circumference;
        return { name, amount, percentage, strokeDasharray, strokeDashoffset, hex: data.hex };
      })
      .filter(s => s.amount > 0);
  }, [stats, total, circumference]);

  return (
    <div className="relative flex items-center justify-center w-full aspect-square max-w-[200px] mx-auto mb-8">
      <svg className="w-full h-full -rotate-90 transform" viewBox="0 0 200 200">
        <circle
          cx="100"
          cy="100"
          r={radius}
          fill="transparent"
          stroke="#f3f4f6"
          strokeWidth="20"
        />
        {segments.map((s, i) => (
          <circle
            key={s.name}
            cx="100"
            cy="100"
            r={radius}
            fill="transparent"
            stroke={s.hex}
            strokeWidth="22"
            strokeDasharray={s.strokeDasharray}
            strokeDashoffset={s.strokeDashoffset}
            strokeLinecap="round"
            className="transition-all duration-1000 ease-out"
            style={{ transitionDelay: `${i * 100}ms` }}
          />
        ))}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">الإجمالي</span>
        <span className="text-xl font-black text-indigo-600">{total.toFixed(0)}</span>
        <span className="text-[10px] font-bold text-gray-400">د.أ</span>
      </div>
    </div>
  );
};

// Added missing interface for AnalyticsView component props
interface AnalyticsViewProps {
  monthData: MonthData;
  currentDate: Date;
}

const AnalyticsView: React.FC<AnalyticsViewProps> = ({ monthData, currentDate }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const monthKey = format(currentDate, 'yyyy-MM');

  const allTransactions = useMemo(() => {
    return Object.entries(monthData)
      .filter(([date]) => date.startsWith(monthKey))
      .flatMap(([_, transactions]) => transactions);
  }, [monthData, monthKey]);

  const categoryStats = useMemo(() => {
    const stats: Record<string, number> = {};
    allTransactions.forEach(t => {
      let found = false;
      const name = t.name.toLowerCase();
      
      for (const [cat, data] of Object.entries(CATEGORY_MAP)) {
        if (data.keywords.some(k => name.includes(k))) {
          stats[cat] = (stats[cat] || 0) + t.amount;
          found = true;
          break;
        }
      }
      
      if (!found) {
        stats['أخرى'] = (stats['أخرى'] || 0) + t.amount;
      }
    });
    return stats;
  }, [allTransactions]);

  const itemStats = useMemo(() => {
    const stats: Record<string, { total: number, count: number }> = {};
    allTransactions.forEach(t => {
      const name = t.name.trim();
      if (!stats[name]) {
        stats[name] = { total: 0, count: 0 };
      }
      stats[name].total += t.amount;
      stats[name].count += 1;
    });
    return Object.entries(stats)
      .sort((a, b) => b[1].total - a[1].total)
      .filter(([name]) => name.includes(searchTerm));
  }, [allTransactions, searchTerm]);

  const totalSpent = allTransactions.reduce((sum, t) => sum + t.amount, 0);

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-10">
      {/* Category Breakdown Card */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-gray-100">
          <h3 className="text-lg font-black text-black mb-8 flex items-center gap-2">
            <PieChartIcon className="w-5 h-5 text-indigo-600" />
            ملخص الفئات
          </h3>
          
          {totalSpent > 0 ? (
            <>
              <CategoryDonut stats={categoryStats} total={totalSpent} />
              <div className="space-y-5">
                {Object.entries(CATEGORY_MAP).map(([cat, data]) => {
                  const amount = categoryStats[cat] || 0;
                  const percentage = totalSpent > 0 ? (amount / totalSpent) * 100 : 0;
                  if (amount === 0) return null;
                  
                  return (
                    <div key={cat} className="group">
                      <div className="flex justify-between items-center text-sm mb-2">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-xl text-white ${data.color} shadow-sm group-hover:scale-110 transition-transform`}>
                            {data.icon}
                          </div>
                          <div>
                            <p className="font-black text-gray-800 leading-tight">{cat}</p>
                            <p className="text-[10px] text-gray-400 font-bold">{percentage.toFixed(1)}%</p>
                          </div>
                        </div>
                        <div className="text-left">
                          <span className="font-black text-black">{amount.toFixed(2)}</span>
                          <span className="text-[10px] text-gray-400 mr-1">د.أ</span>
                        </div>
                      </div>
                      <div className="h-1.5 w-full bg-gray-50 rounded-full overflow-hidden">
                        <div 
                          className={`h-full transition-all duration-1000 ${data.color}`}
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            <div className="text-center py-20 opacity-30">
              <PieChartIcon className="w-12 h-12 mx-auto mb-2" />
              <p className="font-bold">لا توجد بيانات لهذا الشهر</p>
            </div>
          )}
        </div>

        {/* Search & Items Analysis Card */}
        <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-gray-100 flex flex-col">
          <h3 className="text-lg font-black text-black mb-6 flex items-center gap-2">
            <Search className="w-5 h-5 text-indigo-600" />
            تحليل المشتريات
          </h3>
          
          <div className="relative mb-6">
            <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input 
              type="text" 
              placeholder="ابحث عن مشترياتك..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pr-12 pl-4 py-4 bg-gray-50 border-none rounded-2xl text-sm font-bold focus:ring-2 focus:ring-indigo-500 placeholder:text-gray-300 transition-all"
            />
          </div>

          <div className="flex-1 max-h-[500px] overflow-y-auto space-y-3 pr-1 custom-scrollbar">
            {itemStats.length === 0 ? (
              <div className="text-center py-12 text-gray-300">
                <Info className="w-10 h-10 mx-auto mb-3 opacity-20" />
                <p className="text-sm font-bold">لم نعثر على أي نتائج</p>
              </div>
            ) : (
              itemStats.map(([name, stats]) => (
                <div key={name} className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-transparent hover:border-indigo-100 hover:bg-indigo-50/10 transition-all group">
                  <div className="overflow-hidden">
                    <p className="font-black text-gray-800 text-sm truncate">{name}</p>
                    <p className="text-[10px] text-gray-400 font-bold">تكرر {stats.count} {stats.count === 1 ? 'مرة' : 'مرات'}</p>
                  </div>
                  <div className="text-left">
                    <p className="font-black text-indigo-600 text-sm">{stats.total.toFixed(2)}</p>
                    <p className="text-[10px] text-gray-400 font-bold uppercase">د.أ</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Footer Total Summary */}
      <div className="bg-indigo-600 p-8 rounded-[2.5rem] text-white shadow-2xl shadow-indigo-200 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-12 opacity-10 pointer-events-none">
          <TrendingDown className="w-48 h-48 rotate-12" />
        </div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8">
          <div>
            <p className="text-indigo-100 text-xs font-bold mb-2 uppercase tracking-widest">إجمالي المصاريف</p>
            <div className="flex items-baseline gap-2">
              <span className="text-5xl font-black">{totalSpent.toFixed(2)}</span>
              <span className="text-xl font-bold opacity-80">دينار أردني</span>
            </div>
          </div>
          <div className="flex gap-4">
            <div className="bg-white/10 backdrop-blur-xl p-5 rounded-3xl border border-white/20 flex-1 md:min-w-[120px]">
              <p className="text-[10px] text-indigo-100 font-bold mb-1 uppercase tracking-tighter">العمليات</p>
              <p className="text-2xl font-black">{allTransactions.length}</p>
            </div>
            <div className="bg-white/10 backdrop-blur-xl p-5 rounded-3xl border border-white/20 flex-1 md:min-w-[140px]">
              <p className="text-[10px] text-indigo-100 font-bold mb-1 uppercase tracking-tighter">المتوسط</p>
              <p className="text-2xl font-black">
                {allTransactions.length > 0 ? (totalSpent / allTransactions.length).toFixed(1) : 0}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsView;
