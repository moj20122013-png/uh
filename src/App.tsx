import { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  ArrowDownToLine,
  ArrowLeft,
  ArrowUpFromLine,
  CheckCircle2,
  History,
  Home,
  Menu,
  Package,
  PackagePlus,
  Search,
  Wrench,
  X,
} from 'lucide-react';
import { BackupRestoreSection } from './components/BackupRestoreSection';
import { ConfirmDialog } from './components/ConfirmDialog';
import { KpiCards, type StatusFilter } from './components/KpiCards';
import { MovementFormView } from './components/MovementFormView';
import { MovementsLogView } from './components/MovementsLogView';
import { PartFormModal } from './components/PartFormModal';
import { PartsTable } from './components/PartsTable';
import {
  getPartStatus,
  normalizeArabicSearch,
  type SparePart,
  type StockMovement,
} from './data/sampleParts';
import {
  addPartItem,
  computeDashboardStats,
  deletePartItem,
  recordIncomingMovement,
  recordOutgoingMovement,
  recalculateParts,
  sortMovementsNewestFirst,
  updatePartItem,
  type MovementInput,
  type PartInput,
} from './utils/inventoryEngine';
import { loadInventoryState, saveInventoryState } from './utils/storage';

type NavSectionId =
  | 'home'
  | 'items'
  | 'incoming'
  | 'outgoing'
  | 'shortages'
  | 'history';

interface NavItem {
  id: NavSectionId;
  label: string;
  icon: typeof Home;
}

const NAV_ITEMS: NavItem[] = [
  { id: 'home', label: 'الرئيسية', icon: Home },
  { id: 'items', label: 'الأصناف', icon: Package },
  { id: 'incoming', label: 'الوارد', icon: ArrowDownToLine },
  { id: 'outgoing', label: 'المنصرف', icon: ArrowUpFromLine },
  { id: 'shortages', label: 'النواقص', icon: AlertCircle },
  { id: 'history', label: 'سجل الحركات', icon: History },
];

const FILTER_OPTIONS: Array<{ id: StatusFilter; label: string }> = [
  { id: 'all', label: 'الكل' },
  { id: 'available', label: 'متوفر' },
  { id: 'low', label: 'منخفض المخزون' },
  { id: 'out', label: 'نافد' },
];

