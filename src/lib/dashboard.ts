import { isSameDay, parseISO } from 'date-fns';

import type { DashboardStats, Entry, Withdrawal } from '../types';

export function getDashboardStats(
  entries: Entry[],
  withdrawals: Withdrawal[],
  referenceDate = new Date(),
): DashboardStats {
  if (entries.length === 0) {
    return {
      todayInitial: 0,
      todayFinal: 0,
      todayResult: 0,
      todayPercentage: 0,
      todayGoal: 0,
      totalAccumulated: 0,
      winDays: 0,
      lossDays: 0,
      bestDay: 0,
      worstDay: 0,
      averageDaily: 0,
      winRate: 0,
      currentStreak: 0,
      totalWithdrawn: 0,
      lastWithdrawal: 0,
      lastWithdrawalDate: new Date().toISOString(),
      withdrawalsCount: 0,
      averageWithdrawal: 0,
    };
  }

  const today = entries.find((entry) => isSameDay(parseISO(entry.date), referenceDate));
  const totalResult = entries.reduce((acc, curr) => acc + curr.result, 0);
  const wins = entries.filter((entry) => entry.result > 0).length;
  const losses = entries.filter((entry) => entry.result < 0).length;
  const best = Math.max(...entries.map((entry) => entry.result));
  const worst = Math.min(...entries.map((entry) => entry.result));
  const sortedByDate = [...entries].sort((a, b) => b.date.localeCompare(a.date));

  let streak = 0;
  for (const entry of sortedByDate) {
    if (entry.result > 0) {
      streak += 1;
      continue;
    }

    break;
  }

  const totalWithdrawn = withdrawals.reduce((acc, curr) => acc + curr.amount, 0);
  const sortedWithdrawals = [...withdrawals].sort((a, b) => b.date.localeCompare(a.date));
  const lastWithdrawal = sortedWithdrawals[0];

  return {
    todayInitial: today?.initialBalance ?? 0,
    todayFinal: today?.finalBalance ?? 0,
    todayResult: today?.result ?? 0,
    todayPercentage: today?.percentage ?? 0,
    todayGoal: today?.dailyGoal ?? 0,
    totalAccumulated: totalResult,
    winDays: wins,
    lossDays: losses,
    bestDay: best,
    worstDay: worst,
    averageDaily: totalResult / entries.length,
    winRate: (wins / entries.length) * 100,
    currentStreak: streak,
    totalWithdrawn,
    lastWithdrawal: lastWithdrawal?.amount ?? 0,
    lastWithdrawalDate: lastWithdrawal?.date ?? new Date().toISOString(),
    withdrawalsCount: withdrawals.length,
    averageWithdrawal: withdrawals.length > 0 ? totalWithdrawn / withdrawals.length : 0,
  };
}
