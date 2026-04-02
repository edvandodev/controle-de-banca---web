import { Copy, Edit2, Eye, History, Search, Trash2 } from 'lucide-react';

import type { Entry } from '../../types';
import { cn, formatCurrency, formatDate } from '../../lib/utils';

interface HistoryTableProps {
  entries: Entry[];
  totalEntries: number;
  hasActiveFilters: boolean;
  onViewEntry: (entry: Entry) => void;
  onEditEntry: (entry: Entry) => void;
  onDeleteEntry: (entry: Entry) => void;
  onDuplicateEntry: (entry: Entry) => void;
  onCreateEntry: () => void;
  onClearFilters: () => void;
}

const actionButtons = [
  {
    key: 'view',
    label: 'Visualizar',
    icon: Eye,
    className: 'hover:border-brand-500/30 hover:bg-brand-500/10 hover:text-brand-500',
  },
  {
    key: 'edit',
    label: 'Editar',
    icon: Edit2,
    className: 'hover:border-brand-500/30 hover:bg-brand-500/10 hover:text-brand-500',
  },
  {
    key: 'duplicate',
    label: 'Duplicar',
    icon: Copy,
    className: 'hover:border-brand-500/30 hover:bg-brand-500/10 hover:text-brand-500',
  },
  {
    key: 'delete',
    label: 'Excluir',
    icon: Trash2,
    className: 'hover:border-negative/30 hover:bg-negative/10 hover:text-negative',
  },
] as const;

function HistoryEmptyState({
  hasEntries,
  onCreateEntry,
  onClearFilters,
}: {
  hasEntries: boolean;
  onCreateEntry: () => void;
  onClearFilters: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-premium-border bg-premium-surface text-brand-500">
        {hasEntries ? <Search size={24} /> : <History size={24} />}
      </div>
      <h3 className="mt-4 text-sm font-bold text-premium-text">
        {hasEntries ? 'Nenhum registro encontrado com os filtros atuais' : 'Ainda não há histórico registrado'}
      </h3>
      <p className="mt-2 max-w-sm text-[11px] leading-relaxed text-premium-muted">
        {hasEntries
          ? 'Ajuste a busca, período ou status para visualizar outros lançamentos.'
          : 'Seus registros diários vão aparecer aqui assim que você começar a lançar os resultados da banca.'}
      </p>
      <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
        {hasEntries ? (
          <button type="button" onClick={onClearFilters} className="secondary py-2 text-xs">
            Limpar filtros
          </button>
        ) : (
          <button type="button" onClick={onCreateEntry} className="primary py-2 text-xs">
            Criar novo registro
          </button>
        )}
      </div>
    </div>
  );
}

function HistoryActionButtons({
  entry,
  onViewEntry,
  onEditEntry,
  onDeleteEntry,
  onDuplicateEntry,
}: Omit<HistoryTableProps, 'entries' | 'totalEntries' | 'hasActiveFilters' | 'onCreateEntry' | 'onClearFilters'> & {
  entry: Entry;
}) {
  const handlers = {
    view: () => onViewEntry(entry),
    edit: () => onEditEntry(entry),
    duplicate: () => onDuplicateEntry(entry),
    delete: () => onDeleteEntry(entry),
  };

  return (
    <div className="flex items-center gap-1.5">
      {actionButtons.map(({ key, label, icon: Icon, className }) => (
        <button
          key={key}
          type="button"
          aria-label={label}
          title={label}
          onClick={(event) => {
            event.stopPropagation();
            handlers[key]();
          }}
          className={cn(
            'flex h-8 w-8 items-center justify-center rounded-xl border border-transparent text-premium-muted transition-all',
            className,
          )}
        >
          <Icon size={14} />
        </button>
      ))}
    </div>
  );
}

