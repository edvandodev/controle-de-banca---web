import React, { useEffect, useMemo, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { 
  Plus, 
  History, 
  LayoutDashboard, 
  TrendingUp, 
  Calendar,
  Edit2,
  X,
  Check,
  BarChart3,
  User,
  Wallet,
  Banknote,
  Target,
  LogOut,
  Moon,
  Sun,
  Activity,
  ArrowRight,
  ArrowDownToLine
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
  PieChart,
  Pie
  } from 'recharts';
import { format, startOfDay, subDays, startOfMonth, isSameDay, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

import { Entry, DashboardStats, FilterPeriod, ThemeMode, Withdrawal } from './types';
import { AuthScreen } from './components/auth/AuthScreen';
import { HistorySection } from './components/history/HistorySection';
import { getDashboardStats } from './lib/dashboard';
import { cn, formatCurrency, formatPercent, formatDate } from './lib/utils';
import { getDuplicateEntryDraft } from './lib/history';
import { createBankrollRepository } from './data/repositories';
import { createLocalBankrollRepository } from './data/repositories/localBankrollRepository';
import { createId } from './lib/id';
import { isSupabaseEnabled, supabase } from './lib/supabase';

// Mock Data for initial state
const MOCK_DATA: Entry[] = [
  { id: '1', date: '2026-03-25', initialBalance: 1000, finalBalance: 1150, result: 150, percentage: 15, notes: 'Dia excelente, segui o gerenciamento.' },
  { id: '2', date: '2026-03-26', initialBalance: 1150, finalBalance: 1080, result: -70, percentage: -6.08, notes: 'Stop loss atingido.' },
  { id: '3', date: '2026-03-27', initialBalance: 1080, finalBalance: 1200, result: 120, percentage: 11.11, notes: 'Recuperação boa.' },
  { id: '4', date: '2026-03-28', initialBalance: 1200, finalBalance: 1200, result: 0, percentage: 0, notes: 'Dia neutro.' },
  { id: '5', date: '2026-03-29', initialBalance: 1200, finalBalance: 1350, result: 150, percentage: 12.5, notes: 'Meta batida.' },
  { id: '6', date: '2026-03-30', initialBalance: 1350, finalBalance: 1300, result: -50, percentage: -3.7, notes: 'Pequeno deslize.' },
  { id: '7', date: '2026-03-31', initialBalance: 1300, finalBalance: 1450, result: 150, percentage: 11.53, notes: 'Fechamento de mês top.' },
];

const DEFAULT_WITHDRAWALS: Withdrawal[] = [
  { id: 'w1', amount: 350, date: '2026-03-28T10:00:00Z', notes: 'Saque parcial' },
  { id: 'w2', amount: 300, date: '2026-03-20T10:00:00Z', notes: 'Saque mensal' },
  { id: 'w3', amount: 300, date: '2026-03-10T10:00:00Z', notes: 'Saque quinzenal' },
  { id: 'w4', amount: 300, date: '2026-03-01T10:00:00Z', notes: 'Saque inicial' },
];

const EMPTY_ENTRIES: Entry[] = [];
const EMPTY_WITHDRAWALS: Withdrawal[] = [];

const currencyInputFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
});

function formatCurrencyInput(value: string) {
  const digits = value.replace(/\D/g, '');
  if (!digits) return '';
  return currencyInputFormatter.format(Number(digits) / 100);
}

function parseCurrencyInput(value: string) {
  const digits = value.replace(/\D/g, '');
  if (!digits) return 0;
  return Number(digits) / 100;
}

function formatCurrencyInputFromNumber(value: number) {
  if (value <= 0) return '';
  return currencyInputFormatter.format(value);
}

