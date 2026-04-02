import { addDays, endOfDay, format, parseISO, startOfDay, startOfMonth, subDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';

import type { Entry, HistoryFilters, HistorySummary } from '../types';
import { formatDate } from './utils';

const DEFAULT_HISTORY_FILTERS: HistoryFilters = {
  query: '',
  status: 'all',
  period: 'all',
  sort: 'recent',
};

function normalizeSearchTerm(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();
}

function matchesPeriod(entry: Entry, period: HistoryFilters['period'], referenceDate: Date) {
  const entryDate = parseISO(entry.date);

  if (period === '7days') {
    return entryDate >= startOfDay(subDays(referenceDate, 6));
  }

  if (period === '30days') {
    return entryDate >= startOfDay(subDays(referenceDate, 29));
  }

  if (period === 'month') {
    return entryDate >= startOfMonth(referenceDate) && entryDate <= endOfDay(referenceDate);
  }

  return true;
}

function matchesSearch(entry: Entry, query: string) {
  if (!query) return true;

  const entryDate = parseISO(entry.date);
  const searchableDate = [
    formatDate(entry.date),
    format(entryDate, 'dd/MM'),
    format(entryDate, 'dd MMM yyyy', { locale: ptBR }),
    format(entryDate, "EEEE, dd 'de' MMMM", { locale: ptBR }),
  ]
    .map(normalizeSearchTerm)
    .join(' ');

  const searchableNotes = normalizeSearchTerm(entry.notes ?? '');

  return searchableDate.includes(query) || searchableNotes.includes(query);
}

function compareEntries(a: Entry, b: Entry, sort: HistoryFilters['sort']) {
  if (sort === 'oldest') {
    return a.date.localeCompare(b.date);
  }

  if (sort === 'highestProfit') {
    if (b.result !== a.result) return b.result - a.result;
    return b.date.localeCompare(a.date);
  }

  if (sort === 'highestLoss') {
    if (a.result !== b.result) return a.result - b.result;
    return b.date.localeCompare(a.date);
  }

  if (sort === 'highestVariation') {
    const variationDiff = Math.abs(b.percentage) - Math.abs(a.percentage);
    if (variationDiff !== 0) return variationDiff;
    return b.date.localeCompare(a.date);
  }

  return b.date.localeCompare(a.date);
}

export function getDefaultHistoryFilters(): HistoryFilters {
  return { ...DEFAULT_HISTORY_FILTERS };
}

export function hasActiveHistoryFilters(filters: HistoryFilters) {
  return (
    filters.query.trim().length > 0 ||
    filters.status !== DEFAULT_HISTORY_FILTERS.status ||
    filters.period !== DEFAULT_HISTORY_FILTERS.period ||
    filters.sort !== DEFAULT_HISTORY_FILTERS.sort
  );
}

export function filterHistoryEntries(entries: Entry[], filters: HistoryFilters, referenceDate = new Date()) {
  const normalizedQuery = normalizeSearchTerm(filters.query);

  return [...entries]
    .filter((entry) => {
      const statusMatch =
        filters.status === 'all' ||
        (filters.status === 'positive' && entry.result > 0) ||
        (filters.status === 'negative' && entry.result < 0) ||
        (filters.status === 'neutral' && entry.result === 0);

      return statusMatch && matchesPeriod(entry, filters.period, referenceDate) && matchesSearch(entry, normalizedQuery);
    })
    .sort((a, b) => compareEntries(a, b, filters.sort));
}

export function getHistorySummary(entries: Entry[]): HistorySummary {
  if (entries.length === 0) {
    return {
      totalProfit: 0,
      winRate: 0,
      bestDay: null,
      worstDay: null,
      totalEntries: 0,
    };
  }

  const wins = entries.filter((entry) => entry.result > 0).length;

  const bestDay = entries.reduce((best, current) => {
    if (!best || current.result > best.result) return current;
    if (current.result === best.result && current.date > best.date) return current;
    return best;
  }, null as Entry | null);

  const worstDay = entries.reduce((worst, current) => {
    if (!worst || current.result < worst.result) return current;
    if (current.result === worst.result && current.date > worst.date) return current;
    return worst;
  }, null as Entry | null);

  return {
    totalProfit: entries.reduce((total, entry) => total + entry.result, 0),
    winRate: (wins / entries.length) * 100,
    bestDay,
    worstDay,
    totalEntries: entries.length,
  };
}

export function getDuplicateEntryDraft(entries: Entry[], source: Entry): Entry {
  const takenDates = new Set(entries.map((entry) => entry.date));
  let nextDate = source.date;

  do {
    nextDate = format(addDays(parseISO(nextDate), 1), 'yyyy-MM-dd');
  } while (takenDates.has(nextDate));

  return {
    ...source,
    id: '',
    date: nextDate,
  };
}
