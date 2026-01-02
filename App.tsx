
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  eachDayOfInterval, 
  getDaysInMonth, 
  addMonths, 
  subMonths,
  isToday
} from 'date-fns';
import { ar } from 'date-fns/locale';
import { 
  ChevronRight, 
  ChevronLeft, 
  Wallet, 
  Target, 
  Plus,
  Brain,
  FileSpreadsheet,
  BarChart3,
  LayoutGrid,
  Settings,
  Check,
  Zap,
  RefreshCw,
  CreditCard,
  Trash2,
  PiggyBank,
  Download,
  Smartphone,
  LogOut,
  Loader2
} from 'lucide-react';
import { Transaction, MonthData, MONTHLY_LIMIT, RecurringItem, SavingGoal } from './types';
import DayCell from './components/DayCell';
import TransactionModal from './components/TransactionModal';
import AnalyticsView from './components/AnalyticsView';
import { Auth } from './components/Auth';
import { supabase } from './supabaseClient';
import { GoogleGenAI } from "@google/genai";
import ExcelJS from 'exceljs';

const App: React.FC = () => {
  // --- States for Auth & Data Fetching ---
  const [session, setSession] = useState<any>(null);
  const [isLoadingData, setIsLoadingData] = useState(true);
  
  // --- UI States ---
  const [activeTab, setActiveTab] = useState<'calendar' | 'analytics' | 'settings' | 'goals'>('calendar');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  // --- Data States (From DB) ---
  const [budgetLimit, setBudgetLimit] = useState<number>(MONTHLY_LIMIT);
  const [recurringItems, setRecurringItems] = useState<RecurringItem[]>([]);
  const [savingGoals, setSavingGoals] = useState<SavingGoal[]>([]);
  const [monthData, setMonthData] = useState<MonthData>({});
  
  // --- Form States ---
  const [tempBudget, setTempBudget] = useState('');
  const [currentDate, setCurrentDate] = useState(new Date());
  
  const [isAddingObligation, setIsAddingObligation] = useState(false);
  const [newObligationName, setNewObligationName] = useState('');
  const [newObligationAmount, setNewObligationAmount] = useState('');

  const [isAddingGoal, setIsAddingGoal] = useState(false);
  const [newGoalName, setNewGoalName] = useState('');
  const [newGoalTarget, setNewGoalTarget] = useState('');

  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // --- Auth & Initial Data Load ---
  useEffect(() => {
    // Safely check session with error handling
    supabase.auth.getSession().then(({ data, error }) => {
      if (error || !data) {
        setIsLoadingData(false);
        return;
      }
      setSession(data.session);
      if (data.session) fetchData();
      else setIsLoadingData(false);
    }).catch(() => {
      // Handle network errors or misconfiguration gracefully
      setIsLoadingData(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) fetchData();
      else {
        setMonthData({});
        setRecurringItems([]);
        setSavingGoals([]);
        setIsLoadingData(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchData = async () => {
    setIsLoadingData(true);
    try {
      const userResponse = await supabase.auth.getUser();
      const user = userResponse.data?.user;
      if (!user) return;

      // 1. Settings
      const { data: settings } = await supabase.from('user_settings').select('budget_limit').eq('user_id', user.id).single();
      if (settings) {
        setBudgetLimit(settings.budget_limit);
        setTempBudget(settings.budget_limit.toString());
      } else {
        await supabase.from('user_settings').insert([{ user_id: user.id, budget_limit: MONTHLY_LIMIT }]);
        setTempBudget(MONTHLY_LIMIT.toString());
      }

      // 2. Transactions
      const { data: transactions } = await supabase.from('transactions').select('*');
      const formattedData: MonthData = {};
      transactions?.forEach((t: any) => {
        if (!formattedData[t.date_key]) formattedData[t.date_key] = [];
        formattedData[t.date_key].push({
          id: t.id,
          name: t.name,
          amount: t.amount,
          note: t.note,
          timestamp: new Date(t.created_at).getTime()
        });
      });
      setMonthData(formattedData);

      // 3. Recurring
      const { data: recurring } = await supabase.from('recurring_items').select('*');
      setRecurringItems(recurring || []);

      // 4. Goals
      const { data: goals } = await supabase.from('saving_goals').select('*');
      setSavingGoals(goals?.map((g: any) => ({
        id: g.id,
        name: g.name,
        targetAmount: g.target_amount,
        currentAmount: g.current_amount
      })) || []);

    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setIsLoadingData(false);
    }
  };

  // --- PWA Install ---
  useEffect(() => {
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') setDeferredPrompt(null);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  // --- Calculations ---
  const totalFixedExpenses = useMemo(() => 
    recurringItems.reduce((sum, item) => sum + item.amount, 0), 
  [recurringItems]);

  const daysInMonth = getDaysInMonth(currentDate);
  const netMonthlyBudgetForSpending = budgetLimit - totalFixedExpenses;
  const dailyBudget = netMonthlyBudgetForSpending / daysInMonth;

  const totalSpentInMonth = useMemo(() => {
    let total = 0;
    const monthKey = format(currentDate, 'yyyy-MM');
    Object.entries(monthData).forEach(([key, transactions]) => {
      if (key.startsWith(monthKey)) {
        total += (transactions as Transaction[]).reduce((sum, t) => sum + t.amount, 0);
      }
    });
    return total;
  }, [currentDate, monthData]);

  const monthSavings = useMemo(() => {
    let totalSavings = 0;
    const monthKey = format(currentDate, 'yyyy-MM');
    Object.entries(monthData).forEach(([date, transactions]) => {
      if (date.startsWith(monthKey) && (transactions as Transaction[]).length > 0) {
        const daySpent = (transactions as Transaction[]).reduce((sum, t) => sum + t.amount, 0);
        totalSavings += (dailyBudget - daySpent);
      }
    });
    return totalSavings;
  }, [monthData, currentDate, dailyBudget]);

  const goalsWithProgress = useMemo(() => {
    let availableSavings = Math.max(0, monthSavings);
    return savingGoals.map(goal => {
      const needed = Math.max(0, goal.targetAmount - goal.currentAmount);
      const contribution = Math.min(availableSavings, needed);
      availableSavings -= contribution;
      const totalProgressAmount = goal.currentAmount + contribution;
      return { ...goal, calculatedAmount: totalProgressAmount, isCompleted: totalProgressAmount >= goal.targetAmount && goal.targetAmount > 0 };
    });
  }, [savingGoals, monthSavings]);

  const realRemainingBalance = budgetLimit - totalFixedExpenses - totalSpentInMonth;
  const monthDays = useMemo(() => eachDayOfInterval({ start: startOfMonth(currentDate), end: endOfMonth(currentDate) }), [currentDate]);

  // --- Handlers (CRUD) ---
  const handleSaveBudget = async () => {
    const val = parseFloat(tempBudget);
    if (!isNaN(val) && val >= 0) {
      const user = (await supabase.auth.getUser()).data.user;
      if (!user) return;
      
      const { error } = await supabase.from('user_settings').update({ budget_limit: val }).eq('user_id', user.id);
      if (!error) {
        setBudgetLimit(val);
        alert('تم تحديث ميزانيتك الكلية بنجاح');
      }
    }
  };

  const handleAddObligation = async () => {
    const amount = parseFloat(newObligationAmount);
    if (newObligationName && !isNaN(amount)) {
      const user = (await supabase.auth.getUser()).data.user;
      if (!user) return;

      const { data, error } = await supabase.from('recurring_items')
        .insert([{ user_id: user.id, name: newObligationName, amount, category: 'fixed' }])
        .select().single();
        
      if (data && !error) {
        setRecurringItems(prev => [...prev, { id: data.id, name: data.name, amount: data.amount, category: data.category }]);
        setNewObligationName(''); setNewObligationAmount(''); setIsAddingObligation(false);
      }
    }
  };

  const handleDeleteRecurring = async (id: string) => {
    const { error } = await supabase.from('recurring_items').delete().eq('id', id);
    if (!error) setRecurringItems(prev => prev.filter(i => i.id !== id));
  };

  const handleAddGoal = async () => {
    const target = parseFloat(newGoalTarget);
    if (newGoalName && !isNaN(target)) {
      const user = (await supabase.auth.getUser()).data.user;
      if (!user) return;

      const { data, error } = await supabase.from('saving_goals')
        .insert([{ user_id: user.id, name: newGoalName, target_amount: target }])
        .select().single();

      if (data && !error) {
        setSavingGoals(prev => [...prev, { id: data.id, name: data.name, targetAmount: data.target_amount, currentAmount: data.current_amount }]);
        setNewGoalName(''); setNewGoalTarget(''); setIsAddingGoal(false);
      }
    }
  };

  const handleDeleteGoal = async (id: string) => {
    const { error } = await supabase.from('saving_goals').delete().eq('id', id);
    if (!error) setSavingGoals(prev => prev.filter(g => g.id !== id));
  };

  const handleAddTransaction = async (t: Omit<Transaction, 'id' | 'timestamp'>) => {
    if (!selectedDate) return;
    const user = (await supabase.auth.getUser()).data.user;
    if (!user) return;

    const dateKey = format(selectedDate, 'yyyy-MM-dd');
    const { data, error } = await supabase.from('transactions')
      .insert([{ user_id: user.id, name: t.name, amount: t.amount, note: t.note, date_key: dateKey }])
      .select().single();

    if (data && !error) {
      setMonthData(prev => {
         const newItems = [...(prev[dateKey] || []), { id: data.id, name: data.name, amount: data.amount, note: data.note, timestamp: new Date(data.created_at).getTime() }];
         return { ...prev, [dateKey]: newItems };
      });
    }
  };

  const handleDeleteTransaction = async (id: string) => {
    const { error } = await supabase.from('transactions').delete().eq('id', id);
    if (!error) {
      setMonthData(prev => {
        const newData = { ...prev };
        for (const key in newData) newData[key] = newData[key].filter(t => t.id !== id);
        return newData;
      });
    }
  };

  // --- Export Excel ---
  const handleExportExcel = async () => {
    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('ميزانيتي', { views: [{ rightToLeft: true }] });
      worksheet.columns = [
        { header: 'التاريخ', key: 'date', width: 15 },
        { header: 'البند', key: 'name', width: 25 },
        { header: 'المبلغ (د.أ)', key: 'amount', width: 15 },
        { header: 'ملاحظات', key: 'note', width: 35 },
      ];
      worksheet.getRow(1).font = { bold: true };
      const monthKey = format(currentDate, 'yyyy-MM');
      const rows: any[] = [];
      Object.entries(monthData).forEach(([date, transactions]) => {
        if (date.startsWith(monthKey)) {
          (transactions as Transaction[]).forEach(t => rows.push({ date, name: t.name, amount: t.amount, note: t.note }));
        }
      });
      worksheet.addRows(rows);
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `ميزانية-${monthKey}.xlsx`; a.click();
      window.URL.revokeObjectURL(url);
    } catch (e) { alert('خطأ في التصدير'); }
  };

  const handleImportExcel = () => {
    alert("يرجى استخدام التسجيل اليدوي حالياً لضمان سلامة البيانات السحابية.");
  };

  const runAIAnalysis = async () => {
    setIsAnalyzing(true);
    try {
      // Use import.meta.env for Vite instead of process.env to avoid "process is not defined" error
      // @ts-ignore
      const apiKey = import.meta.env?.VITE_GEMINI_API_KEY;
      if (!apiKey) {
        throw new Error("API Key not found (VITE_GEMINI_API_KEY)");
      }
      
      const ai = new GoogleGenAI({ apiKey });
      const history = Object.entries(monthData).filter(([key]) => key.startsWith(format(currentDate, 'yyyy-MM')))
        .map(([date, items]) => ({ date, items: (items as Transaction[]).map(i => `${i.name}:${i.amount}`) }));
      const prompt = `ميزانيتي: ${budgetLimit} د.أ. التزاماتي: ${totalFixedExpenses} د.أ. صرفي الفعلي: ${JSON.stringify(history)}. حلل وضعي المالي بلهجة أردنية.`;
      const response = await ai.models.generateContent({ model: 'gemini-3-flash-preview', contents: prompt });
      setAiAnalysis(response.text);
    } catch (e) { 
      console.error(e);
      setAiAnalysis("الذكاء الاصطناعي حالياً مشغول أو لم يتم إعداد المفتاح، جرب كمان شوي."); 
    } finally { 
      setIsAnalyzing(false); 
    }
  };

  // --- Rendering ---
  
  if (!session) {
    return <Auth />;
  }

  if (isLoadingData) {
    return (
      <div className="min-h-screen bg-[#0F172A] flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-indigo-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0F172A] text-white safe-top safe-bottom flex flex-col font-['Tajawal'] animate-in fade-in duration-1000">
      <header className="px-6 py-6 flex items-center justify-between bg-[#1E293B]/80 backdrop-blur-2xl sticky top-0 z-50 border-b border-white/5">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-500/20"><Zap className="w-6 h-6 text-white" /></div>
          <h1 className="text-xl font-black tracking-tight text-white">ديناري</h1>
        </div>
        <div className="flex gap-2">
          <button onClick={handleLogout} className="p-2 rounded-xl bg-red-500/10 text-red-400 hover:bg-red-500/20"><LogOut className="w-6 h-6" /></button>
          <button onClick={() => setActiveTab('settings')} className={`p-2 rounded-xl transition-all ${activeTab === 'settings' ? 'bg-indigo-600 text-white' : 'bg-white/5 text-gray-400'}`}><Settings className="w-6 h-6" /></button>
        </div>
      </header>

      <main className="flex-1 p-5 pb-32 overflow-y-auto space-y-6">
        {activeTab === 'calendar' && (
          <div className="space-y-6 animate-in fade-in duration-500">
            <div className="bg-gradient-to-br from-indigo-600 to-violet-700 p-8 rounded-[2.5rem] shadow-2xl relative overflow-hidden">
              <div className="relative z-10 text-right" dir="rtl">
                <p className="text-indigo-100 text-[10px] font-bold mb-1 opacity-70 tracking-widest uppercase">الرصيد المتاح حالياً</p>
                <div className="flex items-baseline gap-2 justify-end">
                  <h2 className="text-5xl font-black">{realRemainingBalance.toFixed(2)}</h2>
                  <span className="text-xl font-bold opacity-60">د.أ</span>
                </div>
                <div className="mt-8 grid grid-cols-3 gap-2 pt-6 border-t border-white/10">
                  <div className="text-right">
                    <p className="text-[9px] text-indigo-100 font-bold opacity-60 uppercase">الالتزامات</p>
                    <p className="text-base font-black text-orange-300">{totalFixedExpenses.toFixed(0)} <span className="text-[8px]">د.أ</span></p>
                  </div>
                  <div className="border-x border-white/10 px-2 text-right">
                    <p className="text-[9px] text-indigo-100 font-bold opacity-60 uppercase">حد اليوم</p>
                    <p className="text-base font-black text-white">{dailyBudget.toFixed(1)} <span className="text-[8px]">د.أ</span></p>
                  </div>
                  <div className="text-right">
                    <p className="text-[9px] text-indigo-100 font-bold opacity-60 uppercase flex items-center justify-end gap-1"><PiggyBank className="w-2 h-2" /> توفير الأيام</p>
                    <p className={`text-base font-black ${monthSavings >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{monthSavings.toFixed(1)} <span className="text-[8px]">د.أ</span></p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-slate-800/50 p-6 rounded-[2rem] border border-white/5 relative overflow-hidden">
              <div className="flex items-center gap-4 mb-4">
                <div className="bg-indigo-500 p-3 rounded-2xl"><Brain className="w-6 h-6 text-white" /></div>
                <div className="flex-1"><h3 className="font-black text-white">المستشار الذكي</h3><p className="text-[10px] text-gray-500">تحليل ميزانيتك الحالية</p></div>
                <button onClick={runAIAnalysis} disabled={isAnalyzing} className="p-2 bg-white/5 rounded-xl hover:bg-white/10"><RefreshCw className={`w-5 h-5 ${isAnalyzing ? 'animate-spin' : ''}`} /></button>
              </div>
              {aiAnalysis && <div className="text-xs text-indigo-200 leading-relaxed bg-indigo-500/10 p-4 rounded-2xl italic border border-indigo-500/20">"{aiAnalysis}"</div>}
            </div>

            <div className="flex items-center justify-between px-2">
               <button onClick={() => setCurrentDate(addMonths(currentDate, 1))} className="p-2 bg-white/5 rounded-xl text-indigo-400"><ChevronRight className="w-6 h-6" /></button>
               <h2 className="text-lg font-black">{format(currentDate, 'MMMM yyyy', { locale: ar })}</h2>
               <button onClick={() => setCurrentDate(subMonths(currentDate, 1))} className="p-2 bg-white/5 rounded-xl text-indigo-400"><ChevronLeft className="w-6 h-6" /></button>
            </div>

            <div className="grid grid-cols-7 gap-2">
              {['ح', 'ن', 'ث', 'ر', 'خ', 'ج', 'س'].map(d => <div key={d} className="text-center text-[10px] font-black text-gray-600">{d}</div>)}
              {monthDays.map(day => {
                const dayKey = format(day, 'yyyy-MM-dd');
                const transactions = monthData[dayKey] || [];
                const daySpent = transactions.reduce((s, t) => s + (t as Transaction).amount, 0);
                return <DayCell key={day.toISOString()} day={day} spent={daySpent} limit={dailyBudget} isCurrentMonth={true} isToday={isToday(day)} onClick={() => { setSelectedDate(day); setIsModalOpen(true); }} hasTransactions={transactions.length > 0} />;
              })}
            </div>
          </div>
        )}

        {activeTab === 'analytics' && <AnalyticsView monthData={monthData} currentDate={currentDate} />}

        {activeTab === 'settings' && (
          <div className="space-y-6 animate-in slide-in-from-left duration-500" dir="rtl">
            <h2 className="text-2xl font-black">الإعدادات</h2>
            
            {/* زر تثبيت التطبيق */}
            {deferredPrompt && (
              <button 
                onClick={handleInstallClick}
                className="w-full bg-gradient-to-r from-indigo-600 to-violet-600 p-6 rounded-[2rem] shadow-lg flex items-center justify-between group active:scale-95 transition-all"
              >
                <div className="flex items-center gap-4">
                  <div className="bg-white/20 p-3 rounded-2xl">
                    <Smartphone className="w-6 h-6 text-white" />
                  </div>
                  <div className="text-right">
                    <p className="font-black text-white text-lg">تثبيت التطبيق</p>
                    <p className="text-indigo-200 text-xs">استخدم التطبيق بدون إنترنت وبشاشة كاملة</p>
                  </div>
                </div>
                <Download className="w-6 h-6 text-white opacity-50 group-hover:opacity-100 group-hover:translate-y-1 transition-all" />
              </button>
            )}

            <div className="bg-[#1E293B] rounded-[2rem] p-6 border border-white/5 space-y-8">
              <div className="space-y-3">
                <label className="text-[10px] font-bold text-gray-500 uppercase flex items-center gap-2"><Wallet className="w-3 h-3" /> الميزانية الشهرية الكلية</label>
                <div className="flex gap-2">
                  <input type="number" value={tempBudget} onChange={e => setTempBudget(e.target.value)} className="flex-1 bg-black/20 border-none rounded-2xl px-5 py-4 font-black text-xl text-indigo-400" />
                  <button onClick={handleSaveBudget} className="bg-indigo-600 p-5 rounded-2xl"><Check className="w-6 h-6 text-white" /></button>
                </div>
              </div>

              <div className="pt-8 border-t border-white/5">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="font-black text-lg flex items-center gap-2 text-white"><CreditCard className="w-5 h-5 text-orange-500" /> الالتزامات الكلية</h3>
                  {!isAddingObligation && <button onClick={() => setIsAddingObligation(true)} className="bg-indigo-600/10 text-indigo-400 text-xs font-black px-4 py-2 rounded-full border border-indigo-400/20">+ إضافة جديد</button>}
                </div>
                {isAddingObligation && (
                  <div className="bg-indigo-600/5 p-5 rounded-3xl border border-indigo-500/20 mb-6 space-y-4">
                    <input type="text" placeholder="اسم الالتزام" value={newObligationName} onChange={e => setNewObligationName(e.target.value)} className="w-full bg-black/20 rounded-xl px-4 py-3 text-sm font-bold" />
                    <input type="number" placeholder="المبلغ الشهري" value={newObligationAmount} onChange={e => setNewObligationAmount(e.target.value)} className="w-full bg-black/20 rounded-xl px-4 py-3 text-sm font-bold text-orange-400" />
                    <div className="flex gap-2"><button onClick={handleAddObligation} className="flex-1 bg-indigo-600 py-3 rounded-xl text-xs font-black">حفظ</button><button onClick={() => setIsAddingObligation(false)} className="px-5 bg-white/5 py-3 rounded-xl text-xs font-black">إلغاء</button></div>
                  </div>
                )}
                <div className="space-y-3">
                  {recurringItems.map(item => (
                    <div key={item.id} className="flex justify-between items-center bg-black/20 p-5 rounded-2xl border border-transparent">
                      <div><p className="font-black text-white text-sm">{item.name}</p><p className="text-[10px] text-gray-500 font-bold">خصم ثابت</p></div>
                      <div className="flex items-center gap-4"><span className="font-black text-orange-400">{item.amount.toFixed(0)} د.أ</span><button onClick={() => handleDeleteRecurring(item.id)} className="text-red-500 p-2"><Trash2 className="w-5 h-5" /></button></div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-8 border-t border-white/5">
                <button onClick={handleExportExcel} className="w-full flex items-center justify-center gap-2 bg-emerald-500/10 p-6 rounded-3xl border border-emerald-500/20 active:scale-95 transition-all group">
                  <FileSpreadsheet className="w-8 h-8 text-emerald-400 group-hover:scale-110 transition-transform" />
                  <span className="text-sm font-black text-emerald-400">تصدير التقرير الشهري (Excel)</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'goals' && (
          <div className="space-y-6 animate-in slide-in-from-bottom duration-500" dir="rtl">
            <div className="flex justify-between items-center"><h2 className="text-2xl font-black">أهدافي المالية</h2><button onClick={() => setIsAddingGoal(true)} className="bg-indigo-600 p-2 rounded-xl text-white shadow-lg"><Plus className="w-6 h-6" /></button></div>
            {isAddingGoal && (
              <div className="bg-[#1E293B] p-6 rounded-[2rem] border border-indigo-500/30 space-y-4">
                <input type="text" placeholder="اسم الهدف" value={newGoalName} onChange={e => setNewGoalName(e.target.value)} className="w-full bg-black/20 rounded-2xl px-5 py-4 text-sm font-bold" />
                <input type="number" placeholder="المبلغ المطلوب" value={newGoalTarget} onChange={e => setNewGoalTarget(e.target.value)} className="w-full bg-black/20 rounded-2xl px-5 py-4 text-sm font-bold text-emerald-400" />
                <div className="flex gap-2"><button onClick={handleAddGoal} className="flex-1 bg-indigo-600 py-4 rounded-2xl font-black text-sm">حفظ</button><button onClick={() => setIsAddingGoal(false)} className="px-6 bg-white/5 py-4 rounded-2xl text-sm font-black">إلغاء</button></div>
              </div>
            )}
            <div className="space-y-4">
              {goalsWithProgress.map(goal => {
                const progress = Math.min((goal.calculatedAmount / goal.targetAmount) * 100, 100);
                return (
                  <div key={goal.id} className={`bg-[#1E293B] p-6 rounded-[2rem] border ${goal.isCompleted ? 'border-emerald-500/50 shadow-lg' : 'border-white/5'}`}>
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex items-center gap-3">
                        <div className={`p-3 rounded-2xl ${goal.isCompleted ? 'bg-emerald-600/20' : 'bg-indigo-600/20'}`}><Target className={`w-6 h-6 ${goal.isCompleted ? 'text-emerald-400' : 'text-indigo-400'}`} /></div>
                        <div><h4 className="font-black text-lg">{goal.name}</h4><p className="text-[10px] text-gray-500">الهدف: {goal.targetAmount} د.أ</p></div>
                      </div>
                      <button onClick={() => handleDeleteGoal(goal.id)} className="p-2 text-red-500/50"><Trash2 className="w-5 h-5" /></button>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-[10px] font-bold"><span className={goal.isCompleted ? 'text-emerald-400 font-black' : 'text-indigo-300'}>الموفر حالياً: {goal.calculatedAmount.toFixed(1)} د.أ</span><span className="text-gray-400">{progress.toFixed(0)}%</span></div>
                      <div className="h-2.5 w-full bg-black/20 rounded-full overflow-hidden border border-white/5"><div className={`h-full ${goal.isCompleted ? 'bg-emerald-500' : 'bg-indigo-500'}`} style={{ width: `${progress}%` }} /></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </main>

      <nav className="fixed bottom-6 left-6 right-6 h-20 bg-[#1E293B]/90 backdrop-blur-3xl border border-white/5 rounded-3xl z-[100] px-6 flex items-center justify-between shadow-2xl">
        <button onClick={() => setActiveTab('calendar')} className={`flex flex-col items-center gap-1 transition-all ${activeTab === 'calendar' ? 'text-indigo-400 scale-110' : 'text-gray-500'}`}><LayoutGrid className="w-6 h-6" /><span className="text-[10px] font-black uppercase">الرئيسية</span></button>
        <button onClick={() => setActiveTab('analytics')} className={`flex flex-col items-center gap-1 transition-all ${activeTab === 'analytics' ? 'text-indigo-400 scale-110' : 'text-gray-500'}`}><BarChart3 className="w-6 h-6" /><span className="text-[10px] font-black uppercase">التقارير</span></button>
        <div className="relative"><button onClick={() => { setSelectedDate(new Date()); setIsModalOpen(true); }} className="bg-indigo-600 text-white p-5 rounded-[2rem] shadow-2xl -mt-16 border-4 border-[#0F172A] active:scale-90 transition-all"><Plus className="w-8 h-8" /></button></div>
        <button onClick={() => setActiveTab('goals')} className={`flex flex-col items-center gap-1 transition-all ${activeTab === 'goals' ? 'text-indigo-400 scale-110' : 'text-gray-500'}`}><Target className="w-6 h-6" /><span className="text-[10px] font-black uppercase">الأهداف</span></button>
        <button onClick={() => setActiveTab('settings')} className={`flex flex-col items-center gap-1 transition-all ${activeTab === 'settings' ? 'text-indigo-400 scale-110' : 'text-gray-500'}`}><Settings className="w-6 h-6" /><span className="text-[10px] font-black uppercase">الإعدادات</span></button>
      </nav>

      {isModalOpen && selectedDate && (
        <TransactionModal 
          date={selectedDate} dailyLimit={dailyBudget} transactions={monthData[format(selectedDate, 'yyyy-MM-dd')] || []} onClose={() => setIsModalOpen(false)}
          onAdd={handleAddTransaction}
          onDelete={handleDeleteTransaction}
        />
      )}
    </div>
  );
};

export default App;
