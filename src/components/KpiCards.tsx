import { AlertTriangle, Boxes, Layers, PackageX } from 'lucide-react';
import type { PartStatus } from '../data/sampleParts';

export type StatusFilter = 'all' | PartStatus;

interface KpiCardsProps {
  totalItems: number;
  totalQuantity: number;
  lowStockCount: number;
  outOfStockCount: number;
  activeFilter: StatusFilter;
  onSelectFilter: (filter: StatusFilter) => void;
}

export function KpiCards({
  totalItems,
  totalQuantity,
  lowStockCount,
  outOfStockCount,
  activeFilter,
  onSelectFilter,
}: KpiCardsProps) {
  const cards: Array<{
    id: string;
    label: string;
    value: number;
    unit: string;
    filterTarget: StatusFilter;
    icon: typeof Boxes;
    iconColor: string;
    valueColor: string;
  }> = [
    {
      id: 'total-items',
      label: 'إجمالي الأصناف',
      value: totalItems,
      unit: 'صنف',
      filterTarget: 'all',
      icon: Boxes,
      iconColor: 'text-blue-700',
      valueColor: 'text-slate-900',
    },
    {
      id: 'total-qty',
      label: 'إجمالي الكميات',
      value: totalQuantity,
      unit: 'قطعة',
      filterTarget: 'all',
      icon: Layers,
      iconColor: 'text-slate-700',
      valueColor: 'text-slate-900',
    },
    {
      id: 'low-stock',
      label: 'الأصناف منخفضة المخزون',
      value: lowStockCount,
      unit: 'صنف',
      filterTarget: 'low',
      icon: AlertTriangle,
      iconColor: 'text-amber-700',
      valueColor: 'text-amber-800',
    },
    {
      id: 'out-of-stock',
      label: 'الأصناف النافدة',
      value: outOfStockCount,
      unit: 'صنف',
      filterTarget: 'out',
      icon: PackageX,
      iconColor: 'text-red-700',
      valueColor: 'text-red-700',
    },
  ];

  return (
    <section aria-label="ملخص المخزون" className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
      {cards.map((card) => {
        const Icon = card.icon;
        const isSelected =
          (card.id === 'total-items' && activeFilter === 'all') ||
          (card.filterTarget !== 'all' && activeFilter === card.filterTarget);

        return (
          <button
            key={card.id}
            type="button"
            onClick={() =>
              onSelectFilter(
                card.filterTarget !== 'all' && activeFilter === card.filterTarget
                  ? 'all'
                  : card.filterTarget
              )
            }
            aria-pressed={isSelected}
            className={`group flex flex-col justify-between text-right rounded-xl border bg-white p-4 min-h-[112px] transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-700 focus-visible:ring-offset-2 ${
              isSelected
                ? 'border-blue-700 ring-1 ring-blue-700 bg-blue-50/30'
                : 'border-slate-200 hover:border-slate-300'
            }`}
          >
            <div className="flex items-start justify-between gap-2 w-full">
              <span className="text-xs sm:text-sm font-medium text-slate-600 leading-snug">
                {card.label}
              </span>
              <Icon className={`w-5 h-5 shrink-0 ${card.iconColor}`} aria-hidden="true" />
            </div>

            <div className="mt-3 flex items-baseline gap-1.5">
              <span className={`text-2xl sm:text-3xl font-bold tabular-nums ${card.valueColor}`}>
                {card.value}
              </span>
              <span className="text-xs text-slate-500">{card.unit}</span>
            </div>
          </button>
        );
      })}
    </section>
  );
}
