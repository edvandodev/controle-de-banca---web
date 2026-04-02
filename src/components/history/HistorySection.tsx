import { useEffect, useMemo, useState } from 'react';

import type { Entry, FilterStatus, HistoryPeriodOption, HistorySortOption } from '../../types';
import {
  filterHistoryEntries,
  getDefaultHistoryFilters,
  getHistorySummary,
  hasActiveHistoryFilters,
} from '../../lib/history';
import { HistoryDetailsDrawer } from './HistoryDetailsDrawer';
import { HistoryFilters } from './HistoryFilters';
import { HistorySummary } from './HistorySummary';
import { HistoryTable } from './HistoryTable';

interface HistorySectionProps {
  entries: Entry[];
  onCreateEntry: () => void;
  onEditEntry: (entry: Entry) => void;
  onDeleteEntry: (entry: Entry) => void;
  onDuplicateEntry: (entry: Entry) => void;
}

export function HistorySection({
  entries,
  onCreateEntry,
  onEditEntry,
  onDeleteEntry,
  onDuplicateEntry,
}: HistorySectionProps) {
  const [filters, setFilters] = useState(getDefaultHistoryFilters);
  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null);

  const filteredEntries = useMemo(() => filterHistoryEntries(entries, filters), [entries, filters]);
  const summary = useMemo(() => getHistorySummary(filteredEntries), [filteredEntries]);
  const hasActiveFilters = useMemo(() => hasActiveHistoryFilters(filters), [filters]);

  const selectedEntry = useMemo(
    () => entries.find((entry) => entry.id === selectedEntryId) ?? null,
    [entries, selectedEntryId],
  );

  useEffect(() => {
    if (selectedEntryId && !selectedEntry) {
      setSelectedEntryId(null);
    }
  }, [selectedEntry, selectedEntryId]);

  const updateFilter = <K extends keyof typeof filters>(key: K, value: (typeof filters)[K]) => {
    setFilters((current) => ({ ...current, [key]: value }));
  };

  const clearFilters = () => setFilters(getDefaultHistoryFilters());
  const handleViewEntry = (entry: Entry) => setSelectedEntryId(entry.id);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-lg font-bold text-premium-text">Histórico de Registros</h2>
          <p className="text-[10px] text-premium-muted">Análise dos lançamentos com filtros, resumo e detalhes por registro.</p>
        </div>
        <button type="button" onClick={onCreateEntry} className="primary w-full py-2 text-xs md:w-auto">
          Novo registro
        </button>
      </div>

      <HistorySummary summary={summary} />

      <HistoryFilters
        filters={filters}
        hasActiveFilters={hasActiveFilters}
        onQueryChange={(value) => updateFilter('query', value)}
        onStatusChange={(value: FilterStatus) => updateFilter('status', value)}
        onPeriodChange={(value: HistoryPeriodOption) => updateFilter('period', value)}
        onSortChange={(value: HistorySortOption) => updateFilter('sort', value)}
        onClearFilters={clearFilters}
      />

      <HistoryTable
        entries={filteredEntries}
        totalEntries={entries.length}
        hasActiveFilters={hasActiveFilters}
        onViewEntry={handleViewEntry}
        onEditEntry={(entry) => {
          setSelectedEntryId(null);
          onEditEntry(entry);
        }}
        onDeleteEntry={(entry) => {
          setSelectedEntryId((current) => (current === entry.id ? null : current));
          onDeleteEntry(entry);
        }}
        onDuplicateEntry={onDuplicateEntry}
        onCreateEntry={onCreateEntry}
        onClearFilters={clearFilters}
      />

      <HistoryDetailsDrawer
        entry={selectedEntry}
        onClose={() => setSelectedEntryId(null)}
        onEdit={(entry) => {
          setSelectedEntryId(null);
          onEditEntry(entry);
        }}
        onDelete={(entry) => {
          setSelectedEntryId(null);
          onDeleteEntry(entry);
        }}
        onDuplicate={onDuplicateEntry}
      />
    </div>
  );
}
