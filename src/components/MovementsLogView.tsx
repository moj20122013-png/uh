import { useMemo, useState } from 'react';
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  History,
  Search,
  X,
} from 'lucide-react';
import {
  normalizeArabicSearch,
  type MovementType,
  type StockMovement,
} from '../data/sampleParts';

interface MovementsLogViewProps {
  movements: StockMovement[];
}

type MovementFilter = 'all' | MovementType;

export function MovementsLogView({ movements }: MovementsLogViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<MovementFilter>('all');

  const filteredMovements = useMemo(() => {
    const query = normalizeArabicSearch(searchQuery);
    return movements.filter((m) => {
      if (typeFilter !== 'all' && m.type !== typeFilter) return false;
      if (!query) return true;
      return (
        normalizeArabicSearch(m.partName).includes(query) ||
        normalizeArabicSearch(m.partNumber).includes(query) ||
        normalizeArabicSearch(m.notes).includes(query)
      );
    });
  }, [movements, searchQuery, typeFilter]);

  return (
    <section aria-label="سجل الحركات" className="space-y-4">
      {/* Search & Type Filter */}
      <div className="space-y-3">
        <div className="relative">
          <label htmlFor="movement-search" className="sr-only">
            ابحث في سجل الحركات باسم القطعة أو رقمها
          </label>
          <Search
            className="w-5 h-5 text-slate-400 absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none"
            aria-hidden="true"
          />
          <input
            id="movement-search"
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="ابحث في السجل باسم القطعة أو رقمها أو المورد/السبب..."
            className="w-full min-h-[50px] pr-11 pl-12 py-3 rounded-xl border border-slate-300 bg-white text-base text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-700 focus:ring-2 focus:ring-blue-700/20"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              aria-label="مسح البحث"
              className="absolute left-1.5 top-1/2 -translate-y-1/2 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100"
            >
              <X className="w-5 h-5" aria-hidden="true" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {[
            { id: 'all' as const, label: 'جميع الحركات' },
            { id: 'in' as const, label: 'الوارد فقط' },
            { id: 'out' as const, label: 'المنصرف فقط' },
          ].map((tab) => {
            const isSelected = typeFilter === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setTypeFilter(tab.id)}
                aria-pressed={isSelected}
                className={`min-h-[44px] px-4 rounded-xl text-sm font-semibold whitespace-nowrap shrink-0 border transition-colors ${
                  isSelected
                    ? 'bg-slate-900 text-white border-slate-900'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {filteredMovements.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-8 text-center">
          <div className="mx-auto w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500 mb-3">
            <History className="w-6 h-6" aria-hidden="true" />
          </div>
          <h3 className="text-base font-semibold text-slate-900">
            {movements.length === 0
              ? 'لا توجد حركات مسجلة حتى الآن'
              : 'لا توجد حركات مطابقة للبحث'}
          </h3>
          <p className="mt-1 text-sm text-slate-600">
            {movements.length === 0
              ? 'عند تسجيل أي عملية وارد أو منصرف ستظهر هنا مرتبة من الأحدث إلى الأقدم.'
              : 'جرّب تغيير نص البحث أو إعادة ضبط التصفية.'}
          </p>
          {(searchQuery !== '' || typeFilter !== 'all') && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setTypeFilter('all');
              }}
              className="mt-4 inline-flex items-center justify-center min-h-[48px] px-6 py-2.5 rounded-xl bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800"
            >
              عرض كل الحركات
            </button>
          )}
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-200 bg-slate-50/70 flex items-center justify-between gap-2 text-sm">
            <span className="font-semibold text-slate-900">سجل الحركات</span>
            <span className="text-slate-600 tabular-nums">
              {filteredMovements.length} حركة (من الأحدث إلى الأقدم)
            </span>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden divide-y divide-slate-200">
            {filteredMovements.map((m) => (
              <div key={m.id} className="p-4 space-y-2.5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="text-base font-semibold text-slate-900 leading-snug">
                      {m.partName}
                    </h3>
                    <p className="mt-1 text-xs text-slate-500">
                      رقم القطعة:{' '}
                      <span dir="ltr" className="font-mono font-medium text-slate-700">
                        {m.partNumber}
                      </span>
                    </p>
                  </div>
                  <span
                    className={`inline-flex items-center gap-1 text-sm font-semibold whitespace-nowrap ${
                      m.type === 'in' ? 'text-emerald-800' : 'text-blue-800'
                    }`}
                  >
                    {m.type === 'in' ? (
                      <ArrowDownToLine className="w-4 h-4 text-emerald-700" aria-hidden="true" />
                    ) : (
                      <ArrowUpFromLine className="w-4 h-4 text-blue-700" aria-hidden="true" />
                    )}
                    <span>{m.type === 'in' ? 'وارد' : 'منصرف'}</span>
                  </span>
                </div>

                <div className="flex items-center justify-between text-sm pt-2 border-t border-slate-100">
                  <span className="text-slate-600">
                    الكمية:{' '}
                    <strong className="text-slate-900 tabular-nums">{m.quantity}</strong>
                  </span>
                  <span className="text-slate-600 tabular-nums font-mono text-xs">
                    {m.date}
                  </span>
                </div>

                {m.notes && (
                  <p className="text-xs text-slate-600">
                    {m.type === 'in' ? 'المورد: ' : 'السبب: '}
                    {m.notes}
                  </p>
                )}
              </div>
            ))}
          </div>

          {/* Desktop table */}
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
                    نوع الحركة
                  </th>
                  <th scope="col" className="py-3.5 px-4">
                    الكمية
                  </th>
                  <th scope="col" className="py-3.5 px-4">
                    التاريخ
                  </th>
                  <th scope="col" className="py-3.5 px-4">
                    المورد / السبب
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-sm">
                {filteredMovements.map((m) => (
                  <tr key={m.id} className="hover:bg-slate-50/80">
                    <td className="py-3.5 px-4 font-semibold text-slate-900">{m.partName}</td>
                    <td className="py-3.5 px-4 font-mono text-slate-700 tabular-nums">
                      <span dir="ltr">{m.partNumber}</span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-flex items-center gap-1.5 font-semibold whitespace-nowrap ${
                          m.type === 'in' ? 'text-emerald-800' : 'text-blue-800'
                        }`}
                      >
                        {m.type === 'in' ? (
                          <ArrowDownToLine
                            className="w-4 h-4 text-emerald-700"
                            aria-hidden="true"
                          />
                        ) : (
                          <ArrowUpFromLine
                            className="w-4 h-4 text-blue-700"
                            aria-hidden="true"
                          />
                        )}
                        <span>{m.type === 'in' ? 'وارد' : 'منصرف'}</span>
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-bold text-slate-900 tabular-nums text-base">
                      {m.quantity}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-slate-700 tabular-nums text-xs">
                      {m.date}
                    </td>
                    <td className="py-3.5 px-4 text-slate-600">{m.notes || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  );
}
