import { ArrowDownRight, ArrowUpRight, Percent, Wallet } from 'lucide-react';

import type { HistorySummary as HistorySummaryData } from '../../types';
import { cn, formatCurrency, formatDate } from '../../lib/utils';

interface HistorySummaryProps {
  summary: HistorySummaryData;
}

const summaryCards = [
  {
    key: 'profit',
    label: 'Lucro do período',
    icon: Wallet,
  },
  {
    key: 'winRate',
    label: 'Taxa de acerto',
    icon: Percent,
  },
  {
    key: 'bestDay',
    label: 'Melhor dia',
    icon: ArrowUpRight,
  },
  {
    key: 'worstDay',
    label: 'Pior dia',
    icon: ArrowDownRight,
  },
] as const;

export function HistorySummary({ summary }: HistorySummaryProps) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {summaryCards.map(({ key, label, icon: Icon }) => {
        const content =
          key === 'profit'
            ? {
                value: formatCurrency(summary.totalProfit),
                detail: `${summary.totalEntries} ${summary.totalEntries === 1 ? 'registro' : 'registros'} considerados`,
                tone:
                  summary.totalProfit > 0
                    ? 'positive'
                    : summary.totalProfit < 0
                      ? 'negative'
                      : 'neutral',
              }
            : key === 'winRate'
              ? {
                  value: `${summary.winRate.toFixed(1)}%`,
                  detail: 'Dias positivos dentro do filtro atual',
                  tone: 'neutral' as const,
                }
              : key === 'bestDay'
                ? {
                    value: summary.bestDay ? formatCurrency(summary.bestDay.result) : 'Sem dados',
                    detail: summary.bestDay ? formatDate(summary.bestDay.date) : 'Aplique outro filtro para comparar',
                    tone: 'positive' as const,
                  }
                : {
                    value: summary.worstDay ? formatCurrency(summary.worstDay.result) : 'Sem dados',
                    detail: summary.worstDay ? formatDate(summary.worstDay.date) : 'Aplique outro filtro para comparar',
                    tone: 'negative' as const,
                  };

        return (
          <div
            key={key}
            className="premium-card premium-glow min-h-[120px] overflow-hidden border-premium-border p-4 shadow-sm"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">{label}</p>
                <p
                  className={cn(
                    'mt-3 text-xl font-black tracking-tight',
                    content.tone === 'positive'
                      ? 'text-positive'
                      : content.tone === 'negative'
                        ? 'text-negative'
                        : 'text-brand-500',
                    content.value === 'Sem dados' && 'text-premium-muted',
                  )}
                >
                  {content.value}
                </p>
              </div>
              <div
                className={cn(
                  'flex h-10 w-10 items-center justify-center rounded-xl border',
                  content.tone === 'positive'
                    ? 'border-positive/20 bg-positive/10 text-positive'
                    : content.tone === 'negative'
                      ? 'border-negative/20 bg-negative/10 text-negative'
                      : 'border-brand-500/20 bg-brand-500/10 text-brand-500',
                )}
              >
                <Icon size={18} />
              </div>
            </div>

            <p className="mt-4 text-[11px] leading-relaxed text-premium-muted">{content.detail}</p>
          </div>
        );
      })}
    </div>
  );
}