export default function App() {
  const localRepository = useMemo(() => createLocalBankrollRepository(), []);
  const [session, setSession] = useState<Session | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(isSupabaseEnabled);
  const [isDataLoading, setIsDataLoading] = useState(true);
  const repositoryId = isSupabaseEnabled ? session?.user.id ?? 'supabase-pending' : 'local';
  const [hydratedRepositoryId, setHydratedRepositoryId] = useState<string | null>(null);

  const bankrollRepository = useMemo(
    () => createBankrollRepository({ userId: session?.user.id ?? null }),
    [session?.user.id],
  );

  const [entries, setEntries] = useState<Entry[]>(EMPTY_ENTRIES);
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>(EMPTY_WITHDRAWALS);
  
  const [activeTab, setActiveTab] = useState<'dashboard' | 'history' | 'reports'>('dashboard');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isWithdrawalModalOpen, setIsWithdrawalModalOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<Entry | null>(null);
  
  // Inline editing state for today's record
  const [editingField, setEditingField] = useState<'initial' | 'final' | null>(null);
  const [editingGoal, setEditingGoal] = useState(false);
  const [tempValue, setTempValue] = useState('');
  const [tempGoalValue, setTempGoalValue] = useState('');
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' } | null>(null);
  const [isFirstDailyVisit, setIsFirstDailyVisit] = useState(false);

  const [theme, setTheme] = useState<ThemeMode>('dark');
  const isRepositoryHydrated = hydratedRepositoryId === repositoryId;

  useEffect(() => {
    if (!isSupabaseEnabled || !supabase) {
      setIsAuthLoading(false);
      return;
    }

    let isActive = true;

    void supabase.auth.getSession().then(({ data }) => {
      if (!isActive) return;
      setSession(data.session ?? null);
      setIsAuthLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!isActive) return;
      setSession(nextSession);
      setIsAuthLoading(false);
    });

    return () => {
      isActive = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (isSupabaseEnabled && !session) {
      setIsDataLoading(false);
      setHydratedRepositoryId(null);
      return;
    }

    let isActive = true;

    async function loadRepositoryState() {
      setIsDataLoading(true);
      setHydratedRepositoryId(null);

      const fallbackTheme = await localRepository.loadTheme('dark');
      const fallbackEntries = await localRepository.loadEntries(EMPTY_ENTRIES);
      const fallbackWithdrawals = await localRepository.loadWithdrawals(EMPTY_WITHDRAWALS);

      const [loadedEntries, loadedWithdrawals, loadedTheme] = await Promise.all([
        bankrollRepository.loadEntries(fallbackEntries),
        bankrollRepository.loadWithdrawals(fallbackWithdrawals),
        bankrollRepository.loadTheme(fallbackTheme),
      ]);

      if (!isActive) return;

      setEntries(loadedEntries);
      setWithdrawals(loadedWithdrawals);
      setTheme(loadedTheme);
      setHydratedRepositoryId(repositoryId);
      setIsDataLoading(false);
    }

    void loadRepositoryState();

    return () => {
      isActive = false;
    };
  }, [bankrollRepository, localRepository, repositoryId, session]);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  useEffect(() => {
    if (!isRepositoryHydrated) return;
    void bankrollRepository.saveTheme(theme);
  }, [bankrollRepository, isRepositoryHydrated, theme]);

  const toggleTheme = () => setTheme(prev => prev === 'light' ? 'dark' : 'light');
  
  // Filters
  const [period, setPeriod] = useState<FilterPeriod>('all');
  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const pageHeader = {
    dashboard: {
      title: 'Dashboard',
      subtitle: 'Resumo financeiro e desempenho do dia',
    },
    history: {
      title: 'Histórico',
      subtitle: 'Registros, filtros e detalhes dos lançamentos',
    },
    reports: {
      title: 'Relatórios',
      subtitle: 'Visão consolidada da performance da banca',
    },
  }[activeTab];
  const currentDateLabel = format(new Date(), 'dd MMM yyyy', { locale: ptBR }).replace('.', '').toLowerCase();

  useEffect(() => {
    const lastDailyVisit = localStorage.getItem('lastDailyVisit');
    if (lastDailyVisit !== todayStr) {
      setIsFirstDailyVisit(true);
      localStorage.setItem('lastDailyVisit', todayStr);
    } else {
      setIsFirstDailyVisit(false);
    }
  }, [todayStr]);

  useEffect(() => {
    if (!isRepositoryHydrated) return;
    void bankrollRepository.saveEntries(entries);
  }, [bankrollRepository, entries, isRepositoryHydrated]);

  useEffect(() => {
    if (!isRepositoryHydrated) return;
    void bankrollRepository.saveWithdrawals(withdrawals);
  }, [bankrollRepository, isRepositoryHydrated, withdrawals]);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  async function handleSignOut() {
    if (!supabase) return;
    await supabase.auth.signOut();
    setActiveTab('dashboard');
  }

  const precomputedFilteredEntries = entries
    .filter(entry => {
      const entryDate = parseISO(entry.date);
      const now = new Date();

      if (period === 'today') return isSameDay(entryDate, now);
      if (period === '7days') return entryDate >= startOfDay(subDays(now, 6));
      if (period === '30days') return entryDate >= startOfDay(subDays(now, 29));
      if (period === 'month') return entryDate >= startOfMonth(now);
      return true;
    })
    .sort((a, b) => b.date.localeCompare(a.date));

  const precomputedTodayEntry = useMemo(() => {
    return entries.find((entry) => entry.date === todayStr) ?? null;
  }, [entries, todayStr]);

  const precomputedStats: DashboardStats = useMemo(() => {
    return getDashboardStats(precomputedFilteredEntries, withdrawals);
  }, [precomputedFilteredEntries, withdrawals]);

  if (isAuthLoading) {
    return (
      <FullScreenStatus
        title="Conectando ao Supabase"
        description="Verificando a sua sessão para liberar o app."
      />
    );
  }

  if (isSupabaseEnabled && !session) {
    return <AuthScreen />;
  }

  if (isDataLoading) {
    return (
      <FullScreenStatus
        title="Carregando seus dados"
        description="Lendo entradas, saques e preferências antes de abrir o dashboard."
      />
    );
  }

  const filteredEntries = precomputedFilteredEntries;

  const todayEntry = precomputedTodayEntry;

  const todayGoal = todayEntry?.dailyGoal ?? 0;
  const hasTodayGoal = todayGoal > 0;
  const isGoalOnboarding = !hasTodayGoal && isFirstDailyVisit;
  const todayInitial = todayEntry?.initialBalance ?? 0;
  const todayFinal = todayEntry?.finalBalance ?? 0;
  const todayResult = todayEntry?.result ?? 0;
  const todayProgress = hasTodayGoal
    ? Math.min(100, Math.max(0, (todayResult / todayGoal) * 100))
    : 0;
  const parsedTempGoalValue = parseCurrencyInput(tempGoalValue);
  const canSaveGoal = parsedTempGoalValue > 0;

  const stats: DashboardStats = precomputedStats;

  const handleSaveEntry = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const date = formData.get('date') as string;
    const initial = Number(formData.get('initialBalance'));
    const final = Number(formData.get('finalBalance'));
    const notes = formData.get('notes') as string;

    const result = final - initial;
    const percentage = initial === 0 ? 0 : (result / initial) * 100;

    if (editingEntry) {
      setEntries(prev => prev.map(item => item.id === editingEntry.id ? {
        ...item, date, initialBalance: initial, finalBalance: final, notes, result, percentage
      } : item));
    } else {
      // Check if entry for this date already exists
      const existingIndex = entries.findIndex(e => e.date === date);
      if (existingIndex >= 0) {
        setEntries(prev => {
          const newEntries = [...prev];
          newEntries[existingIndex] = {
            ...newEntries[existingIndex],
            initialBalance: initial,
            finalBalance: final,
            notes,
            result,
            percentage
          };
          return newEntries;
        });
        setToast({ message: `Registro de ${formatDate(date)} atualizado!`, type: 'success' });
      } else {
        const newEntry: Entry = {
          id: createId(),
          date, initialBalance: initial, finalBalance: final, notes, result, percentage
        };
        setEntries(prev => [...prev, newEntry]);
        setToast({ message: 'Novo registro adicionado com sucesso!', type: 'success' });
      }
    }
    
    setIsModalOpen(false);
    setEditingEntry(null);
  };

  const handleSaveWithdrawal = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const amount = Number(formData.get('amount'));
    const date = formData.get('date') as string;
    const notes = formData.get('notes') as string;

    const newWithdrawal: Withdrawal = {
      id: createId(),
      amount,
      date: new Date(date).toISOString(),
      notes
    };

    setWithdrawals(prev => [newWithdrawal, ...prev]);
    setIsWithdrawalModalOpen(false);
    setToast({ message: 'Saque registrado com sucesso!', type: 'success' });
  };

  const handleGoalSave = () => {
    if (!canSaveGoal) return;

    setEntries(prev => {
      const existingIndex = prev.findIndex(e => e.date === todayStr);
      let newEntries = [...prev];
      
      if (existingIndex >= 0) {
        newEntries[existingIndex] = { ...newEntries[existingIndex], dailyGoal: parsedTempGoalValue };
      } else {
        const newEntry: Entry = {
          id: createId(),
          date: todayStr,
          initialBalance: 0,
          finalBalance: 0,
          result: 0,
          percentage: 0,
          dailyGoal: parsedTempGoalValue,
          notes: ''
        };
        newEntries = [newEntry, ...newEntries];
      }
      return newEntries;
    });
    setEditingGoal(false);
    setIsFirstDailyVisit(false);
    setTempGoalValue('');
    setToast({ message: 'Meta do dia salva!', type: 'success' });
  };

  const handleInlineSave = () => {
    if (!editingField) return;
    
    const todayStr = format(new Date(), 'yyyy-MM-dd');
    const value = Number(tempValue);
    
    setEntries(prev => {
      const existingIndex = prev.findIndex(e => e.date === todayStr);
      let newEntries = [...prev];
      
      if (existingIndex >= 0) {
        const existing = newEntries[existingIndex];
        const updated = { ...existing };
        if (editingField === 'initial') updated.initialBalance = value;
        else updated.finalBalance = value;
        
        updated.result = updated.finalBalance - updated.initialBalance;
        updated.percentage = updated.initialBalance === 0 ? 0 : (updated.result / updated.initialBalance) * 100;
        
        newEntries[existingIndex] = updated;
      } else {
        const initial = editingField === 'initial' ? value : 0;
        const final = editingField === 'final' ? value : 0;
        const result = final - initial;
        const percentage = initial === 0 ? 0 : (result / initial) * 100;
        
        const newEntry: Entry = {
          id: createId(),
          date: todayStr,
          initialBalance: initial,
          finalBalance: final,
          result,
          percentage,
          notes: ''
        };
        newEntries.push(newEntry);
      }
      return newEntries;
    });
    
    setEditingField(null);
    setTempValue('');
    setToast({ 
      message: `${editingField === 'initial' ? 'Saldo inicial' : 'Saldo final'} atualizado com sucesso!`, 
      type: 'success' 
    });
  };

  const openGoalEdit = () => {
    setEditingGoal(true);
    setTempGoalValue(formatCurrencyInputFromNumber(todayGoal));
  };

  const cancelGoalEdit = () => {
    setEditingGoal(false);
    setTempGoalValue('');
  };

  const submitGoal = () => {
    handleGoalSave();
  };

  const handleGoalEditBlur = () => {
    if (!editingGoal) return;

    if (!canSaveGoal) {
      cancelGoalEdit();
      return;
    }

    handleGoalSave();
  };

  const handleDeleteEntry = (id: string) => {
    if (window.confirm('Tem certeza que deseja excluir este registro?')) {
      setEntries(prev => prev.filter(item => item.id !== id));
    }
  };

  const handleDuplicateEntry = (entry: Entry) => {
    const duplicateDraft = getDuplicateEntryDraft(entries, entry);
    const duplicatedEntry: Entry = {
      ...duplicateDraft,
      id: createId(),
    };

    setEntries(prev => [duplicatedEntry, ...prev]);
    setToast({ message: `Registro duplicado para ${formatDate(duplicatedEntry.date)}.`, type: 'success' });
  };

  const pieData = [
    { name: 'Positivos', value: stats.winDays, color: theme === 'light' ? '#16a34a' : '#22c55e' },
    { name: 'Negativos', value: stats.lossDays, color: theme === 'light' ? '#dc2626' : '#ef4444' },
    { name: 'Neutros', value: filteredEntries.length - stats.winDays - stats.lossDays, color: theme === 'light' ? '#94a3b8' : '#3f3f46' },
  ];

  return (
    <div className="flex h-screen bg-premium-bg overflow-hidden transition-colors duration-300">
      {/* Sidebar - Fixed on Desktop */}
      <aside className="hidden lg:flex flex-col w-64 bg-nav-bg border-r border-white/5 transition-colors duration-300">
        <div className="p-6 flex items-center gap-3">
          <div className="w-8 h-8 bg-brand-500 rounded-lg flex items-center justify-center text-white shadow-lg shadow-brand-500/30">
            <TrendingUp size={18} />
          </div>
          <h1 className="text-white font-bold text-lg tracking-tight">Controle de Banca</h1>
        </div>

        <nav className="flex-1 px-4 space-y-1 mt-4">
          <SidebarLink 
            icon={<LayoutDashboard size={18} />} 
            label="Dashboard" 
            active={activeTab === 'dashboard'} 
            onClick={() => setActiveTab('dashboard')} 
          />
          <SidebarLink 
            icon={<History size={18} />} 
            label="Histórico" 
            active={activeTab === 'history'} 
            onClick={() => setActiveTab('history')} 
          />
          <SidebarLink 
            icon={<BarChart3 size={18} />} 
            label="Relatórios" 
            active={activeTab === 'reports'} 
            onClick={() => setActiveTab('reports')} 
          />
        </nav>

        <div className="p-4 border-t border-white/5 space-y-4">
          <div className="flex items-center justify-between px-2">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Tema</span>
            <button 
              onClick={toggleTheme}
              className="p-1.5 bg-white/5 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white transition-all"
            >
              {theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
            </button>
          </div>
          <div className="flex items-center gap-3 px-2 py-2 bg-white/5 rounded-xl border border-white/5">
            <div className="w-8 h-8 rounded-full bg-brand-500/20 border border-brand-500/30 flex items-center justify-center text-brand-500">
              <User size={18} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-white truncate">Usuário Premium</p>
              <p className="text-[10px] text-slate-500 truncate">
                {isSupabaseEnabled ? session?.user.email ?? 'Usuário autenticado' : 'Dados salvos neste navegador'}
              </p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex flex-col flex-1 overflow-y-auto">
        {/* Top Bar */}
        <header className="sticky top-0 z-50 border-b border-premium-border bg-premium-surface/85 px-4 py-4 backdrop-blur-md transition-colors duration-300 lg:px-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-xl bg-brand-500 text-white shadow-lg shadow-brand-500/20 lg:hidden">
                <TrendingUp size={18} />
              </div>
              <div>
                <h1 className="text-lg font-black tracking-tight text-premium-text sm:text-xl">{pageHeader.title}</h1>
                <p className="mt-1 text-[11px] font-medium text-premium-muted">
                  {pageHeader.subtitle}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 md:justify-end">
              <span className="rounded-full border border-premium-border bg-premium-bg/60 px-3 py-1.5 text-[11px] font-semibold text-premium-muted">
                {currentDateLabel}
              </span>
              <span className="rounded-full border border-brand-500/20 bg-brand-500/10 px-3 py-1.5 text-[11px] font-bold text-brand-500">
                {isSupabaseEnabled ? 'Supabase ativo' : 'Modo local'}
              </span>
              {isSupabaseEnabled && (
                <button
                  type="button"
                  onClick={() => void handleSignOut()}
                  className="secondary flex items-center gap-2 px-3 py-1.5 text-[11px]"
                >
                  <LogOut size={14} />
                  Sair
                </button>
              )}
            </div>
          </div>
        </header>

        <main className="p-4 lg:p-6 max-w-[1600px] mx-auto w-full space-y-6">
          <AnimatePresence>
            {toast && (
              <motion.div
                initial={{ opacity: 0, y: -20, x: '-50%' }}
                animate={{ opacity: 1, y: 0, x: '-50%' }}
                exit={{ opacity: 0, y: -20, x: '-50%' }}
                className="fixed top-16 left-1/2 lg:left-[calc(50%+128px)] z-[100] px-4 py-2 bg-nav-bg border border-brand-500/30 text-white rounded-xl shadow-2xl flex items-center gap-2"
              >
                <div className="w-1.5 h-1.5 bg-brand-500 rounded-full animate-pulse"></div>
                <span className="text-xs font-bold">{toast.message}</span>
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence mode="wait">
            {activeTab === 'dashboard' && (
              <motion.div 
                key="dashboard"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-4"
              >
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                  <div className="lg:col-span-8 space-y-4">
                    {/* Hero Dashboard Card - Daily Goal Tracker */}
                    <div className={cn(
                      "premium-card p-6 bg-nav-bg text-white relative overflow-hidden flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-brand-500/20 lg:h-[240px]",
                      "shadow-2xl shadow-brand-500/10",
                      isGoalOnboarding && "ring-2 ring-brand-500/50 shadow-[0_0_30px_rgba(249,115,22,0.35)]"
                    )}>
                      <div className="absolute -right-12 -top-12 w-96 h-96 bg-brand-500/10 rounded-full blur-3xl pointer-events-none"></div>
                      <div className="absolute -left-12 -bottom-12 w-64 h-64 bg-brand-500/5 rounded-full blur-3xl pointer-events-none"></div>
                      
                      {/* Left Side: Progress and Info */}
                      <div className="relative z-10 flex-1 flex flex-col justify-center space-y-3">
                        <div className="flex items-center gap-3">
                          <span className="px-3 py-1 bg-brand-500/20 text-brand-500 text-[9px] font-bold uppercase tracking-widest rounded-full border border-brand-500/30">
                            {format(new Date(), 'dd MMMM, yyyy', { locale: ptBR })}
                          </span>
                          {hasTodayGoal ? (
                            <span className={cn(
                              "px-3 py-1 text-[9px] font-bold uppercase tracking-widest rounded-full border",
                              todayResult >= todayGoal 
                                ? "bg-positive/20 text-positive border-positive/30" 
                                : "bg-brand-500/20 text-brand-500 border-brand-500/30"
                            )}>
                              {todayResult >= todayGoal ? 'Meta Batida' : 'Em Progresso'}
                            </span>
                          ) : (
                            <span className={cn(
                              "px-3 py-1 text-[9px] font-bold uppercase tracking-widest rounded-full border",
                              isGoalOnboarding 
                                ? "bg-brand-400/30 text-brand-300 border-brand-300/60" 
                                : "bg-brand-500/20 text-brand-500 border-brand-500/30"
                            )}>
                              Meta do Dia Pendente
                            </span>
                          )}
                        </div>

                        <div className="space-y-0.5">
                          <h1 className="text-2xl font-black tracking-tight">
                            {hasTodayGoal ? 'Minha Performance Diária' : 'Qual a sua meta de lucro para hoje?'}
                          </h1>
                          <p className="text-xs text-slate-400 font-medium">
                            {hasTodayGoal
                              ? 'Acompanhamento em tempo real dos seus objetivos financeiros'
                              : 'Defina sua meta diária para acompanhar seu progresso em tempo real.'}
                          </p>
                        </div>

                        {hasTodayGoal ? (
                          <div className="max-w-lg space-y-1.5">
                            <div className="flex justify-between text-[10px] font-bold uppercase tracking-wider">
                              <span className="text-slate-400">Progresso da Meta</span>
                              <span className="text-brand-500">{Math.round(todayProgress)}%</span>
                            </div>
                            <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden border border-white/5">
                              <motion.div 
                                initial={{ width: 0 }}
                                animate={{ width: `${todayProgress}%` }}
                                transition={{ duration: 1, ease: "easeOut" }}
                                className="h-full bg-brand-500 shadow-[0_0_15px_rgba(249,115,22,0.6)]"
                              />
                            </div>
                            <p className="text-[10px] text-slate-500 italic">
                              {todayResult >= todayGoal 
                                ? 'Excelente! Meta atingida com sucesso.' 
                                : `Faltam apenas ${formatCurrency(Math.max(0, todayGoal - todayResult))} para o seu objetivo.`}
                            </p>
                          </div>
                        ) : (
                          <div className={cn(
                            "max-w-lg rounded-2xl px-4 py-3 backdrop-blur-sm",
                            isGoalOnboarding ? "border-2 border-brand-300 bg-brand-500/10" : "border border-brand-500/20 bg-white/5"
                          )}>
                            <div className="flex items-start gap-3">
                              <div className={cn(
                                "mt-0.5 flex h-9 w-9 items-center justify-center rounded-xl shadow-inner",
                                isGoalOnboarding ? "bg-brand-500/25 text-brand-200 shadow-brand-500/20" : "bg-brand-500/15 text-brand-500 shadow-brand-500/10"
                              )}>
                                <Target size={18} />
                              </div>
                              <div className="space-y-1">
                                <p className="text-[11px] font-bold text-white">Meta do dia pendente</p>
                                <p className="text-[10px] leading-relaxed text-slate-400">
                                  Defina sua meta diária para acompanhar seu progresso em tempo real.
                                </p>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Right Side: Values and Action */}
                      <div className={cn(
                        "relative z-10 flex flex-col justify-center gap-4",
                        hasTodayGoal ? "items-center lg:items-end" : "w-full max-w-sm"
                      )}>
                        {hasTodayGoal ? (
                          <div className="flex flex-col sm:flex-row lg:flex-col items-center lg:items-end gap-3 lg:gap-4">
                            <div className="text-center lg:text-right">
                              <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-0.5">Meta do Dia</p>
                              {editingGoal ? (
                                <div className="flex items-center gap-2">
                                  <input
                                    autoFocus
                                    type="text"
                                    inputMode="numeric"
                                    value={tempGoalValue}
                                    onChange={(e) => setTempGoalValue(formatCurrencyInput(e.target.value))}
                                    onBlur={handleGoalEditBlur}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') submitGoal();
                                      if (e.key === 'Escape') cancelGoalEdit();
                                    }}
                                    placeholder="R$ 0,00"
                                    className="w-36 bg-premium-surface border border-brand-500/50 rounded-lg px-3 py-1.5 text-base font-black text-white focus:outline-none focus:ring-1 focus:ring-brand-500"
                                  />
                                </div>
                              ) : (
                                <div className="flex items-center gap-2 group cursor-pointer justify-center lg:justify-end" onClick={openGoalEdit}>
                                  <h3 className="text-2xl font-black text-white group-hover:text-brand-500 transition-colors">
                                    {formatCurrency(todayGoal)}
                                  </h3>
                                  <Edit2 size={14} className="text-slate-600 group-hover:text-brand-500 transition-colors" />
                                </div>
                              )}
                            </div>
                            <div className="text-center lg:text-right">
                              <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-0.5">Resultado Atual</p>
                              <h3 className={cn("text-2xl font-black", todayResult >= 0 ? "text-positive" : "text-negative")}>
                                {formatCurrency(todayResult)}
                              </h3>
                            </div>
                          </div>
                        ) : (
                          <form
                            onSubmit={(e) => {
                              e.preventDefault();
                              submitGoal();
                            }}
                            className="rounded-2xl border border-brand-500/20 bg-premium-surface/70 p-4 shadow-xl shadow-brand-500/10 backdrop-blur-sm"
                          >
                            <div className="space-y-3">
                              <div>
                                <label className="mb-1.5 block text-[9px] font-bold uppercase tracking-[0.2em] text-slate-500">
                                  Meta do Dia
                                </label>
                                <input
                                  autoFocus
                                  type="text"
                                  inputMode="numeric"
                                  value={tempGoalValue}
                                  onChange={(e) => setTempGoalValue(formatCurrencyInput(e.target.value))}
                                  placeholder="R$ 0,00"
                                  className="w-full rounded-xl border border-brand-500/30 bg-nav-bg px-4 py-3 text-lg font-black text-white outline-none transition-all placeholder:text-slate-600 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
                                />
                              </div>
                              <button
                                type="submit"
                                disabled={!canSaveGoal}
                                className="primary flex w-full items-center justify-center gap-2 py-3 text-xs font-black shadow-xl shadow-brand-500/20 transition-all disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:shadow-brand-500/20"
                              >
                                <Target size={16} />
                                Definir Meta
                              </button>
                            </div>
                          </form>
                        )}

                        <button 
                          onClick={() => { setEditingEntry(null); setIsModalOpen(true); }}
                          className="primary flex items-center justify-center gap-2 py-2.5 px-6 text-xs font-black shadow-xl shadow-brand-500/20 hover:shadow-brand-500/40 transition-all active:scale-95 w-full lg:w-auto"
                        >
                          <Plus size={18} />
                          Novo Registro
                        </button>
                      </div>
                    </div>

                  {/* Main Stats Widgets - Horizontal Row */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <PremiumStatCard 
                      label="Saldo Inicial" 
                      value={formatCurrency(todayInitial)} 
                      description="Base inicial do gerenciamento"
                      icon={<Wallet />}
                      isEditable
                      isEditing={editingField === 'initial'}
                      tempValue={tempValue}
                      setTempValue={setTempValue}
                      onEdit={() => {
                        setEditingField('initial');
                        setTempValue(todayInitial.toString());
                      }}
                      onSave={handleInlineSave}
                      onCancel={() => setEditingField(null)}
                    />
                    <PremiumStatCard 
                      label="Saldo Final" 
                      value={formatCurrency(todayFinal)} 
                      description="Último saldo registrado hoje"
                      icon={<Banknote />}
                      isEditable
                      isEditing={editingField === 'final'}
                      tempValue={tempValue}
                      setTempValue={setTempValue}
                      onEdit={() => {
                        setEditingField('final');
                        setTempValue(todayFinal.toString());
                      }}
                      onSave={handleInlineSave}
                      onCancel={() => setEditingField(null)}
                    />
                    <PremiumStatCard 
                      label="Total Acumulado" 
                      value={formatCurrency(stats.totalAccumulated)} 
                      description="Lucro acumulado até o momento"
                      status={stats.totalAccumulated >= 0 ? 'positive' : 'negative'}
                      icon={<BarChart3 />}
                    />
                  </div>

                  {/* Evolution Chart Widget */}
                  <div className="premium-card premium-glow p-5 flex flex-col flex-1 lg:h-[350px] relative overflow-hidden">
                    <div className="absolute -right-20 -top-20 w-64 h-64 bg-brand-500/5 rounded-full blur-3xl pointer-events-none"></div>
                    
                    <div className="relative z-10 flex items-center justify-between mb-4">
                      <div>
                        <h3 className="font-bold text-sm text-premium-text tracking-tight">Evolução e Performance</h3>
                        <p className="text-[10px] text-premium-muted">Acompanhamento do saldo final ao longo do tempo</p>
                      </div>
                      <div className="flex items-center gap-1 bg-premium-surface p-1 rounded-xl border border-premium-border shadow-inner">
                        {(['7days', '30days', 'month', 'all'] as FilterPeriod[]).map((p) => (
                          <button
                            key={p}
                            onClick={() => setPeriod(p)}
                            className={cn(
                              "px-3 py-1 text-[10px] font-bold rounded-lg transition-all",
                              period === p ? "bg-brand-500 text-white shadow-lg shadow-brand-500/20" : "text-premium-muted hover:text-premium-text"
                            )}
                          >
                            {p === '7days' ? '7D' : p === '30days' ? '30D' : p === 'month' ? 'Mês' : 'Tudo'}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="flex-1 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={[...filteredEntries].reverse()}>
                          <defs>
                            <linearGradient id="colorFinal" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#f97316" stopOpacity={0.3}/>
                              <stop offset="95%" stopColor="#f97316" stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={theme === 'light' ? '#f1f5f9' : '#1a1a1a'} />
                          <XAxis 
                            dataKey="date" 
                            tickFormatter={(val) => format(parseISO(val), 'dd/MM')}
                            axisLine={false}
                            tickLine={false}
                            tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 500 }}
                            dy={10}
                          />
                          <YAxis 
                            axisLine={false}
                            tickLine={false}
                            tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 500 }}
                            tickFormatter={(val) => `R$${val}`}
                            dx={-10}
                          />
                          <Tooltip 
                            contentStyle={{ 
                              borderRadius: '16px', 
                              border: '1px solid rgba(255,255,255,0.1)', 
                              boxShadow: '0 25px 50px -12px rgb(0 0 0 / 0.5)',
                              backgroundColor: theme === 'light' ? '#fff' : '#1a1a1a',
                              color: theme === 'light' ? '#111827' : '#f9fafb',
                              fontSize: '11px',
                              padding: '12px'
                            }}
                            itemStyle={{ color: theme === 'light' ? '#111827' : '#f9fafb', fontWeight: 'bold' }}
                            formatter={(val: number) => [formatCurrency(val), 'Saldo']}
                            labelFormatter={(label) => formatDate(label)}
                          />
                          <Line 
                            type="monotone" 
                            dataKey="finalBalance" 
                            stroke="#f97316" 
                            strokeWidth={4} 
                            dot={{ r: 5, fill: '#f97316', strokeWidth: 2, stroke: '#fff' }}
                            activeDot={{ r: 8, strokeWidth: 0, shadow: '0 0 15px rgba(249,115,22,0.5)' }}
                            animationDuration={1500}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                    </div>
                  </div>
                           {/* Right Column Widgets */}
                <div className="lg:col-span-4 flex flex-col gap-4">
                  {/* Breakdown Widget (Redesigned as Gauge) */}
                  <div className="premium-card premium-glow p-6 flex flex-col relative overflow-hidden lg:h-[421px]">
                    <div className="absolute -left-10 -bottom-10 w-64 h-64 bg-brand-500/5 rounded-full blur-3xl pointer-events-none"></div>
                    
                    <div className="flex items-center justify-between mb-6 relative z-10">
                      <div>
                        <h3 className="font-bold text-base text-premium-text tracking-tight">Saques</h3>
                        <p className="text-xs text-premium-muted">Controle de retiradas da banca</p>
                      </div>
                      <div className="w-10 h-10 bg-brand-500/10 rounded-xl flex items-center justify-center text-brand-500 shadow-inner">
                        <ArrowDownToLine size={20} />
                      </div>
                    </div>
                    
                    <div className="relative z-10 flex-1 flex flex-col">
                      <div className="mb-6">
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] mb-1">Total Sacado</p>
                        <h2 className="text-4xl font-black text-brand-500 tracking-tighter">
                          {formatCurrency(stats.totalWithdrawn)}
                        </h2>
                      </div>

                      <div className="grid grid-cols-1 gap-3 mb-6">
                        <div className="p-3 bg-premium-surface rounded-xl border border-premium-border shadow-inner flex items-center justify-between group hover:border-brand-500/30 transition-colors">
                          <div>
                            <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1">Último Saque</p>
                            <p className="text-sm font-black text-premium-text">{formatCurrency(stats.lastWithdrawal)}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1">Data</p>
                            <p className="text-xs font-medium text-premium-muted">{format(parseISO(stats.lastWithdrawalDate), 'dd/MM/yyyy')}</p>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div className="p-3 bg-premium-surface rounded-xl border border-premium-border shadow-inner">
                            <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1">Qtd. Saques</p>
                            <p className="text-sm font-black text-premium-text">{stats.withdrawalsCount}</p>
                          </div>
                          <div className="p-3 bg-premium-surface rounded-xl border border-premium-border shadow-inner">
                            <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1">Média / Saque</p>
                            <p className="text-sm font-black text-premium-text">{formatCurrency(stats.averageWithdrawal)}</p>
                          </div>
                        </div>
                      </div>

                      <div className="mt-auto">
                        <button 
                          onClick={() => setIsWithdrawalModalOpen(true)}
                          className="w-full py-4 bg-brand-500 text-white hover:bg-brand-600 rounded-xl text-xs font-black transition-all shadow-xl shadow-brand-500/20 active:scale-[0.98] flex items-center justify-center gap-2 group"
                        >
                          <Plus size={18} className="group-hover:rotate-90 transition-transform" />
                          Novo Saque
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Side Summary Card Widget (Resumo) */}
                  <div className="premium-card premium-glow p-5 flex flex-col relative overflow-hidden lg:h-[350px]">
                    <div className="absolute -right-10 -top-10 w-32 h-32 bg-brand-500/5 rounded-full blur-2xl pointer-events-none"></div>
                    
                    <div className="flex items-center justify-between mb-5">
                      <div>
                        <h3 className="font-bold text-sm text-premium-text tracking-tight">Resumo de Desempenho</h3>
                        <p className="text-[10px] text-premium-muted">Indicadores financeiros do seu desempenho</p>
                      </div>
                      <div className="w-8 h-8 bg-brand-500/10 rounded-lg flex items-center justify-center text-brand-500">
                        <Activity size={16} />
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3 mb-6">
                      <div className="p-4 bg-premium-surface rounded-xl border border-premium-border shadow-inner group hover:border-positive/30 transition-colors min-h-[112px] flex flex-col justify-between">
                        <div className="space-y-1.5">
                          <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Melhor dia</p>
                          <p className={cn('text-lg sm:text-xl font-black tracking-tight', stats.bestDay > 0 ? 'text-positive' : 'text-premium-text')}>{formatCurrency(stats.bestDay)}</p>
                        </div>
                        <p className="text-[10px] leading-relaxed text-premium-muted">Maior resultado diário no período</p>
                      </div>

                      <div className="p-4 bg-premium-surface rounded-xl border border-premium-border shadow-inner group hover:border-negative/30 transition-colors min-h-[112px] flex flex-col justify-between">
                        <div className="space-y-1.5">
                          <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Pior dia</p>
                          <p className={cn('text-lg sm:text-xl font-black tracking-tight', stats.worstDay < 0 ? 'text-negative' : 'text-premium-text')}>{formatCurrency(stats.worstDay)}</p>
                        </div>
                        <p className="text-[10px] leading-relaxed text-premium-muted">Menor resultado diário no período</p>
                      </div>

                      <div className="p-4 bg-premium-surface rounded-xl border border-premium-border shadow-inner group hover:border-brand-500/30 transition-colors min-h-[112px] flex flex-col justify-between">
                        <div className="space-y-1.5">
                          <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Média por dia</p>
                          <p className={cn('text-lg sm:text-xl font-black tracking-tight', stats.averageDaily > 0 ? 'text-positive' : stats.averageDaily < 0 ? 'text-negative' : 'text-premium-text')}>{formatCurrency(stats.averageDaily)}</p>
                        </div>
                        <p className="text-[10px] leading-relaxed text-premium-muted">Média dos resultados registrados</p>
                      </div>

                      <div className="p-4 bg-premium-surface rounded-xl border border-brand-500/15 shadow-inner group hover:border-brand-500/35 transition-colors min-h-[112px] flex flex-col justify-between">
                        <div className="space-y-1.5">
                          <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Sequência Positiva</p>
                          <p className="text-lg sm:text-xl font-black tracking-tight text-brand-500">{stats.currentStreak} dias</p>
                        </div>
                        <p className="text-[10px] leading-relaxed text-premium-muted">Dias seguidos com resultado positivo</p>
                      </div>
                    </div>

                    <button 
                      onClick={() => setActiveTab('reports')}
                      className="w-full py-3 bg-brand-500 text-white hover:bg-brand-600 rounded-xl text-[11px] font-black transition-all shadow-lg shadow-brand-500/10 active:scale-[0.98] flex items-center justify-center gap-2 mt-auto"
                    >
                      Ver Relatório Completo
                      <ArrowRight size={14} />
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
            )}

          {activeTab === 'history' && (
            <motion.div 
              key="history"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-4"
            >
              <HistorySection
                entries={entries}
                onCreateEntry={() => {
                  setEditingEntry(null);
                  setIsModalOpen(true);
                }}
                onEditEntry={(entry) => {
                  setEditingEntry(entry);
                  setIsModalOpen(true);
                }}
                onDeleteEntry={(entry) => handleDeleteEntry(entry.id)}
                onDuplicateEntry={handleDuplicateEntry}
              />
              {/*
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-2">
                <div>
                  <h2 className="text-lg font-bold text-premium-text">Histórico de Registros</h2>
                  <p className="text-[10px] text-premium-muted">Todos os seus lançamentos organizados por data.</p>
                </div>
                <div className="flex items-center gap-2">
                  <select 
                    value={status} 
                    onChange={(e) => setStatus(e.target.value as FilterStatus)}
                    className="text-[10px] font-bold text-premium-text py-1.5 px-3 bg-premium-surface border border-premium-border rounded-lg outline-none focus:border-brand-500 transition-all"
                  >
                    <option value="all">Todos Status</option>
                    <option value="positive">Positivos</option>
                    <option value="negative">Negativos</option>
                  </select>
                  <select 
                    value={period} 
                    onChange={(e) => setPeriod(e.target.value as FilterPeriod)}
                    className="text-[10px] font-bold text-premium-text py-1.5 px-3 bg-premium-surface border border-premium-border rounded-lg outline-none focus:border-brand-500 transition-all"
                  >
                    <option value="all">Todo Período</option>
                    <option value="7days">7 dias</option>
                    <option value="30days">30 dias</option>
                  </select>
                </div>
              </div>

              <div className="premium-card overflow-hidden border-premium-border shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-premium-surface/50 text-[9px] uppercase tracking-widest text-premium-muted font-bold border-b border-premium-border">
                        <th className="px-4 py-3">Data</th>
                        <th className="px-4 py-3">Saldo Inicial</th>
                        <th className="px-4 py-3">Saldo Final</th>
                        <th className="px-4 py-3">Resultado</th>
                        <th className="px-4 py-3">Variação %</th>
                        <th className="px-4 py-3">Notas</th>
                        <th className="px-4 py-3 text-right">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-premium-border">
                      {filteredEntries.map((entry) => (
                        <tr key={entry.id} className="hover:bg-premium-surface/30 transition-colors group">
                          <td className="px-4 py-2.5 text-[11px] font-bold text-premium-text">{formatDate(entry.date)}</td>
                          <td className="px-4 py-2.5 text-[11px] text-premium-muted">{formatCurrency(entry.initialBalance)}</td>
                          <td className="px-4 py-2.5 text-[11px] text-premium-muted">{formatCurrency(entry.finalBalance)}</td>
                          <td className={cn("px-4 py-2.5 text-[11px] font-bold", entry.result > 0 ? "text-positive" : entry.result < 0 ? "text-negative" : "text-premium-muted")}>
                            {formatCurrency(entry.result)}
                          </td>
                          <td className="px-4 py-2.5">
                            <span className={cn(
                              "px-1.5 py-0.5 rounded-md text-[9px] font-bold",
                              entry.result > 0 ? "bg-positive/10 text-positive" : entry.result < 0 ? "bg-negative/10 text-negative" : "bg-premium-surface text-premium-muted"
                            )}>
                              {entry.result > 0 ? '+' : ''}{entry.percentage.toFixed(2)}%
                            </span>
                          </td>
                          <td className="px-4 py-2.5 text-premium-muted text-[10px] italic max-w-[150px] truncate">{entry.notes || '-'}</td>
                          <td className="px-4 py-2.5 text-right">
                            <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button onClick={() => { setEditingEntry(entry); setIsModalOpen(true); }} className="p-1.5 text-premium-muted hover:text-brand-500 hover:bg-brand-500/10 rounded-lg transition-all">
                                <Edit2 size={12} />
                              </button>
                              <button onClick={() => handleDeleteEntry(entry.id)} className="p-1.5 text-premium-muted hover:text-negative hover:bg-negative/10 rounded-lg transition-all">
                                <Trash2 size={12} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {filteredEntries.length === 0 && <EmptyState />}
              </div>
              */}
            </motion.div>
          )}

          {activeTab === 'reports' && (
            <motion.div 
              key="reports"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-4"
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-2">
                <div>
                  <h2 className="text-lg font-bold text-premium-text">Relatórios de Performance</h2>
                  <p className="text-[10px] text-premium-muted">Análise detalhada de sua evolução e consistência.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="premium-card p-4 space-y-3 border-premium-border shadow-sm">
                  <h4 className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Performance Geral</h4>
                  <div className="space-y-2">
                    <ReportRow label="Taxa de Acerto" value={`${stats.winRate.toFixed(1)}%`} />
                    <ReportRow label="Dias Positivos" value={stats.winDays.toString()} color="text-positive" />
                    <ReportRow label="Dias Negativos" value={stats.lossDays.toString()} color="text-negative" />
                    <ReportRow label="Total de Dias" value={filteredEntries.length.toString()} />
                  </div>
                </div>

                <div className="premium-card p-4 space-y-3 border-premium-border shadow-sm">
                  <h4 className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Métricas Financeiras</h4>
                  <div className="space-y-2">
                    <ReportRow label="Lucro Total" value={formatCurrency(stats.totalAccumulated)} color={stats.totalAccumulated >= 0 ? "text-positive" : "text-negative"} />
                    <ReportRow label="Média Diária" value={formatCurrency(stats.averageDaily)} />
                    <ReportRow label="Maior Lucro" value={formatCurrency(stats.bestDay)} color="text-positive" />
                    <ReportRow label="Maior Prejuízo" value={formatCurrency(stats.worstDay)} color="text-negative" />
                  </div>
                </div>

                <div className="premium-card p-4 space-y-3 border-premium-border shadow-sm">
                  <h4 className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Consistência</h4>
                  <div className="space-y-2">
                    <ReportRow label="Saldo Inicial Médio" value={formatCurrency(filteredEntries.reduce((a, b) => a + b.initialBalance, 0) / (filteredEntries.length || 1))} />
                    <ReportRow label="Saldo Final Médio" value={formatCurrency(filteredEntries.reduce((a, b) => a + b.finalBalance, 0) / (filteredEntries.length || 1))} />
                    <ReportRow label="Variação Média %" value={formatPercent(filteredEntries.reduce((a, b) => a + b.percentage, 0) / (filteredEntries.length || 1))} />
                  </div>
                </div>
              </div>

              <div className="premium-card p-4 border-premium-border shadow-sm">
                <h3 className="font-bold text-xs text-premium-text mb-4">Variação Percentual Diária</h3>
                <div className="h-[200px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={[...filteredEntries].reverse()}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={theme === 'light' ? '#f1f5f9' : '#1a1a1a'} />
                      <XAxis dataKey="date" tickFormatter={(val) => format(parseISO(val), 'dd/MM')} tick={{ fontSize: 9, fill: theme === 'light' ? '#64748b' : '#94a3b8' }} />
                      <YAxis tick={{ fontSize: 9, fill: theme === 'light' ? '#64748b' : '#94a3b8' }} />
                      <Tooltip 
                        contentStyle={{ 
                          borderRadius: '12px', 
                          border: 'none', 
                          boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)',
                          backgroundColor: theme === 'light' ? '#fff' : '#1a1a1a',
                          color: theme === 'light' ? '#111827' : '#f9fafb',
                          fontSize: '10px'
                        }}
                        itemStyle={{ color: theme === 'light' ? '#111827' : '#f9fafb' }}
                      />
                      <Bar dataKey="percentage" name="Variação %">
                        {[...filteredEntries].reverse().map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.percentage >= 0 ? (theme === 'light' ? '#16a34a' : '#22c55e') : (theme === 'light' ? '#dc2626' : '#ef4444')} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>

    {/* Modal Form */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-dark-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md bg-[var(--surface)] rounded-xl shadow-2xl overflow-hidden"
            >
              <div className="p-4 border-b border-[var(--border)] flex items-center justify-between">
                <h3 className="text-lg font-bold text-[var(--text)]">{editingEntry ? 'Editar Registro' : 'Novo Registro'}</h3>
                <button onClick={() => setIsModalOpen(false)} className="p-1.5 hover:bg-slate-100 dark:hover:bg-white/5 rounded-full transition-colors">
                  <X size={20} />
                </button>
              </div>
              <form onSubmit={handleSaveEntry} className="p-4 space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-premium-muted uppercase tracking-wider">Data do Registro</label>
                  <input 
                    type="date" 
                    name="date" 
                    required 
                    defaultValue={editingEntry?.date || format(new Date(), 'yyyy-MM-dd')}
                    className="w-full text-sm font-medium bg-premium-surface text-premium-text border-premium-border rounded-lg px-3 py-2 focus:ring-2 focus:ring-brand-500/20 outline-none transition-all"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-premium-muted uppercase tracking-wider">Saldo Inicial (R$)</label>
                    <input 
                      type="number" 
                      name="initialBalance" 
                      step="0.01" 
                      required 
                      placeholder="0,00"
                      defaultValue={editingEntry?.initialBalance}
                      className="w-full text-sm font-bold bg-premium-surface text-premium-text border-premium-border rounded-lg px-3 py-2 focus:ring-2 focus:ring-brand-500/20 outline-none transition-all"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-premium-muted uppercase tracking-wider">Saldo Final (R$)</label>
                    <input 
                      type="number" 
                      name="finalBalance" 
                      step="0.01" 
                      required 
                      placeholder="0,00"
                      defaultValue={editingEntry?.finalBalance}
                      className="w-full text-sm font-bold bg-premium-surface text-premium-text border-premium-border rounded-lg px-3 py-2 focus:ring-2 focus:ring-brand-500/20 outline-none transition-all"
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-premium-muted uppercase tracking-wider">Observações</label>
                  <textarea 
                    name="notes" 
                    rows={2} 
                    placeholder="Como foi o dia? Algum aprendizado?"
                    defaultValue={editingEntry?.notes}
                    className="w-full resize-none font-medium bg-premium-surface text-premium-text border-premium-border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500/20 outline-none transition-all"
                  />
                </div>
                <div className="pt-2 flex gap-3">
                  <button 
                    type="button" 
                    onClick={() => setIsModalOpen(false)}
                    className="secondary flex-1 py-2 text-xs"
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit" 
                    className="primary flex-1 py-2 text-xs"
                  >
                    Salvar
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Withdrawal Modal */}
      <AnimatePresence>
        {isWithdrawalModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsWithdrawalModalOpen(false)}
              className="absolute inset-0 bg-dark-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md bg-[var(--surface)] rounded-xl shadow-2xl overflow-hidden"
            >
              <div className="p-4 border-b border-[var(--border)] flex items-center justify-between">
                <h3 className="text-lg font-bold text-[var(--text)]">Novo Saque</h3>
                <button onClick={() => setIsWithdrawalModalOpen(false)} className="p-1.5 hover:bg-slate-100 dark:hover:bg-white/5 rounded-full transition-colors">
                  <X size={20} />
                </button>
              </div>
              <form onSubmit={handleSaveWithdrawal} className="p-4 space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-premium-muted uppercase tracking-wider">Data do Saque</label>
                  <input 
                    type="date" 
                    name="date" 
                    required 
                    defaultValue={format(new Date(), 'yyyy-MM-dd')}
                    className="w-full text-sm font-medium bg-premium-surface text-premium-text border-premium-border rounded-lg px-3 py-2 focus:ring-2 focus:ring-brand-500/20 outline-none transition-all"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-premium-muted uppercase tracking-wider">Valor do Saque (R$)</label>
                  <input 
                    type="number" 
                    name="amount" 
                    step="0.01" 
                    required 
                    placeholder="0,00"
                    className="w-full text-sm font-bold bg-premium-surface text-premium-text border-premium-border rounded-lg px-3 py-2 focus:ring-2 focus:ring-brand-500/20 outline-none transition-all"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-premium-muted uppercase tracking-wider">Observações (Opcional)</label>
                  <textarea 
                    name="notes" 
                    rows={2} 
                    placeholder="Ex: Saque para reserva de emergência"
                    className="w-full resize-none font-medium bg-premium-surface text-premium-text border-premium-border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500/20 outline-none transition-all"
                  />
                </div>
                <div className="pt-2 flex gap-3">
                  <button 
                    type="button" 
                    onClick={() => setIsWithdrawalModalOpen(false)}
                    className="secondary flex-1 py-2 text-xs"
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit" 
                    className="primary flex-1 py-2 text-xs"
                  >
                    Registrar Saque
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function SidebarLink({ icon, label, active, onClick }: { icon: React.ReactNode, label: string, active: boolean, onClick: () => void }) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold transition-all duration-200",
        active 
          ? "bg-brand-500 text-white shadow-lg shadow-brand-500/20" 
          : "text-slate-400 hover:text-white hover:bg-white/5"
      )}
    >
      {icon}
      <span>{label}</span>
      {active && <motion.div layoutId="active-pill" className="ml-auto w-1 h-4 bg-white rounded-full" />}
    </button>
  );
}

