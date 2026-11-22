import { useEffect, useState, type FormEvent } from 'react';
import { AlertCircle, X } from 'lucide-react';
import type { SparePart } from '../data/sampleParts';
import type { PartInput } from '../utils/inventoryEngine';

interface PartFormModalProps {
  open: boolean;
  editingPart: SparePart | null;
  onClose: () => void;
  onSubmit: (input: PartInput) => { ok: true } | { ok: false; error: string };
}

export function PartFormModal({
  open,
  editingPart,
  onClose,
  onSubmit,
}: PartFormModalProps) {
  const [name, setName] = useState('');
  const [partNumber, setPartNumber] = useState('');
  const [openingBalance, setOpeningBalance] = useState('0');
  const [minStock, setMinStock] = useState('0');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    if (editingPart) {
      setName(editingPart.name);
      setPartNumber(editingPart.partNumber);
      setOpeningBalance(String(editingPart.openingBalance));
      setMinStock(String(editingPart.minStock));
    } else {
      setName('');
      setPartNumber('');
      setOpeningBalance('0');
      setMinStock('0');
    }
    setError(null);
  }, [open, editingPart]);

  if (!open) return null;

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    const parsedOpening = Number(openingBalance);
    const parsedMin = Number(minStock);

    if (openingBalance.trim() === '' || !Number.isInteger(parsedOpening) || parsedOpening < 0) {
      setError('رصيد البداية يجب أن يكون رقمًا صحيحًا يساوي صفرًا أو أكثر.');
      return;
    }
    if (minStock.trim() === '' || !Number.isInteger(parsedMin) || parsedMin < 0) {
      setError('الحد الأدنى يجب أن يكون رقمًا صحيحًا يساوي صفرًا أو أكثر.');
      return;
    }

    const result = onSubmit({
      name,
      partNumber,
      openingBalance: parsedOpening,
      minStock: parsedMin,
    });

    if (!result.ok) {
      setError(result.error);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="part-form-title"
    >
      <div
        className="fixed inset-0 bg-slate-900/50"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="relative z-10 w-full sm:max-w-lg bg-white rounded-t-2xl sm:rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-xl max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between gap-3 pb-4 border-b border-slate-200">
          <h2 id="part-form-title" className="text-lg font-bold text-slate-900">
            {editingPart ? 'تعديل بيانات الصنف' : 'إضافة صنف جديد'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="إغلاق النموذج"
            className="min-h-[44px] min-w-[44px] -ml-2 flex items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-700"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {error && (
            <div
              role="alert"
              className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 flex items-start gap-2.5 text-sm text-red-900"
            >
              <AlertCircle className="w-5 h-5 text-red-700 shrink-0 mt-0.5" aria-hidden="true" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label htmlFor="part-name" className="block text-sm font-semibold text-slate-800 mb-1.5">
              اسم القطعة <span className="text-red-600">*</span>
            </label>
            <input
              id="part-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="مثال: فلتر زيت محرك"
              className="w-full min-h-[48px] px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-base text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-700 focus:ring-2 focus:ring-blue-700/20"
            />
          </div>

          <div>
            <label htmlFor="part-number" className="block text-sm font-semibold text-slate-800 mb-1.5">
              رقم القطعة <span className="text-red-600">*</span>
            </label>
            <input
              id="part-number"
              type="text"
              dir="ltr"
              value={partNumber}
              onChange={(e) => setPartNumber(e.target.value)}
              placeholder="04152-YZZA1"
              className="w-full min-h-[48px] px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-base font-mono text-right text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-700 focus:ring-2 focus:ring-blue-700/20"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="part-opening"
                className="block text-sm font-semibold text-slate-800 mb-1.5"
              >
                رصيد البداية
              </label>
              <input
                id="part-opening"
                type="number"
                inputMode="numeric"
                min={0}
                step={1}
                value={openingBalance}
                onChange={(e) => setOpeningBalance(e.target.value)}
                className="w-full min-h-[48px] px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-base tabular-nums text-slate-900 focus:outline-none focus:border-blue-700 focus:ring-2 focus:ring-blue-700/20"
              />
            </div>

            <div>
              <label
                htmlFor="part-min"
                className="block text-sm font-semibold text-slate-800 mb-1.5"
              >
                الحد الأدنى للتنبيه
              </label>
              <input
                id="part-min"
                type="number"
                inputMode="numeric"
                min={0}
                step={1}
                value={minStock}
                onChange={(e) => setMinStock(e.target.value)}
                className="w-full min-h-[48px] px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-base tabular-nums text-slate-900 focus:outline-none focus:border-blue-700 focus:ring-2 focus:ring-blue-700/20"
              />
            </div>
          </div>

          {editingPart && (
            <p className="text-xs text-slate-500 leading-relaxed">
              الرصيد الحالي للصنف يُحسب تلقائيًا: رصيد البداية + الوارد - المنصرف (الحالي:{' '}
              <span className="font-semibold tabular-nums text-slate-800">
                {editingPart.quantity}
              </span>
              ).
            </p>
          )}

          <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2.5 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="min-h-[48px] px-5 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-700 text-sm font-semibold hover:bg-slate-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-700"
            >
              إلغاء
            </button>
            <button
              type="submit"
              className="min-h-[48px] px-6 py-2.5 rounded-xl bg-blue-700 text-white text-sm font-semibold hover:bg-blue-800 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-700 focus-visible:ring-offset-2"
            >
              {editingPart ? 'حفظ التعديلات' : 'إضافة الصنف'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
