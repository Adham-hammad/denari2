
import React, { useState } from 'react';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { 
  X, Trash2, Utensils, ShoppingBasket, Car, Zap, Package, Coffee,
  ShoppingBag, PiggyBank
} from 'lucide-react';
import { Transaction } from '../types';

interface TransactionModalProps {
  date: Date;
  dailyLimit: number;
  transactions: Transaction[];
  onClose: () => void;
  onAdd: (t: Omit<Transaction, 'id' | 'timestamp'>) => void;
  onDelete: (id: string) => void;
}

const getIconForTransaction = (name: string) => {
  const n = name.toLowerCase();
  if (/مطعم|أكل|اكل|وجبة|فطور|غداء|عشاء|بيتزا|برجر|شاورما|food|eat|restaurant|lunch|breakfast|pizza|burger/.test(n)) return <Utensils className="w-5 h-5" />;
  if (/قهوة|كافيه|شاي|كوفي|نفس|coffee|cafe|tea|starbucks|juice/.test(n)) return <Coffee className="w-5 h-5" />;
  if (/سوبرماركت|بقالة|خضار|لحم|دجاج|ماركت|grocery|market|supermarket/.test(n)) return <ShoppingBasket className="w-5 h-5" />;
  if (/بنزين|سيارة|تكسي|اوبر|كريم|fuel|taxi|uber|careem|gas|car/.test(n)) return <Car className="w-5 h-5" />;
  if (/فاتورة|كهرباء|مياه|نت|شحن|رصيد|bill|utility|electric|water|internet|phone/.test(n)) return <Zap className="w-5 h-5" />;
  if (/ملابس|أواعي|احذية|مول|عطر|shopping|clothes|shoes|mall/.test(n)) return <ShoppingBag className="w-5 h-5" />;
  if (name === 'لا يوجد صرف') return <PiggyBank className="w-5 h-5 text-emerald-500" />;
  return <Package className="w-5 h-5" />;
};

const TransactionModal: React.FC<TransactionModalProps> = ({ date, dailyLimit, transactions, onClose, onAdd, onDelete }) => {
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');

  const totalSpent = transactions.reduce((sum, t) => sum + t.amount, 0);
  const isOverLimit = totalSpent > dailyLimit;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !amount) return;
    onAdd({ name, amount: parseFloat(amount), note });
    setName(''); setAmount(''); setNote('');
  };

  const handleNoSpending = () => {
    onAdd({ name: 'لا يوجد صرف', amount: 0, note: 'يوم توفير كامل' });
  };

  const handleDeleteTransaction = (id: string) => {
    onDelete(id);
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-end justify-center animate-in fade-in duration-300">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative w-full max-w-lg bg-[#F2F2F7] rounded-t-[3rem] shadow-2xl flex flex-col max-h-[94vh] animate-in slide-in-from-bottom duration-500 overflow-hidden">
        <div className="w-12 h-1.5 bg-gray-300 rounded-full mx-auto mt-3 mb-1" />
        
        <div className="p-6 flex items-center justify-between">
          <div>
            <h3 className="text-2xl font-black text-black">
              {format(date, 'EEEE, d MMMM', { locale: ar })}
            </h3>
            <p className="text-xs font-bold text-gray-500 mt-1">الميزانية المسموحة: {dailyLimit.toFixed(2)} د.أ</p>
          </div>
          <button type="button" onClick={onClose} className="bg-gray-200 text-gray-500 p-2 rounded-full active:scale-90 transition-all">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 pb-20 space-y-6">
          <form onSubmit={handleSubmit} className="bg-white p-5 rounded-3xl shadow-sm space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="شو اشتريت؟" className="w-full px-4 py-4 bg-gray-50 rounded-2xl border-none font-bold text-black focus:ring-2 focus:ring-indigo-500 transition-all" required />
              <input type="number" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} placeholder="كم كلفك؟" className="w-full px-4 py-4 bg-gray-50 rounded-2xl border-none font-bold text-indigo-600 focus:ring-2 focus:ring-indigo-500 transition-all" required />
            </div>
            
            <textarea value={note} onChange={e => setNote(e.target.value)} placeholder="ملاحظة بسيطة (اختياري)..." className="w-full px-4 py-4 bg-gray-50 rounded-2xl border-none text-sm text-black focus:ring-2 focus:ring-indigo-500 transition-all" rows={2} />
            
            <button type="submit" className="w-full py-4 bg-indigo-600 text-white font-black rounded-2xl active:scale-95 shadow-lg transition-all">حفظ العملية</button>
          </form>

          {transactions.length === 0 && (
            <button 
              onClick={handleNoSpending}
              className="w-full p-6 bg-emerald-500/10 border-2 border-dashed border-emerald-500/30 rounded-3xl flex flex-col items-center gap-2 hover:bg-emerald-500/20 transition-all group"
            >
              <PiggyBank className="w-8 h-8 text-emerald-500 group-hover:scale-110 transition-transform" />
              <span className="font-black text-emerald-600 text-sm">لا يوجد صرف اليوم؟ سجل يوم توفير!</span>
            </button>
          )}

          <div className="space-y-3">
            <h4 className="text-sm font-black text-gray-400 px-2">عمليات اليوم</h4>
            {transactions.length === 0 ? (
              <div className="text-center py-10 opacity-30">
                <p className="text-sm font-bold text-black">لسه ما سجلت شي اليوم</p>
              </div>
            ) : (
              <div className="space-y-2">
                {transactions.map(t => (
                  <div key={t.id} className="flex items-center justify-between p-4 bg-white rounded-2xl border border-gray-100 animate-in slide-in-from-right duration-300 group hover:shadow-md transition-all">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-gray-50 text-indigo-600 rounded-2xl flex items-center justify-center">
                        {getIconForTransaction(t.name)}
                      </div>
                      <div>
                        <p className="font-black text-black text-sm">{t.name}</p>
                        {t.note && <p className="text-[10px] text-gray-400">{t.note}</p>}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-black text-indigo-600">{t.amount.toFixed(2)}</span>
                      <button 
                        type="button" 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteTransaction(t.id);
                        }} 
                        className="text-red-400 hover:text-red-600 transition-colors p-3 active:scale-125 cursor-pointer z-10"
                        title="حذف العملية"
                      >
                        <Trash2 className="w-6 h-6" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className={`p-6 pb-10 border-t ${isOverLimit ? 'bg-red-500 text-white' : 'bg-white text-black'}`}>
           <div className="flex justify-between items-center">
             <span className="font-bold">{isOverLimit ? 'تجاوزت حد اليوم!' : 'مجموع صرف اليوم'}</span>
             <span className="text-2xl font-black">{totalSpent.toFixed(2)} د.أ</span>
           </div>
        </div>
      </div>
    </div>
  );
};

export default TransactionModal;
