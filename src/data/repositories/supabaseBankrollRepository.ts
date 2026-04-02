import type { Entry, ThemeMode, Withdrawal } from '@/src/types';
import { supabase } from '@/src/lib/supabase';
import type { BankrollRepository } from './types';

type DailyEntryRow = {
  id: string;
  user_id: string;
  entry_date: string;
  initial_balance: number | string;
  final_balance: number | string;
  result: number | string;
  percentage: number | string;
  daily_goal: number | string | null;
  notes: string | null;
};

type WithdrawalRow = {
  id: string;
  user_id: string;
  amount: number | string;
  withdrawal_date: string;
  notes: string | null;
};

type UserPreferencesRow = {
  user_id: string;
  theme: ThemeMode;
};

function toNumber(value: number | string | null | undefined) {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') return Number(value);
  return 0;
}

function mapEntryFromRow(row: DailyEntryRow): Entry {
  return {
    id: row.id,
    date: row.entry_date,
    initialBalance: toNumber(row.initial_balance),
    finalBalance: toNumber(row.final_balance),
    result: toNumber(row.result),
    percentage: toNumber(row.percentage),
    dailyGoal: row.daily_goal == null ? undefined : toNumber(row.daily_goal),
    notes: row.notes ?? '',
  };
}

function mapEntryToRow(entry: Entry, userId: string): DailyEntryRow {
  return {
    id: entry.id,
    user_id: userId,
    entry_date: entry.date,
    initial_balance: entry.initialBalance,
    final_balance: entry.finalBalance,
    result: entry.result,
    percentage: entry.percentage,
    daily_goal: entry.dailyGoal ?? null,
    notes: entry.notes?.trim() ? entry.notes : null,
  };
}

function mapWithdrawalFromRow(row: WithdrawalRow): Withdrawal {
  return {
    id: row.id,
    amount: toNumber(row.amount),
    date: row.withdrawal_date,
    notes: row.notes ?? '',
  };
}

function mapWithdrawalToRow(withdrawal: Withdrawal, userId: string): WithdrawalRow {
  return {
    id: withdrawal.id,
    user_id: userId,
    amount: withdrawal.amount,
    withdrawal_date: withdrawal.date,
    notes: withdrawal.notes?.trim() ? withdrawal.notes : null,
  };
}

function formatPostgrestList(values: string[]) {
  return `(${values.map((value) => JSON.stringify(value)).join(',')})`;
}

export function createSupabaseBankrollRepository(userId: string): BankrollRepository {
  const client = supabase;

  if (!client) {
    throw new Error('Supabase client requested before configuration was loaded.');
  }

  return {
    async loadEntries(fallback: Entry[] = []) {
      const { data, error } = await client
        .from('daily_entries')
        .select(
          'id, user_id, entry_date, initial_balance, final_balance, result, percentage, daily_goal, notes',
        )
        .eq('user_id', userId)
        .order('entry_date', { ascending: false });

      if (error) {
        console.error('[Controle de Banca] Falha ao carregar daily_entries.', error);
        return fallback;
      }

      if (!data?.length) {
        if (fallback.length > 0) {
          await this.saveEntries(fallback);
        }
        return fallback;
      }

      return data.map(mapEntryFromRow);
    },

    async saveEntries(entries) {
      const payload = entries.map((entry) => mapEntryToRow(entry, userId));

      if (payload.length > 0) {
        const { error } = await client
          .from('daily_entries')
          .upsert(payload, { onConflict: 'user_id,entry_date' });

        if (error) {
          console.error('[Controle de Banca] Falha ao salvar daily_entries.', error);
          return;
        }
      }

      const deleteQuery = client.from('daily_entries').delete().eq('user_id', userId);

      const { error: deleteError } =
        payload.length === 0
          ? await deleteQuery
          : await deleteQuery.not(
              'entry_date',
              'in',
              formatPostgrestList(payload.map((entry) => entry.entry_date)),
            );

      if (deleteError) {
        console.error('[Controle de Banca] Falha ao sincronizar remoções de daily_entries.', deleteError);
      }
    },

    async loadWithdrawals(fallback: Withdrawal[] = []) {
      const { data, error } = await client
        .from('withdrawals')
        .select('id, user_id, amount, withdrawal_date, notes')
        .eq('user_id', userId)
        .order('withdrawal_date', { ascending: false });

      if (error) {
        console.error('[Controle de Banca] Falha ao carregar withdrawals.', error);
        return fallback;
      }

      if (!data?.length) {
        if (fallback.length > 0) {
          await this.saveWithdrawals(fallback);
        }
        return fallback;
      }

      return data.map(mapWithdrawalFromRow);
    },

    async saveWithdrawals(withdrawals) {
      const payload = withdrawals.map((withdrawal) => mapWithdrawalToRow(withdrawal, userId));

      if (payload.length > 0) {
        const { error } = await client.from('withdrawals').upsert(payload, { onConflict: 'id' });

        if (error) {
          console.error('[Controle de Banca] Falha ao salvar withdrawals.', error);
          return;
        }
      }

      const deleteQuery = client.from('withdrawals').delete().eq('user_id', userId);

      const { error: deleteError } =
        payload.length === 0
          ? await deleteQuery
          : await deleteQuery.not('id', 'in', formatPostgrestList(payload.map((item) => item.id)));

      if (deleteError) {
        console.error('[Controle de Banca] Falha ao sincronizar remoções de withdrawals.', deleteError);
      }
    },

    async loadTheme(defaultTheme: ThemeMode = 'dark') {
      const { data, error } = await client
        .from('user_preferences')
        .select('user_id, theme')
        .eq('user_id', userId)
        .maybeSingle<UserPreferencesRow>();

      if (error) {
        console.error('[Controle de Banca] Falha ao carregar user_preferences.', error);
        return defaultTheme;
      }

      if (!data) {
        await this.saveTheme(defaultTheme);
        return defaultTheme;
      }

      return data.theme === 'dark' ? 'dark' : 'light';
    },

    async saveTheme(theme) {
      const { error } = await client.from('user_preferences').upsert(
        {
          user_id: userId,
          theme,
        },
        { onConflict: 'user_id' },
      );

      if (error) {
        console.error('[Controle de Banca] Falha ao salvar user_preferences.', error);
      }
    },
  };
}