function FullScreenStatus({ title, description }: { title: string, description: string }) {
  return (
    <div className="min-h-screen bg-premium-bg px-4 py-8 text-premium-text">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-3xl items-center justify-center">
        <div className="premium-card w-full max-w-xl p-8 text-center">
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-500/10 text-brand-500 shadow-lg shadow-brand-500/10">
            <TrendingUp size={24} />
          </div>
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-brand-500">Controle de Banca</p>
          <h2 className="mt-3 text-2xl font-black tracking-tight">{title}</h2>
          <p className="mt-3 text-sm leading-6 text-premium-muted">{description}</p>
        </div>
      </div>
    </div>
  );
}

function PremiumStatCard({ 
  label, 
  value, 
  description,
  status, 
  icon, 
  isEditable, 
  onEdit, 
  isEditing, 
  tempValue, 
  setTempValue, 
  onSave, 
  onCancel 
}: { 
  label: string, 
  value: string, 
  description?: string,
  status?: 'positive' | 'negative' | 'neutral', 
  icon: React.ReactNode,
  isEditable?: boolean,
  onEdit?: () => void,
  onCancel?: () => void,
  isEditing?: boolean,
  tempValue?: string,
  setTempValue?: (val: string) => void,
  onSave?: () => void
}) {
  return (
    <div 
      className={cn(
        "premium-card p-4 flex flex-col border-premium-border shadow-sm hover:shadow-xl hover:border-brand-500/30 transition-all group relative overflow-hidden lg:h-[165px]",
        isEditable && !isEditing && "cursor-pointer"
      )}
      onClick={isEditable && !isEditing ? onEdit : undefined}
    >
      {/* Subtle Background Glow */}
      <div className="absolute -right-4 -top-4 w-24 h-24 bg-brand-500/5 rounded-full blur-3xl group-hover:bg-brand-500/10 transition-colors"></div>
      
      <div className="relative z-10 flex flex-col h-full">
        {/* Top Section: Title and Icon */}
        <div className="flex justify-between items-start mb-auto">
          <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] group-hover:text-brand-500 transition-colors">
            {label}
          </h3>
          <div className="text-premium-muted/30 group-hover:text-brand-500/40 transition-colors">
            {React.cloneElement(icon as React.ReactElement, { size: 16, strokeWidth: 2 })}
          </div>
        </div>
        
        {/* Middle Section: Value */}
        <div className="mb-3">
          {isEditing ? (
            <form onSubmit={(e) => { e.preventDefault(); onSave?.(); }} className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
              <input
                autoFocus
                type="number"
                step="0.01"
                value={tempValue}
                onChange={(e) => setTempValue?.(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') onSave?.();
                  if (e.key === 'Escape') onCancel?.();
                }}
                className="w-full bg-premium-surface border border-brand-500 rounded-lg px-2 py-1 text-lg font-black text-premium-text outline-none focus:ring-2 focus:ring-brand-500/20"
              />
              <div className="flex flex-col gap-1">
                <button type="submit" className="p-1 text-positive hover:bg-positive/10 rounded-md">
                  <Check size={14} />
                </button>
                <button type="button" onClick={onCancel} className="p-1 text-negative hover:bg-negative/10 rounded-md">
                  <X size={14} />
                </button>
              </div>
            </form>
          ) : (
            <div className="flex items-center gap-2">
              <h2 className={cn(
                "text-2xl font-black tracking-tight transition-colors",
                status === 'positive' ? "text-positive" : status === 'negative' ? "text-negative" : "text-premium-text",
                value === 'R$0,00' && isEditable && "text-premium-muted italic text-xs font-medium"
              )}>
                {value === 'R$0,00' && isEditable ? 'Clique para informar' : value}
              </h2>
              {isEditable && <Edit2 size={12} className="text-premium-muted opacity-0 group-hover:opacity-100 transition-opacity" />}
            </div>
          )}
        </div>

        {/* Bottom Section: Description */}
        {!isEditing && description && (
          <div className="pt-2 border-t border-premium-border/50">
            <p className="text-[9px] text-premium-muted font-medium leading-relaxed">
              {description}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function QuickMetric({ label, value, icon: Icon, colorClass = "text-brand-500" }: { label: string, value: string, icon: any, colorClass?: string }) {
  return (
    <div className="flex items-center gap-3 p-3 bg-premium-surface/50 rounded-xl border border-premium-border hover:border-brand-500/30 transition-all group">
      <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center bg-white/5", colorClass)}>
        <Icon size={16} className="group-hover:scale-110 transition-transform" />
      </div>
      <div>
        <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">{label}</p>
        <p className="text-sm font-bold text-premium-text">{value}</p>
      </div>
    </div>
  );
}

function ReportRow({ label, value, color = "text-premium-text" }: { label: string, value: string, color?: string }) {
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-premium-border last:border-0">
      <span className="text-[11px] text-premium-muted font-medium">{label}</span>
      <span className={cn("text-[11px] font-bold", color)}>{value}</span>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      <div className="w-12 h-12 bg-premium-surface rounded-2xl flex items-center justify-center text-premium-muted mb-4">
        <Calendar size={24} />
      </div>
      <h3 className="text-sm font-bold text-premium-text mb-1">Nenhum registro encontrado</h3>
      <p className="text-[10px] text-premium-muted max-w-[200px]">
        Comece a registrar sua banca para ver sua evolução aqui.
      </p>
    </div>
  );
}

