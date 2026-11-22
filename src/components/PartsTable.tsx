import {
  AlertTriangle,
  CheckCircle2,
  PackagePlus,
  PackageSearch,
  Pencil,
  Trash2,
  XCircle,
} from 'lucide-react';
import {
  getPartStatus,
  STATUS_LABELS,
  type PartStatus,
  type SparePart,
} from '../data/sampleParts';

interface PartsTableProps {
  parts: SparePart[];
  totalCount: number;
  hasActiveFilter: boolean;
  onResetFilters: () => void;
  onEditPart?: (part: SparePart) => void;
  onDeletePart?: (part: SparePart) => void;
  onAddPart?: () => void;
}

function StatusDisplay({ status }: { status: PartStatus }) {
  if (status === 'available') {
    return (
      <span className="inline-flex items-center gap-1.5 text-sm font-medium text-emerald-800 whitespace-nowrap">
        <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" aria-hidden="true" />
        <span>{STATUS_LABELS[status]}</span>
      </span>
    );
  }
  if (status === 'low') {
    return (
      <span className="inline-flex items-center gap-1.5 text-sm font-medium text-amber-800 whitespace-nowrap">
        <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0" aria-hidden="true" />
        <span>{STATUS_LABELS[status]}</span>
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-sm font-medium text-red-800 whitespace-nowrap">
      <XCircle className="w-4 h-4 text-red-700 shrink-0" aria-hidden="true" />
      <span>{STATUS_LABELS[status]}</span>
    </span>
  );
}

export function PartsTable({
  parts,
  totalCount,
  hasActiveFilter,
  onResetFilters,
  onEditPart,
  onDeletePart,
  onAddPart,
}: PartsTableProps) {
  const showActions = Boolean(onEditPart || onDeletePart);

  if (parts.length === 0) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-8 text-center">
        <div className="mx-auto w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500 mb-3">
          <PackageSearch className="w-6 h-6" aria-hidden="true" />
        </div>
        <h3 className="text-base font-semibold text-slate-900">
          {totalCount === 0 ? 'لا توجد أصناف مسجلة حاليًا' : 'لا توجد قطع مطابقة للبحث'}
        </h3>
        <p className="mt-1 text-sm text-slate-600">
          {totalCount === 0
            ? 'ابدأ بإضافة أول قطعة غيار إلى مخزون المحل.'
            : 'جرّب البحث بكلمة أخرى أو برقم قطعة مختلف أو قم بإعادة ضبط التصفية.'}
        </p>
        <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
          {hasActiveFilter && (
            <button
              type="button"
              onClick={onResetFilters}
              className="inline-flex items-center justify-center min-h-[48px] px-6 py-2.5 rounded-xl bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-700 focus-visible:ring-offset-2"
            >
              عرض جميع الأصناف
            </button>
          )}
          {totalCount === 0 && onAddPart && (
            <button
              type="button"
              onClick={onAddPart}
              className="inline-flex items-center justify-center gap-2 min-h-[48px] px-6 py-2.5 rounded-xl bg-blue-700 text-white text-sm font-semibold hover:bg-blue-800 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-700 focus-visible:ring-offset-2"
            >
              <PackagePlus className="w-5 h-5" aria-hidden="true" />
              <span>إضافة صنف جديد</span>
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-200 bg-slate-50/70 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-sm text-slate-700">
          <span className="font-semibold text-slate-900">جدول الأصناف</span>
          <span aria-hidden="true" className="text-slate-400">·</span>
          <span className="tabular-nums text-slate-600">
            عرض {parts.length} من أصل {totalCount}
          </span>
        </div>
        {hasActiveFilter && (
          <button
            type="button"
            onClick={onResetFilters}
            className="text-sm font-medium text-blue-700 hover:text-blue-800 min-h-[36px] px-2 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-700"
          >
            إعادة ضبط التصفية
          </button>
        )}
      </div>

      {/* Mobile View (< md): Clear stacked cards for 360px-430px Android screens */}
      <div className="md:hidden divide-y divide-slate-200">
        {parts.map((part) => {
          const status = getPartStatus(part);
          return (
            <div key={part.id} className="p-4 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="text-base font-semibold text-slate-900 leading-snug">
                    {part.name}
                  </h3>
                  <p className="mt-1 text-xs text-slate-500 flex items-center gap-1.5">
                    <span>رقم القطعة:</span>
                    <span dir="ltr" className="font-mono font-medium text-slate-700 tabular-nums">
                      {part.partNumber}
                    </span>
                  </p>
                </div>
                <StatusDisplay status={status} />
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-100 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">الكمية الحالية</span>
                  <span className="font-bold text-slate-900 tabular-nums text-base">
                    {part.quantity}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">الحد الأدنى</span>
                  <span className="font-semibold text-slate-700 tabular-nums text-base">
                    {part.minStock}
                  </span>
                </div>
              </div>

              {showActions && (
                <div className="grid grid-cols-2 gap-2 pt-2">
                  {onEditPart && (
                    <button
                      type="button"
                      onClick={() => onEditPart(part)}
                      className="inline-flex items-center justify-center gap-1.5 min-h-[44px] px-3 rounded-xl border border-slate-300 bg-white text-slate-800 text-sm font-semibold hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-700"
                    >
                      <Pencil className="w-4 h-4 text-slate-600" aria-hidden="true" />
                      <span>تعديل</span>
                    </button>
                  )}
                  {onDeletePart && (
                    <button
                      type="button"
                      onClick={() => onDeletePart(part)}
                      className="inline-flex items-center justify-center gap-1.5 min-h-[44px] px-3 rounded-xl border border-red-200 bg-red-50/70 text-red-800 text-sm font-semibold hover:bg-red-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-700"
                    >
                      <Trash2 className="w-4 h-4 text-red-700" aria-hidden="true" />
                      <span>حذف</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Tablet & Desktop View (>= md): Full HTML table */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-right border-collapse">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50/50 text-xs font-semibold text-slate-600">
              <th scope="col" className="py-3.5 px-4">
                اسم القطعة
              </th>
              <th scope="col" className="py-3.5 px-4">
                رقم القطعة
              </th>
              <th scope="col" className="py-3.5 px-4">
                الكمية
              </th>
              <th scope="col" className="py-3.5 px-4">
                الحد الأدنى
              </th>
              <th scope="col" className="py-3.5 px-4">
                الحالة
              </th>
              {showActions && (
                <th scope="col" className="py-3.5 px-4 text-left">
                  إجراءات
                </th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 text-sm">
            {parts.map((part) => {
              const status = getPartStatus(part);
              return (
                <tr key={part.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-4 px-4 font-semibold text-slate-900">{part.name}</td>
                  <td className="py-4 px-4 font-mono text-slate-700 tabular-nums">
                    <span dir="ltr">{part.partNumber}</span>
                  </td>
                  <td className="py-4 px-4 font-bold text-slate-900 tabular-nums text-base">
                    {part.quantity}
                  </td>
                  <td className="py-4 px-4 text-slate-700 tabular-nums">{part.minStock}</td>
                  <td className="py-4 px-4">
                    <StatusDisplay status={status} />
                  </td>
                  {showActions && (
                    <td className="py-3 px-4">
                      <div className="flex items-center justify-end gap-2">
                        {onEditPart && (
                          <button
                            type="button"
                            onClick={() => onEditPart(part)}
                            className="inline-flex items-center gap-1.5 min-h-[40px] px-3 rounded-lg border border-slate-300 bg-white text-slate-700 text-xs font-semibold hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-700 whitespace-nowrap"
                          >
                            <Pencil className="w-3.5 h-3.5" aria-hidden="true" />
                            <span>تعديل</span>
                          </button>
                        )}
                        {onDeletePart && (
                          <button
                            type="button"
                            onClick={() => onDeletePart(part)}
                            className="inline-flex items-center gap-1.5 min-h-[40px] px-3 rounded-lg border border-red-200 bg-red-50/70 text-red-800 text-xs font-semibold hover:bg-red-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-700 whitespace-nowrap"
                          >
                            <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                            <span>حذف</span>
                          </button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
