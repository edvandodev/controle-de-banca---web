import { RotateCcw, Search } from 'lucide-react';

import type { FilterStatus, HistoryFilters as HistoryFiltersState, HistoryPeriodOption, HistorySortOption } from '../../types';

interface HistoryFiltersProps {
  filters: HistoryFiltersState;
  hasActiveFilters: boolean;
  onQueryChange: (value: string) => void;
  onStatusChange: (value: FilterStatus) => void;
  onPeriodChange: (value: HistoryPeriodOption) => void;
  onSortChange: (value: HistorySortOption) => void;
  onClearFilters: () => void;
}

const statusOptions: Array<{ value: FilterStatus; label: string }> = [
  { value: 'all', label: 'Todos' },
  { value: 'positive', label: 'Positivo' },
  { value: 'negative', label: 'Negativo' },
  { value: 'neutral', label: 'Neutro' },
];

const periodOptions: Array<{ value: HistoryPeriodOption; label: string }> = [
  { value: '7days', label: '7 dias' },
  { value: '30days', label: '30 dias' },
  { value: 'month', label: 'Mês atual' },
  { value: 'all', label: 'Todo período' },
];

const sortOptions: Array<{ value: HistorySortOption; label: string }> = [
  { value: 'recent', label: 'Mais recente' },
  { value: 'oldest', label: 'Mais antigo' },
  { value: 'highestProfit', label: 'Maior lucro' },
  { value: 'highestLoss', label: 'Maior prejuízo' },
  { value: 'highestVariation', label: 'Maior variação' },
];

export function HistoryFilters({
  filters,
  hasActiveFilters,
  onQueryChange,
  onStatusChange,
  onPeriodChange,
  onSortChange,
  onClearFilters,
}: HistoryFiltersProps) {
  return (
    <div className="premium-card border-premium-border p-4 shadow-sm">
      <div className="grid grid-cols-1 gap-3 xl:grid-cols-[minmax(0,1.4fr)_repeat(3,minmax(0,0.8fr))_auto]">
        <label className="flex items-center gap-2 rounded-xl border border-premium-border bg-premium-surface/70 px-3 py-2.5 transition-all focus-within:border-brand-500/40">
          <Search size={15} className="text-premium-muted" />
          <input
            value={filters.query}
            onChange={(event) => onQueryChange(event.target.value)}
            type="text"
            placeholder="Buscar por data ou nota..."
            className="w-full border-none bg-transparent p-0 text-sm text-premium-text focus:ring-0"
          />
        </label>

        <select value={filters.status} onChange={(event) => onStatusChange(event.target.value as FilterStatus)}>
          {statusOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        <select value={filters.period} onChange={(event) => onPeriodChange(event.target.value as HistoryPeriodOption)}>
          {periodOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        <select value={filters.sort} onChange={(event) => onSortChange(event.target.value as HistorySortOption)}>
          {sortOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        {hasActiveFilters ? (
          <button
            type="button"
            onClick={onClearFilters}
            className="secondary inline-flex items-center justify-center gap-2 py-2.5 text-xs"
          >
            <RotateCcw size={14} />
            Limpar filtros
          </button>
        ) : (
          <div className="hidden xl:block" />
        )}
      </div>
    </div>
  );
}
