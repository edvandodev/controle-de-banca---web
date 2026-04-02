import type { Entry, ThemeMode, Withdrawal } from '@/src/types';
import type { BankrollRepository } from './types';

const STORAGE_KEYS = {
  entries: 'bankroll_entries',
  withdrawals: 'bankroll_withdrawals',
  theme: 'bankroll_theme',
} as const;

function safeRead<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function safeWrite<T>(key: string, value: T) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // noop: keeps UI functional even when storage quota is unavailable
  }
}

export function createLocalBankrollRepository(): BankrollRepository {
  return {
    async loadEntries(fallback: Entry[] = []) {
      return safeRead<Entry[]>(STORAGE_KEYS.entries, fallback);
    },
    async saveEntries(entries) {
      safeWrite(STORAGE_KEYS.entries, entries);
    },
    async loadWithdrawals(fallback: Withdrawal[] = []) {
      return safeRead<Withdrawal[]>(STORAGE_KEYS.withdrawals, fallback);
    },
    async saveWithdrawals(withdrawals) {
      safeWrite(STORAGE_KEYS.withdrawals, withdrawals);
    },
    async loadTheme(defaultTheme: ThemeMode = 'light') {
      try {
        const raw = window.localStorage.getItem(STORAGE_KEYS.theme);
        return raw === 'dark' || raw === 'light' ? raw : defaultTheme;
      } catch {
        return defaultTheme;
      }
    },
    async saveTheme(theme) {
      try {
        window.localStorage.setItem(STORAGE_KEYS.theme, theme);
      } catch {
        // noop
      }
    },
  };
}
