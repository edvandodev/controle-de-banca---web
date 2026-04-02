export interface Entry {
  id: string;
  date: string;
  initialBalance: number;
  finalBalance: number;
  notes?: string;
  result: number;
  percentage: number;
  dailyGoal?: number;
}

export type FilterPeriod = 'today' | '7days' | '30days' | 'month' | 'all' | 'custom';
export type FilterStatus = 'all' | 'positive' | 'negative' | 'neutral';
export type HistoryPeriodOption = Extract<FilterPeriod, '7days' | '30days' | 'month' | 'all'>;
export type HistorySortOption = 'recent' | 'oldest' | 'highestProfit' | 'highestLoss' | 'highestVariation';

export type ThemeMode = 'light' | 'dark';

export interface HistoryFilters {
  query: string;
  status: FilterStatus;
  period: HistoryPeriodOption;
  sort: HistorySortOption;
}

export interface HistorySummary {
  totalProfit: number;
  winRate: number;
  bestDay: Entry | null;
  worstDay: Entry | null;
  totalEntries: number;
}

export interface Withdrawal {
  id: string;
  amount: number;
  date: string;
  notes?: string;
}

export interface DashboardStats {
  todayInitial: number;
  todayFinal: number;
  todayResult: number;
  todayPercentage: number;
  todayGoal: number;
  totalAccumulated: number;
  winDays: number;
  lossDays: number;
  bestDay: number;
  worstDay: number;
  averageDaily: number;
  winRate: number;
  currentStreak: number;
  totalWithdrawn: number;
  lastWithdrawal: number;
  lastWithdrawalDate: string;
  withdrawalsCount: number;
  averageWithdrawal: number;
}
