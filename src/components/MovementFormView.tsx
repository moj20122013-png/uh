import { useEffect, useState, type FormEvent } from 'react';
import {
  AlertCircle,
  ArrowDownToLine,
  ArrowUpFromLine,
  CheckCircle2,
  PackagePlus,
} from 'lucide-react';
import type { MovementType, SparePart } from '../data/sampleParts';
import {
  getTodayDateString,
  parseQuantityInput,
  type MovementInput,
} from '../utils/inventoryEngine';

interface MovementFormViewProps {
  mode: MovementType;
  parts: SparePart[];
  onSubmitMovement: (
    input: MovementInput
  ) => { ok: true; message: string } | { ok: false; error: string };
  onGoToItems: () => void;
}

export function MovementFormView({
  mode,
  parts,
  onSubmitMovement,
  onGoToItems,
}: MovementFormViewProps) {
  const [selectedPartId, setSelectedPartId] = useState<string>('');
  const [quantity, setQuantity] = useState<string>('');
  const [date, setDate] = useState<string>(() => getTodayDateString());
  const [notes, setNotes] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (parts.length > 0 && !parts.some((p) => p.id === selectedPartId)) {
      setSelectedPartId(parts[0].id);
    } else if (parts.length === 0) {
      setSelectedPartId('');
    }
  }, [parts, selectedPartId]);

  useEffect(() => {
    setError(null);
    setSuccess(null);
    setQuantity('');
    setNotes('');
    setDate(getTodayDateString());
  }, [mode]);

  const isIncoming = mode === 'in';
  const selectedPart = parts.find((p) => p.id === selectedPartId) ?? null;

  const parsedQty = parseQuantityInput(quantity);
  const isQtyValidInt = parsedQty !== null && parsedQty > 0;
  const projectedBalance =
    selectedPart && isQtyValidInt
      ? isIncoming
        ? selectedPart.quantity + parsedQty
        : selectedPart.quantity - parsedQty
      : null;

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!selectedPart) {
      setError('يرجى اختيار الصنف أولًا.');
      return;
    }

    if (!isQtyValidInt || parsedQty === null) {
      setError(
        isIncoming
          ? 'يرجى إدخال كمية مستلمة صحيحة أكبر من صفر.'
          : 'يرجى إدخال كمية مصروفة صحيحة أكبر من صفر.'
      );
      return;
    }

    const result = onSubmitMovement({
      partId: selectedPart.id,
      quantity: parsedQty,
      date: date.trim() || undefined,
      notes: notes.trim() || undefined,
    });

    if (!result.ok) {
      setError(result.error);
      return;
    }

    setSuccess(result.message);
    setQuantity('');
    setNotes('');
  };

  if (parts.length === 0) {
    return (
      <section className="bg-white border border-slate-200 rounded-xl p-6 sm:p-10 text-center max-w-xl mx-auto">
        <div className="mx-auto w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600 mb-3">
          <PackagePlus className="w-6 h-6" aria-hidden="true" />
        </div>
        <h2 className="text-lg font-bold text-slate-900">لا توجد أصناف مسجلة بعد</h2>
        <p className="mt-1.5 text-sm text-slate-600">
          أضف قطعة واحدة على الأقل في قسم الأصناف حتى تتمكن من تسجيل حركات{' '}
          {isIncoming ? 'الوارد' : 'المنصرف'}.
        </p>
        <button
          type="button"
          onClick={onGoToItems}
          className="mt-5 inline-flex items-center justify-center gap-2 min-h-[48px] px-6 py-2.5 rounded-xl bg-blue-700 text-white text-sm font-semibold hover:bg-blue-800 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-700"
        >
          <span>الانتقال إلى الأصناف</span>
        </button>
      </section>
    );
  }

  return (
    <section
      aria-label={isIncoming ? 'تسجيل حركة وارد' : 'تسجيل حركة منصرف'}
      className="bg-white border border-slate-200 rounded-xl p-4 sm:p-6 max-w-2xl mx-auto"
    >
      <div className="flex items-center gap-3 pb-4 border-b border-slate-200">
        <div
          className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
            isIncoming
              ? 'bg-emerald-50 text-emerald-700'
              : 'bg-blue-50 text-blue-700'
          }`}
        >
          {isIncoming ? (
            <ArrowDownToLine className="w-5 h-5" aria-hidden="true" />
          ) : (
            <ArrowUpFromLine className="w-5 h-5" aria-hidden="true" />
          )}
        </div>
        <div>
          <h2 className="text-lg font-bold text-slate-900">
            {isIncoming ? 'تسجيل وارد جديد' : 'تسجيل منصرف جديد'}
          </h2>
          <p className="text-xs sm:text-sm text-slate-600">
            {isIncoming
              ? 'إضافة كمية مستلمة إلى رصيد الصنف وتوثيقها في سجل الحركات.'
              : 'صرف كمية من رصيد الصنف المتوفر مع منع الرصيد السالب.'}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="mt-5 space-y-4">
        {error && (
          <div
            role="alert"
            className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 flex items-start gap-2.5 text-sm text-red-900"
          >
            <AlertCircle className="w-5 h-5 text-red-700 shrink-0 mt-0.5" aria-hidden="true" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div
            role="status"
            className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 flex items-start gap-2.5 text-sm text-emerald-900"
          >
            <CheckCircle2
              className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5"
              aria-hidden="true"
            />
            <span>{success}</span>
          </div>
        )}

        <div>
          <label
            htmlFor="movement-part"
            className="block text-sm font-semibold text-slate-800 mb-1.5"
          >
            اختر الصنف <span className="text-red-600">*</span>
          </label>
          <select
            id="movement-part"
            value={selectedPartId}
            onChange={(e) => {
              setSelectedPartId(e.target.value);
              setError(null);
            }}
            className="w-full min-h-[50px] px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-base text-slate-900 focus:outline-none focus:border-blue-700 focus:ring-2 focus:ring-blue-700/20"
          >
            {parts.map((part) => (
              <option key={part.id} value={part.id}>
                {part.name} — {part.partNumber} (الرصيد: {part.quantity})
              </option>
            ))}
          </select>
        </div>

        {selectedPart && (
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 flex flex-wrap items-center justify-between gap-3 text-sm">
            <div>
              <span className="text-slate-600">الرصيد المتوفر حاليًا: </span>
              <span className="font-bold text-slate-900 tabular-nums text-base">
                {selectedPart.quantity}
              </span>
            </div>
            {projectedBalance !== null && (
              <div>
                <span className="text-slate-600">الرصيد بعد الحفظ: </span>
                <span
                  className={`font-bold tabular-nums text-base ${
                    projectedBalance < 0 ? 'text-red-700' : 'text-blue-700'
                  }`}
                >
                  {projectedBalance}
                </span>
              </div>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label
              htmlFor="movement-qty"
              className="block text-sm font-semibold text-slate-800 mb-1.5"
            >
              {isIncoming ? 'الكمية المستلمة' : 'الكمية المصروفة'}{' '}
              <span className="text-red-600">*</span>
            </label>
            <input
              id="movement-qty"
              type="text"
              inputMode="numeric"
              autoComplete="off"
              value={quantity}
              onChange={(e) => {
                setQuantity(e.target.value);
                setError(null);
              }}
              placeholder="أدخل الكمية (مثال: 1 أو ١)"
              className="w-full min-h-[50px] px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-base tabular-nums text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-700 focus:ring-2 focus:ring-blue-700/20"
            />
          </div>

          <div>
            <label
              htmlFor="movement-date"
              className="block text-sm font-semibold text-slate-800 mb-1.5"
            >
              التاريخ (اختياري)
            </label>
            <input
              id="movement-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full min-h-[50px] px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-base tabular-nums text-slate-900 focus:outline-none focus:border-blue-700 focus:ring-2 focus:ring-blue-700/20"
            />
          </div>
        </div>

        <div>
          <label
            htmlFor="movement-notes"
            className="block text-sm font-semibold text-slate-800 mb-1.5"
          >
            {isIncoming ? 'اسم المورد (اختياري)' : 'السبب / الملاحظة (اختياري)'}
          </label>
          <input
            id="movement-notes"
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder={
              isIncoming
                ? 'مثال: مؤسسة النجم لقطع الغيار'
                : 'مثال: بيع نقدي / ورشة الصيانة'
            }
            className="w-full min-h-[50px] px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-base text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-700 focus:ring-2 focus:ring-blue-700/20"
          />
        </div>

        <button
          type="submit"
          className="w-full min-h-[52px] px-6 py-3 rounded-xl bg-blue-700 text-white text-base font-bold hover:bg-blue-800 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-700 focus-visible:ring-offset-2"
        >
          {isIncoming ? 'حفظ الوارد وتحديث الرصيد' : 'حفظ المنصرف وخصم الرصيد'}
        </button>
      </form>
    </section>
  );
}