export default function App() {
  const [initialLoad] = useState(() => loadInventoryState());
  const [parts, setParts] = useState<SparePart[]>(initialLoad.state.parts);
  const [movements, setMovements] = useState<StockMovement[]>(
    initialLoad.state.movements
  );

  const [activeNav, setActiveNav] = useState<NavSectionId>('home');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  const [partModalOpen, setPartModalOpen] = useState(false);
  const [editingPart, setEditingPart] = useState<SparePart | null>(null);
  const [partPendingDelete, setPartPendingDelete] = useState<SparePart | null>(null);

  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(() =>
    initialLoad.error ? { type: 'error', text: initialLoad.error } : null
  );

  // Sync changes to Local Storage automatically
  useEffect(() => {
    const saveResult = saveInventoryState(parts, movements);
    if (!saveResult.ok) {
      setFeedback({ type: 'error', text: saveResult.error });
    }
  }, [parts, movements]);

  const stats = useMemo(() => computeDashboardStats(parts), [parts]);

  const filteredParts = useMemo(() => {
    const normalizedQuery = normalizeArabicSearch(searchQuery);

    return parts.filter((part) => {
      const status = getPartStatus(part);

      if (activeNav === 'shortages') {
        if (status === 'available') return false;
      } else if (statusFilter !== 'all' && status !== statusFilter) {
        return false;
      }

      if (!normalizedQuery) return true;

      const normalizedName = normalizeArabicSearch(part.name);
      const normalizedNumber = normalizeArabicSearch(part.partNumber);
      return (
        normalizedName.includes(normalizedQuery) ||
        normalizedNumber.includes(normalizedQuery)
      );
    });
  }, [parts, activeNav, searchQuery, statusFilter]);

  const recentMovements = useMemo(
    () => sortMovementsNewestFirst(movements).slice(0, 5),
    [movements]
  );

  const handleSelectNav = (id: NavSectionId) => {
    setActiveNav(id);
    setMobileMenuOpen(false);
    setFeedback(null);
    if (id === 'shortages') {
      setStatusFilter('all');
    }
  };

  const handleResetFilters = () => {
    setSearchQuery('');
    setStatusFilter('all');
  };

  const handleOpenAddPart = () => {
    setEditingPart(null);
    setPartModalOpen(true);
  };

  const handleOpenEditPart = (part: SparePart) => {
    setEditingPart(part);
    setPartModalOpen(true);
  };

  const handleSubmitPart = (
    input: PartInput
  ): { ok: true } | { ok: false; error: string } => {
    if (editingPart) {
      const result = updatePartItem(parts, movements, editingPart.id, input);
      if (!result.ok) {
        return { ok: false, error: result.error };
      }
      setParts(result.parts);
      setPartModalOpen(false);
      setEditingPart(null);
      setFeedback({
        type: 'success',
        text: `تم تحديث بيانات الصنف "${result.updatedPart.name}" بنجاح.`,
      });
      return { ok: true };
    }

    const result = addPartItem(parts, movements, input);
    if (!result.ok) {
      return { ok: false, error: result.error };
    }
    setParts(result.parts);
    setPartModalOpen(false);
    setFeedback({
      type: 'success',
      text: `تمت إضافة الصنف "${result.newPart.name}" برصيد ${result.newPart.quantity}.`,
    });
    return { ok: true };
  };

  const handleConfirmDeletePart = () => {
    if (!partPendingDelete) return;
    const { parts: nextParts, deletedPart } = deletePartItem(
      parts,
      partPendingDelete.id
    );
    setParts(nextParts);
    setPartPendingDelete(null);
    if (deletedPart) {
      setFeedback({
        type: 'success',
        text: `تم حذف الصنف "${deletedPart.name}" من المخزون.`,
      });
    }
  };

  const handleRecordIncoming = (
    input: MovementInput
  ): { ok: true; message: string } | { ok: false; error: string } => {
    const result = recordIncomingMovement(parts, movements, input);
    if (!result.ok) {
      return { ok: false, error: result.error };
    }
    setParts(result.parts);
    setMovements(result.movements);
    return {
      ok: true,
      message: `تم تسجيل وارد (${result.movement.quantity}) للصنف "${result.updatedPart.name}". الرصيد الحالي أصبح: ${result.updatedPart.quantity}.`,
    };
  };

  const handleRecordOutgoing = (
    input: MovementInput
  ): { ok: true; message: string } | { ok: false; error: string } => {
    const result = recordOutgoingMovement(parts, movements, input);
    if (!result.ok) {
      return { ok: false, error: result.error };
    }
    setParts(result.parts);
    setMovements(result.movements);
    return {
      ok: true,
      message: `تم صرف (${result.movement.quantity}) من الصنف "${result.updatedPart.name}". الرصيد المتبقي: ${result.updatedPart.quantity}.`,
    };
  };

  const handleRestoreBackup = (
    restoredParts: SparePart[],
    restoredMovements: StockMovement[]
  ) => {
    const nextMovements = sortMovementsNewestFirst(restoredMovements);
    const nextParts = recalculateParts(restoredParts, nextMovements);
    setParts(nextParts);
    setMovements(nextMovements);
    setSearchQuery('');
    setStatusFilter('all');
    setFeedback({
      type: 'success',
      text: `تمت استعادة النسخة الاحتياطية (${nextParts.length} صنف و ${nextMovements.length} حركة).`,
    });
  };

  const hasActiveFilter = searchQuery.trim() !== '' || statusFilter !== 'all';
  const showCatalogView =
    activeNav === 'home' || activeNav === 'items' || activeNav === 'shortages';

  const currentNavLabel =
    NAV_ITEMS.find((item) => item.id === activeNav)?.label ?? 'الرئيسية';

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col lg:flex-row">
      {/* Desktop Right-Side RTL Sidebar */}
      <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:shrink-0 bg-white border-l border-slate-200">
        <div className="h-16 px-5 border-b border-slate-200 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-blue-700 text-white flex items-center justify-center shrink-0">
            <Wrench className="w-5 h-5" aria-hidden="true" />
          </div>
          <span className="text-sm font-bold text-slate-900 leading-tight">
            إدارة مخزون قطع غيار السيارات
          </span>
        </div>

        <nav aria-label="القائمة الرئيسية" className="flex-1 p-3 space-y-1">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = activeNav === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleSelectNav(item.id)}
                aria-current={isActive ? 'page' : undefined}
                className={`w-full flex items-center gap-3 px-4 min-h-[48px] rounded-xl text-sm font-semibold transition-colors whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-700 ${
                  isActive
                    ? 'bg-blue-700 text-white'
                    : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <Icon className="w-5 h-5 shrink-0" aria-hidden="true" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-200 text-xs text-slate-500">
          حفظ محلي على الجهاز (Local Storage)
        </div>
      </aside>

      {/* Main Content Shell */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Compact Sticky Mobile & Desktop Header (56px) */}
        <header className="sticky top-0 z-30 h-14 bg-white/95 backdrop-blur-sm border-b border-slate-200 px-4 sm:px-6 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="فتح قائمة التنقل"
              className="lg:hidden min-h-[44px] min-w-[44px] -mr-2 flex items-center justify-center rounded-xl text-slate-700 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-700 shrink-0"
            >
              <Menu className="w-6 h-6" aria-hidden="true" />
            </button>

            <h1 className="text-base sm:text-lg font-bold text-slate-900 truncate">
              إدارة مخزون قطع غيار السيارات
            </h1>
          </div>

          <span className="text-xs sm:text-sm font-medium text-slate-500 whitespace-nowrap shrink-0">
            {currentNavLabel}
          </span>
        </header>

        {/* Mobile Horizontal Quick Navigation Strip (All 6 items immediately accessible) */}
        <nav
          aria-label="قائمة التنقل السريعة"
          className="lg:hidden bg-white border-b border-slate-200 px-3 py-2 flex items-center gap-2 overflow-x-auto"
        >
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = activeNav === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleSelectNav(item.id)}
                aria-current={isActive ? 'page' : undefined}
                className={`inline-flex items-center gap-1.5 min-h-[44px] px-3.5 rounded-xl text-sm font-semibold whitespace-nowrap shrink-0 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-700 ${
                  isActive
                    ? 'bg-blue-700 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" aria-hidden="true" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Mobile Slide-Over Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-50 lg:hidden flex">
            <div
              className="fixed inset-0 bg-slate-900/50"
              onClick={() => setMobileMenuOpen(false)}
              aria-hidden="true"
            />
            <div
              role="dialog"
              aria-modal="true"
              aria-label="قائمة التنقل"
              className="relative w-72 max-w-[85vw] bg-white h-full shadow-xl flex flex-col z-10"
            >
              <div className="h-14 px-4 border-b border-slate-200 flex items-center justify-between gap-2">
                <span className="font-bold text-slate-900 text-sm truncate">
                  قائمة التطبيق
                </span>
                <button
                  type="button"
                  onClick={() => setMobileMenuOpen(false)}
                  aria-label="إغلاق القائمة"
                  className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-slate-600 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-700"
                >
                  <X className="w-5 h-5" aria-hidden="true" />
                </button>
              </div>

              <div className="p-3 space-y-1.5 flex-1 overflow-y-auto">
                {NAV_ITEMS.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeNav === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleSelectNav(item.id)}
                      className={`w-full flex items-center gap-3 px-4 min-h-[52px] rounded-xl text-base font-semibold transition-colors ${
                        isActive
                          ? 'bg-blue-700 text-white'
                          : 'text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <Icon className="w-5 h-5 shrink-0" aria-hidden="true" />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </div>

              <div className="p-4 border-t border-slate-200 text-xs text-slate-500">
                حفظ محلي على الجهاز (Local Storage)
              </div>
            </div>
          </div>
        )}

        {/* Main Viewport Content */}
        <main className="flex-1 p-4 sm:p-6 max-w-6xl w-full mx-auto space-y-5">
          {feedback && (
            <div
              role={feedback.type === 'error' ? 'alert' : 'status'}
              className={`rounded-xl border px-4 py-3 flex items-center justify-between gap-3 text-sm ${
                feedback.type === 'error'
                  ? 'border-red-200 bg-red-50 text-red-900'
                  : 'border-emerald-200 bg-emerald-50 text-emerald-900'
              }`}
            >
              <div className="flex items-start gap-2.5">
                {feedback.type === 'error' ? (
                  <AlertCircle
                    className="w-5 h-5 text-red-700 shrink-0 mt-0.5"
                    aria-hidden="true"
                  />
                ) : (
                  <CheckCircle2
                    className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5"
                    aria-hidden="true"
                  />
                )}
                <span>{feedback.text}</span>
              </div>
              <button
                type="button"
                onClick={() => setFeedback(null)}
                aria-label="إغلاق التنبيه"
                className="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg hover:bg-black/5 shrink-0"
              >
                <X className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>
          )}

          {showCatalogView ? (
            <>
              {/* 4 KPI Cards on Main Dashboard */}
              {activeNav === 'home' && (
                <KpiCards
                  totalItems={stats.totalItems}
                  totalQuantity={stats.totalQuantity}
                  lowStockCount={stats.lowStockCount}
                  outOfStockCount={stats.outOfStockCount}
                  activeFilter={statusFilter}
                  onSelectFilter={setStatusFilter}
                />
              )}

              {/* Page Header & Primary Action Bar */}
              <section aria-label="البحث وإدارة الأصناف" className="space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                  <div className="relative flex-1">
                    <label htmlFor="part-search" className="sr-only">
                      البحث عن القطع بالاسم أو رقم القطعة
                    </label>
                    <Search
                      className="w-5 h-5 text-slate-400 absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none"
                      aria-hidden="true"
                    />
                    <input
                      id="part-search"
                      type="search"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="ابحث باسم القطعة أو رقم القطعة..."
                      className="w-full min-h-[50px] pr-11 pl-12 py-3 rounded-xl border border-slate-300 bg-white text-base text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-700 focus:ring-2 focus:ring-blue-700/20"
                    />
                    {searchQuery && (
                      <button
                        type="button"
                        onClick={() => setSearchQuery('')}
                        aria-label="مسح نص البحث"
                        className="absolute left-1.5 top-1/2 -translate-y-1/2 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-700"
                      >
                        <X className="w-5 h-5" aria-hidden="true" />
                      </button>
                    )}
                  </div>

                  {activeNav === 'shortages' ? (
                    <button
                      type="button"
                      onClick={() => handleSelectNav('incoming')}
                      className="inline-flex items-center justify-center gap-2 min-h-[50px] px-5 py-3 rounded-xl bg-blue-700 text-white text-sm sm:text-base font-semibold hover:bg-blue-800 transition-colors shrink-0 whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-700 focus-visible:ring-offset-2"
                    >
                      <ArrowDownToLine className="w-5 h-5" aria-hidden="true" />
                      <span>تسجيل وارد للنواقص</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleOpenAddPart}
                      className="inline-flex items-center justify-center gap-2 min-h-[50px] px-5 py-3 rounded-xl bg-blue-700 text-white text-sm sm:text-base font-semibold hover:bg-blue-800 transition-colors shrink-0 whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-700 focus-visible:ring-offset-2"
                    >
                      <PackagePlus className="w-5 h-5" aria-hidden="true" />
                      <span>إضافة صنف جديد</span>
                    </button>
                  )}
                </div>

                {activeNav !== 'shortages' && (
                  <div
                    role="group"
                    aria-label="تصفية حسب حالة المخزون"
                    className="flex items-center gap-2 overflow-x-auto pb-1"
                  >
                    {FILTER_OPTIONS.map((option) => {
                      const isSelected = statusFilter === option.id;
                      return (
                        <button
                          key={option.id}
                          type="button"
                          onClick={() => setStatusFilter(option.id)}
                          aria-pressed={isSelected}
                          className={`min-h-[44px] px-4 rounded-xl text-sm font-semibold whitespace-nowrap shrink-0 border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-700 ${
                            isSelected
                              ? 'bg-slate-900 text-white border-slate-900'
                              : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          {option.label}
                        </button>
                      );
                    })}
                  </div>
                )}
              </section>

              {/* Parts Table */}
              <PartsTable
                parts={filteredParts}
                totalCount={
                  activeNav === 'shortages'
                    ? stats.lowStockCount + stats.outOfStockCount
                    : stats.totalItems
                }
                hasActiveFilter={hasActiveFilter}
                onResetFilters={handleResetFilters}
                onEditPart={handleOpenEditPart}
                onDeletePart={(part) => setPartPendingDelete(part)}
                onAddPart={handleOpenAddPart}
              />

              {/* Dashboard-only Latest Movements & Backup/Restore */}
              {activeNav === 'home' && (
                <>
                  {/* Latest Movements Summary */}
                  <section
                    aria-label="آخر الحركات"
                    className="bg-white border border-slate-200 rounded-xl overflow-hidden"
                  >
                    <div className="px-4 py-3 border-b border-slate-200 bg-slate-50/70 flex items-center justify-between gap-2">
                      <h2 className="text-base font-bold text-slate-900">آخر الحركات</h2>
                      <button
                        type="button"
                        onClick={() => handleSelectNav('history')}
                        className="inline-flex items-center gap-1 text-sm font-semibold text-blue-700 hover:text-blue-800 min-h-[36px] px-2 rounded-lg"
                      >
                        <span>عرض السجل الكامل</span>
                        <ArrowLeft className="w-4 h-4" aria-hidden="true" />
                      </button>
                    </div>

                    {recentMovements.length === 0 ? (
                      <div className="p-6 text-center text-sm text-slate-600">
                        لا توجد حركات وارد أو منصرف مسجلة حتى الآن.
                      </div>
                    ) : (
                      <div className="divide-y divide-slate-200">
                        {recentMovements.map((m) => (
                          <div
                            key={m.id}
                            className="px-4 py-3 flex items-center justify-between gap-3 text-sm"
                          >
                            <div className="min-w-0">
                              <p className="font-semibold text-slate-900 truncate">
                                {m.partName}
                              </p>
                              <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-2">
                                <span dir="ltr" className="font-mono">
                                  {m.partNumber}
                                </span>
                                <span aria-hidden="true">·</span>
                                <span className="font-mono tabular-nums">{m.date}</span>
                              </p>
                            </div>
                            <div className="flex items-center gap-3 shrink-0">
                              <span
                                className={`font-semibold text-xs sm:text-sm ${
                                  m.type === 'in' ? 'text-emerald-800' : 'text-blue-800'
                                }`}
                              >
                                {m.type === 'in' ? 'وارد' : 'منصرف'}
                              </span>
                              <span className="font-bold text-slate-900 tabular-nums text-base">
                                {m.type === 'in' ? `+${m.quantity}` : `-${m.quantity}`}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </section>

                  {/* Backup & Restore */}
                  <BackupRestoreSection
                    parts={parts}
                    movements={movements}
                    onRestoreBackup={handleRestoreBackup}
                  />
                </>
              )}
            </>
          ) : activeNav === 'incoming' ? (
            <MovementFormView
              mode="in"
              parts={parts}
              onSubmitMovement={handleRecordIncoming}
              onGoToItems={() => handleSelectNav('items')}
            />
          ) : activeNav === 'outgoing' ? (
            <MovementFormView
              mode="out"
              parts={parts}
              onSubmitMovement={handleRecordOutgoing}
              onGoToItems={() => handleSelectNav('items')}
            />
          ) : (
            <MovementsLogView movements={movements} />
          )}
        </main>
      </div>

      {/* Add / Edit Part Modal */}
      <PartFormModal
        open={partModalOpen}
        editingPart={editingPart}
        onClose={() => {
          setPartModalOpen(false);
          setEditingPart(null);
        }}
        onSubmit={handleSubmitPart}
      />

      {/* Delete Part Confirmation Modal */}
      <ConfirmDialog
        open={partPendingDelete !== null}
        title="تأكيد حذف الصنف"
        message={
          partPendingDelete
            ? `هل أنت متأكد من حذف الصنف "${partPendingDelete.name}" (رقم القطعة: ${partPendingDelete.partNumber})؟\nلا يمكن التراجع عن هذه الخطوة بعد الحذف.`
            : ''
        }
        confirmLabel="نعم، حذف الصنف"
        variant="danger"
        onConfirm={handleConfirmDeletePart}
        onCancel={() => setPartPendingDelete(null)}
      />
    </div>
  );
}
