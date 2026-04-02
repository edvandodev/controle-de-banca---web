import type { BankrollRepository } from './types';

let warned = false;

export function createSupabasePlaceholderRepository(
  fallback: BankrollRepository,
): BankrollRepository {
  const warn = () => {
    if (!warned) {
      console.warn(
        '[Controle de Banca] VITE_DATA_PROVIDER=supabase foi habilitado, mas a integração real ainda não foi implementada. O app continuará usando localStorage até você ligar o cliente do banco.',
      );
      warned = true;
    }
  };

  return {
    async loadEntries(fallbackEntries) {
      warn();
      return fallback.loadEntries(fallbackEntries);
    },
    async saveEntries(entries) {
      warn();
      await fallback.saveEntries(entries);
    },
    async loadWithdrawals(fallbackWithdrawals) {
      warn();
      return fallback.loadWithdrawals(fallbackWithdrawals);
    },
    async saveWithdrawals(withdrawals) {
      warn();
      await fallback.saveWithdrawals(withdrawals);
    },
    async loadTheme(defaultTheme) {
      warn();
      return fallback.loadTheme(defaultTheme);
    },
    async saveTheme(theme) {
      warn();
      await fallback.saveTheme(theme);
    },
  };
}
