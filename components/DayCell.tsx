
import React from 'react';
import { format } from 'date-fns';

interface DayCellProps {
  day: Date;
  spent: number;
  limit: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  onClick: () => void;
  hasTransactions?: boolean; // خاصية جديدة لمعرفة إذا كان هناك أي عملية مسجلة
}

const DayCell: React.FC<DayCellProps> = ({ day, spent, limit, isToday, onClick }) => {
  const isOverBudget = spent > limit;
  // نعتبر أن هناك صرفاً حتى لو كان 0 إذا كان المستخدم قد سجل "لا يوجد صرف"
  // بما أننا نضيف عملية بمبلغ 0، فسيتم تمرير spent كـ 0 ولكن يجب أن نعرف إذا كان هناك عمليات.
  // سنعتمد على spent >= 0 ولكن نتحقق من وجود عمليات في المكون الأب
  // تحديث: المكون الأب يمرر spent، سنغير logic الـ Indicator
  
  const hasSpending = spent > 0;
  
  const getStatusColor = () => {
    if (spent > limit) return 'bg-red-500/20 border-red-500/30 text-red-400';
    // في حال كان المبلغ 0 بالضبط (يوم توفير) يظهر بلون أخضر
    if (spent === 0 && spent !== null) return 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400';
    if (spent > 0) return 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400';
    return 'bg-[#1E293B] border-white/5 text-gray-400';
  };

  const getIndicatorColor = () => {
    if (spent > limit) return 'bg-red-500';
    return 'bg-emerald-500';
  };

  return (
    <button
      onClick={onClick}
      className={`
        relative aspect-square flex flex-col items-center justify-between py-2 rounded-2xl border transition-all active:scale-90 overflow-hidden
        ${isToday ? 'bg-indigo-600 border-indigo-400 shadow-xl shadow-indigo-600/20 !text-white' : getStatusColor()}
      `}
    >
      <span className={`text-[10px] font-black opacity-60`}>
        {format(day, 'd')}
      </span>

      <div className="flex flex-col items-center gap-0.5">
        <span className="text-[9px] font-black leading-none">{spent.toFixed(1)}</span>
        <span className="text-[7px] font-bold opacity-50 uppercase">د.أ</span>
      </div>

      <div className="w-full px-1.5 pb-0.5">
        <div className="h-0.5 w-full bg-black/10 rounded-full overflow-hidden">
          <div 
            className={`h-full transition-all duration-700 ${getIndicatorColor()}`}
            style={{ width: `${Math.min((spent / limit) * 100, 100)}%` }}
          />
        </div>
      </div>
    </button>
  );
};

export default DayCell;
