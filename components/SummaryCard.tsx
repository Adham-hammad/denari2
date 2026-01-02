
import React from 'react';

interface SummaryCardProps {
  title: string;
  value: string;
  subValue?: string;
  icon: React.ReactNode;
  color?: 'indigo' | 'orange' | 'green';
  progress?: number;
}

const SummaryCard: React.FC<SummaryCardProps> = ({ title, value, subValue, icon, color = 'green', progress }) => {
  return (
    <div className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100 relative overflow-hidden group">
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-sm font-medium text-gray-500">{title}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          {subValue && <p className="text-xs text-gray-400">{subValue}</p>}
        </div>
        <div className="bg-gray-50 p-3 rounded-2xl group-hover:scale-110 transition-transform">
          {icon}
        </div>
      </div>
      
      {progress !== undefined && (
        <div className="mt-4 w-full bg-gray-100 h-1.5 rounded-full overflow-hidden">
          <div 
            className="h-full bg-indigo-600 transition-all duration-1000 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}
    </div>
  );
};

export default SummaryCard;
