import { AnimatePresence, motion } from 'motion/react';
import { CalendarDays, Copy, Edit2, Target, Trash2, Wallet, X } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

import type { Entry } from '../../types';
import { cn, formatCurrency } from '../../lib/utils';

interface HistoryDetailsDrawerProps {
  entry: Entry | null;
  onClose: () => void;
  onEdit: (entry: Entry) => void;
  onDelete: (entry: Entry) => void;
  onDuplicate: (entry: Entry) => void;
}

function MetricCard({
  label,
  value,
  tone = 'neutral',
}: {
  label: string;
  value: string;
  tone?: 'positive' | 'negative' | 'neutral';
}) {
  return (
    <div className="rounded-2xl border border-premium-border bg-premium-surface/80 p-4">
      <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">{label}</p>
      <p
        className={cn(
          'mt-2 text-base font-black',
          tone === 'positive' ? 'text-positive' : tone === 'negative' ? 'text-negative' : 'text-premium-text',
        )}
      >
        {value}
      </p>
    </div>
  );
}

export function HistoryDetailsDrawer({ entry, onClose, onEdit, onDelete, onDuplicate }: HistoryDetailsDrawerProps) {
  return (
    <AnimatePresence>
      {entry && (
        <div className="fixed inset-0 z-[110]">
          <motion.button
            type="button"
            aria-label="Fechar detalhes"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-dark-900/70 backdrop-blur-sm"
          />

          <motion.aside
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 240, damping: 28 }}
            className="absolute right-0 top-0 flex h-full w-full max-w-xl flex-col border-l border-premium-border bg-nav-bg text-white shadow-2xl"
          >
            <div className="border-b border-white/10 px-5 py-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">Detalhes do registro</p>
                  <h3 className="mt-2 text-xl font-black tracking-tight">
                    {format(parseISO(entry.date), "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-slate-400 transition-colors hover:text-white"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => onEdit(entry)}
                  className="secondary inline-flex items-center gap-2 border-white/10 bg-white/5 text-white hover:bg-white/10"
                >
                  <Edit2 size={14} />
                  Editar
                </button>
                <button
                  type="button"
                  onClick={() => onDuplicate(entry)}
                  className="secondary inline-flex items-center gap-2 border-white/10 bg-white/5 text-white hover:bg-white/10"
                >
                  <Copy size={14} />
                  Duplicar
                </button>
                <button
                  type="button"
                  onClick={() => onDelete(entry)}
                  className="secondary inline-flex items-center gap-2 border-negative/20 bg-negative/10 text-negative hover:bg-negative/20"
                >
                  <Trash2 size={14} />
                  Excluir
                </button>
              </div>
            </div>

            <div className="flex-1 space-y-5 overflow-y-auto px-5 py-5">
              <div className="rounded-3xl border border-brand-500/15 bg-white/5 p-5">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-500/15 text-brand-500">
                    <Wallet size={20} />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">Resultado do dia</p>
                    <p
                      className={cn(
                        'mt-1 text-2xl font-black tracking-tight',
                        entry.result > 0 ? 'text-positive' : entry.result < 0 ? 'text-negative' : 'text-white',
                      )}
                    >
                      {formatCurrency(entry.result)}
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <MetricCard label="Saldo inicial" value={formatCurrency(entry.initialBalance)} />
                <MetricCard label="Saldo final" value={formatCurrency(entry.finalBalance)} />
                <MetricCard
                  label="Variação %"
                  value={`${entry.percentage > 0 ? '+' : ''}${entry.percentage.toFixed(2)}%`}
                  tone={entry.percentage > 0 ? 'positive' : entry.percentage < 0 ? 'negative' : 'neutral'}
                />
                <MetricCard
                  label="Meta do dia"
                  value={entry.dailyGoal ? formatCurrency(entry.dailyGoal) : 'Não definida'}
                  tone={entry.dailyGoal ? 'neutral' : 'neutral'}
                />
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="flex items-center gap-2 text-slate-300">
                  <CalendarDays size={16} />
                  <span className="text-[11px] font-bold uppercase tracking-[0.16em]">Data completa</span>
                </div>
                <p className="mt-3 text-sm leading-relaxed text-slate-200">
                  {format(parseISO(entry.date), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                </p>
                <p className="mt-1 text-[11px] text-slate-500">{format(parseISO(entry.date), 'EEEE', { locale: ptBR })}</p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="flex items-center gap-2 text-slate-300">
                  <Target size={16} />
                  <span className="text-[11px] font-bold uppercase tracking-[0.16em]">Observações</span>
                </div>
                <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-slate-200">
                  {entry.notes?.trim() || 'Nenhuma nota adicionada para este registro.'}
                </p>
              </div>
            </div>
          </motion.aside>
        </div>
      )}
    </AnimatePresence>
  );
}
