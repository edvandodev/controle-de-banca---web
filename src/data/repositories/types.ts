import type { Entry, ThemeMode, Withdrawal } from '@/src/types';

export interface BankrollRepository {
  loadEntries(fallback?: Entry[]): Promise<Entry[]>;
  saveEntries(entries: Entry[]): Promise<void>;
  loadWithdrawals(fallback?: Withdrawal[]): Promise<Withdrawal[]>;
  saveWithdrawals(withdrawals: Withdrawal[]): Promise<void>;
  loadTheme(defaultTheme?: ThemeMode): Promise<ThemeMode>;
  saveTheme(theme: ThemeMode): Promise<void>;
}