export function HistoryTable({
  entries,
  totalEntries,
  hasActiveFilters,
  onViewEntry,
  onEditEntry,
  onDeleteEntry,
  onDuplicateEntry,
  onCreateEntry,
  onClearFilters,
}: HistoryTableProps) {
  if (entries.length === 0) {
    return (
      <div className="premium-card overflow-hidden border-premium-border shadow-sm">
        <HistoryEmptyState hasEntries={totalEntries > 0} onCreateEntry={onCreateEntry} onClearFilters={onClearFilters} />
      </div>
    );
  }

  return (
    <>
      <div className="hidden overflow-hidden rounded-[1.25rem] border border-premium-border bg-premium-surface shadow-sm lg:block">
        <div className="max-h-[70vh] overflow-auto">
          <table className="min-w-full border-separate border-spacing-0 text-left">
            <thead className="sticky top-0 z-10 bg-premium-surface/95 backdrop-blur-md">
              <tr className="text-[10px] uppercase tracking-[0.16em] text-slate-500">
                <th className="px-5 py-4 font-bold">Data</th>
                <th className="px-5 py-4 font-bold">Saldo Inicial</th>
                <th className="px-5 py-4 font-bold">Saldo Final</th>
                <th className="px-5 py-4 font-bold">Resultado</th>
                <th className="px-5 py-4 font-bold">Variação %</th>
                <th className="px-5 py-4 font-bold">Notas</th>
                <th className="px-5 py-4 text-right font-bold">Ações</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => (
                <tr
                  key={entry.id}
                  onClick={() => onViewEntry(entry)}
                  className="group cursor-pointer border-t border-premium-border/70 transition-all hover:bg-premium-surface/60"
                >
                  <td className="px-5 py-4">
                    <div className="flex flex-col gap-1">
                      <span className="text-[12px] font-bold text-premium-text">{formatDate(entry.date)}</span>
                      <span className="text-[10px] text-premium-muted">Registro diário</span>
                    </div>
                  </td>
                  <td className="px-5 py-4 text-[12px] text-premium-muted">{formatCurrency(entry.initialBalance)}</td>
                  <td className="px-5 py-4 text-[12px] text-premium-muted">{formatCurrency(entry.finalBalance)}</td>
                  <td
                    className={cn(
                      'px-5 py-4 text-[13px] font-black',
                      entry.result > 0 ? 'text-positive' : entry.result < 0 ? 'text-negative' : 'text-premium-muted',
                    )}
                  >
                    {formatCurrency(entry.result)}
                  </td>
                  <td className="px-5 py-4">
                    <span
                      className={cn(
                        'inline-flex rounded-full px-2.5 py-1 text-[10px] font-bold',
                        entry.percentage > 0
                          ? 'bg-positive/10 text-positive'
                          : entry.percentage < 0
                            ? 'bg-negative/10 text-negative'
                            : 'bg-premium-bg text-premium-muted',
                      )}
                    >
                      {entry.percentage > 0 ? '+' : ''}
                      {entry.percentage.toFixed(2)}%
                    </span>
                  </td>
                  <td className="max-w-[240px] px-5 py-4">
                    <p className="truncate text-[11px] text-premium-muted">{entry.notes?.trim() || 'Sem observações'}</p>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex justify-end opacity-70 transition-opacity lg:opacity-0 lg:group-hover:opacity-100">
                      <HistoryActionButtons
                        entry={entry}
                        onViewEntry={onViewEntry}
                        onEditEntry={onEditEntry}
                        onDeleteEntry={onDeleteEntry}
                        onDuplicateEntry={onDuplicateEntry}
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 lg:hidden">
        {entries.map((entry) => (
          <div
            key={entry.id}
            onClick={() => onViewEntry(entry)}
            className="premium-card space-y-4 border-premium-border p-4 text-left shadow-sm"
            role="button"
            tabIndex={0}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                onViewEntry(entry);
              }
            }}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">Data</p>
                <p className="mt-1 text-sm font-black text-premium-text">{formatDate(entry.date)}</p>
              </div>
              <span
                className={cn(
                  'rounded-full px-2.5 py-1 text-[10px] font-bold',
                  entry.result > 0 ? 'bg-positive/10 text-positive' : entry.result < 0 ? 'bg-negative/10 text-negative' : 'bg-premium-bg text-premium-muted',
                )}
              >
                {formatCurrency(entry.result)}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-premium-border bg-premium-surface/60 p-3">
                <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-slate-500">Saldo inicial</p>
                <p className="mt-1 text-[12px] font-bold text-premium-text">{formatCurrency(entry.initialBalance)}</p>
              </div>
              <div className="rounded-xl border border-premium-border bg-premium-surface/60 p-3">
                <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-slate-500">Saldo final</p>
                <p className="mt-1 text-[12px] font-bold text-premium-text">{formatCurrency(entry.finalBalance)}</p>
              </div>
            </div>

            <div className="flex items-center justify-between gap-3 rounded-xl border border-premium-border bg-premium-surface/60 p-3">
              <div>
                <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-slate-500">Variação</p>
                <p className="mt-1 text-[12px] font-bold text-brand-500">
                  {entry.percentage > 0 ? '+' : ''}
                  {entry.percentage.toFixed(2)}%
                </p>
              </div>
              <p className="max-w-[180px] truncate text-[11px] text-premium-muted">{entry.notes?.trim() || 'Sem observações'}</p>
            </div>

            <HistoryActionButtons
              entry={entry}
              onViewEntry={onViewEntry}
              onEditEntry={onEditEntry}
              onDeleteEntry={onDeleteEntry}
              onDuplicateEntry={onDuplicateEntry}
            />
          </div>
        ))}
      </div>
    </>
  );
}
