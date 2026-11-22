export type PartStatus = 'available' | 'low' | 'out';

export type MovementType = 'in' | 'out';

export interface SparePart {
  id: string;
  name: string;
  partNumber: string;
  openingBalance: number;
  quantity: number;
  minStock: number;
}

export interface StockMovement {
  id: string;
  partId: string;
  partName: string;
  partNumber: string;
  type: MovementType;
  quantity: number;
  date: string;
  notes: string;
  createdAt: string;
}

export function getPartStatus(part: Pick<SparePart, 'quantity' | 'minStock'>): PartStatus {
  if (part.quantity <= 0) {
    return 'out';
  }
  if (part.quantity <= part.minStock) {
    return 'low';
  }
  return 'available';
}

export const STATUS_LABELS: Record<PartStatus, string> = {
  available: 'متوفر',
  low: 'منخفض المخزون',
  out: 'نافد',
};

export function normalizeArabicSearch(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[أإآ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/[\u064B-\u065F]/g, '');
}

/**
 * البيانات الأولية للمرحلة الأولى — تُحوَّل مرة واحدة فقط عند أول تشغيل في حال عدم وجود بيانات محفوظة مسبقًا.
 */
export const SAMPLE_PARTS: SparePart[] = [
  {
    id: 'demo-1',
    name: 'فلتر زيت محرك تويوتا',
    partNumber: '04152-YZZA1',
    openingBalance: 28,
    quantity: 28,
    minStock: 10,
  },
  {
    id: 'demo-2',
    name: 'فحمات فرامل أمامية سيراميك',
    partNumber: '04465-02220',
    openingBalance: 4,
    quantity: 4,
    minStock: 6,
  },
  {
    id: 'demo-3',
    name: 'بواجي إشعال إيريديوم (طقم 4)',
    partNumber: '90919-01253',
    openingBalance: 0,
    quantity: 0,
    minStock: 5,
  },
  {
    id: 'demo-4',
    name: 'فلتر هواء المقصورة / المكيف',
    partNumber: '87139-0N010',
    openingBalance: 19,
    quantity: 19,
    minStock: 8,
  },
  {
    id: 'demo-5',
    name: 'سير مكينة خارجي (6PK)',
    partNumber: '90916-02599',
    openingBalance: 3,
    quantity: 3,
    minStock: 5,
  },
  {
    id: 'demo-6',
    name: 'طرمبة ماء محرك أصلية',
    partNumber: '16100-39466',
    openingBalance: 0,
    quantity: 0,
    minStock: 3,
  },
  {
    id: 'demo-7',
    name: 'بطارية سيارة 70 أمبير جافة',
    partNumber: 'BAT-70D26L',
    openingBalance: 9,
    quantity: 9,
    minStock: 4,
  },
  {
    id: 'demo-8',
    name: 'مساعد خلفي غاز',
    partNumber: '48530-09Q80',
    openingBalance: 2,
    quantity: 2,
    minStock: 4,
  },
  {
    id: 'demo-9',
    name: 'فلتر بنزين رئيسي',
    partNumber: '23300-21010',
    openingBalance: 14,
    quantity: 14,
    minStock: 6,
  },
  {
    id: 'demo-10',
    name: 'رديتر تبريد ألمنيوم كامل',
    partNumber: '16400-0V110',
    openingBalance: 0,
    quantity: 0,
    minStock: 2,
  },
];
