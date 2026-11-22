import { useRef, useState, type ChangeEvent } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Download,
  Upload,
} from 'lucide-react';
import type { SparePart, StockMovement } from '../data/sampleParts';
import {
  createBackupPayload,
  getTodayDateString,
  validateAndParseBackup,
} from '../utils/inventoryEngine';
import { ConfirmDialog } from './ConfirmDialog';

interface BackupRestoreSectionProps {
  parts: SparePart[];
  movements: StockMovement[];
  onRestoreBackup: (parts: SparePart[], movements: StockMovement[]) => void;
}

export function BackupRestoreSection({
  parts,
  movements,
  onRestoreBackup,
}: BackupRestoreSectionProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [statusMessage, setStatusMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);
  const [pendingBackup, setPendingBackup] = useState<{
    parts: SparePart[];
    movements: StockMovement[];
    exportedAt?: string;
  } | null>(null);

  const handleExport = () => {
    setStatusMessage(null);
    try {
      const payload = createBackupPayload(parts, movements);
      const jsonString = JSON.stringify(payload, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `auto-parts-backup-${getTodayDateString()}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setStatusMessage({
        type: 'success',
        text: `تم تصدير النسخة الاحتياطية بنجاح (${parts.length} صنف و ${movements.length} حركة).`,
      });
    } catch {
      setStatusMessage({
        type: 'error',
        text: 'حدث خطأ أثناء إنشاء ملف النسخة الاحتياطية.',
      });
    }
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    setStatusMessage(null);
    const file = e.target.files?.[0];
    // Reset input so user can re-select the same file later
    e.target.value = '';
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const rawContent = typeof reader.result === 'string' ? reader.result : '';
      const validation = validateAndParseBackup(rawContent);
      if (!validation.ok) {
        setStatusMessage({
          type: 'error',
          text: validation.error,
        });
        return;
      }
      setPendingBackup(validation.data);
    };
    reader.onerror = () => {
      setStatusMessage({
        type: 'error',
        text: 'تعذر قراءة الملف المختار. لم يتم تغيير أي بيانات حالية.',
      });
    };
    reader.readAsText(file, 'utf-8');
  };

  const handleConfirmRestore = () => {
    if (!pendingBackup) return;
    onRestoreBackup(pendingBackup.parts, pendingBackup.movements);
    setStatusMessage({
      type: 'success',
      text: `تمت استعادة النسخة الاحتياطية بنجاح (${pendingBackup.parts.length} صنف و ${pendingBackup.movements.length} حركة).`,
    });
    setPendingBackup(null);
  };

  return (
    <section
      aria-label="النسخ الاحتياطي والاستعادة"
      className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 space-y-4"
    >
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-slate-900">
            النسخ الاحتياطي والاستعادة (JSON)
          </h2>
          <p className="mt-0.5 text-xs sm:text-sm text-slate-600">
            احفظ نسخة من الأصناف وسجل الحركات على هاتفك أو استعد نسخة سابقة بأمان.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={handleExport}
            className="inline-flex items-center justify-center gap-2 min-h-[48px] px-4 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-800 text-sm font-semibold hover:bg-slate-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-700 whitespace-nowrap"
          >
            <Download className="w-4 h-4 text-blue-700" aria-hidden="true" />
            <span>تصدير نسخة احتياطية</span>
          </button>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center justify-center gap-2 min-h-[48px] px-4 py-2.5 rounded-xl bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-700 whitespace-nowrap"
          >
            <Upload className="w-4 h-4" aria-hidden="true" />
            <span>استيراد نسخة احتياطية</span>
          </button>

          <input
            ref={fileInputRef}
            type="file"
            accept=".json,application/json"
            onChange={handleFileChange}
            className="hidden"
            aria-label="اختيار ملف نسخة احتياطية بصيغة JSON"
          />
        </div>
      </div>

      {statusMessage && (
        <div
          role={statusMessage.type === 'error' ? 'alert' : 'status'}
          className={`rounded-xl border px-4 py-3 flex items-start gap-2.5 text-sm ${
            statusMessage.type === 'error'
              ? 'border-red-200 bg-red-50 text-red-900'
              : 'border-emerald-200 bg-emerald-50 text-emerald-900'
          }`}
        >
          {statusMessage.type === 'error' ? (
            <AlertCircle className="w-5 h-5 text-red-700 shrink-0 mt-0.5" aria-hidden="true" />
          ) : (
            <CheckCircle2
              className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5"
              aria-hidden="true"
            />
          )}
          <span>{statusMessage.text}</span>
        </div>
      )}

      <ConfirmDialog
        open={pendingBackup !== null}
        title="تأكيد استبدال البيانات الحالية"
        message={
          pendingBackup
            ? `تم التحقق من صحة ملف النسخة الاحتياطية بنجاح.\n\nمحتوى الملف: ${pendingBackup.parts.length} صنف و ${pendingBackup.movements.length} حركة.\n\nسيتم استبدال جميع البيانات المحفوظة حاليًا بهذا الملف. هل تريد المتابعة؟`
            : ''
        }
        confirmLabel="تأكيد الاستبدال والاستيراد"
        variant="primary"
        onConfirm={handleConfirmRestore}
        onCancel={() => {
          setPendingBackup(null);
          setStatusMessage({
            type: 'error',
            text: 'تم إلغاء الاستيراد. بقيت بياناتك الحالية كما هي دون تغيير.',
          });
        }}
      />
    </section>
  );
}
