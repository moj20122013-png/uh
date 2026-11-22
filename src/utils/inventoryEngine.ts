import {
  getPartStatus,
  type SparePart,
  type StockMovement,
} from '../data/sampleParts';

export interface DashboardStats {
  totalItems: number;
  totalQuantity: number;
  lowStockCount: number;
  outOfStockCount: number;
}

export interface PartInput {
  name: string;
  partNumber: string;
  openingBalance: number;
  minStock: number;
}

export interface MovementInput {
  partId: string;
  quantity: number;
  date?: string;
  notes?: string;
}

export interface BackupPayload {
  app: 'auto-spare-parts-inventory';
  version: 1;
  exportedAt: string;
  parts: SparePart[];
  movements: StockMovement[];
}

export function generateId(prefix: string): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function getTodayDateString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function normalizePartNumber(partNumber: string): string {
  return partNumber.trim().toLowerCase();
}

export function normalizeDigits(input: string): string {
  return input
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06f0));
}

export function parseQuantityInput(raw: string | number): number | null {
  if (typeof raw === 'number') {
    return Number.isSafeInteger(raw) ? raw : null;
  }
  const normalized = normalizeDigits(raw).trim();
  if (!normalized || !/^[+-]?\d+$/.test(normalized)) {
    return null;
  }
  const parsed = Number(normalized);
  return Number.isSafeInteger(parsed) ? parsed : null;
}

/**
 * الرصيد الحالي = رصيد البداية + الوارد - المنصرف
 */
export function recalculateParts(
  parts: SparePart[],
  movements: StockMovement[]
): SparePart[] {
  const incomingByPart = new Map<string, number>();
  const outgoingByPart = new Map<string, number>();

  for (const m of movements) {
    if (m.type === 'in') {
      incomingByPart.set(m.partId, (incomingByPart.get(m.partId) ?? 0) + m.quantity);
    } else if (m.type === 'out') {
      outgoingByPart.set(m.partId, (outgoingByPart.get(m.partId) ?? 0) + m.quantity);
    }
  }

  return parts.map((part) => {
    const incoming = incomingByPart.get(part.id) ?? 0;
    const outgoing = outgoingByPart.get(part.id) ?? 0;
    const calculatedQuantity = part.openingBalance + incoming - outgoing;
    return {
      ...part,
      quantity: calculatedQuantity,
    };
  });
}

export function sortMovementsNewestFirst(
  movements: StockMovement[]
): StockMovement[] {
  return [...movements].sort((a, b) => {
    const dateCompare = b.date.localeCompare(a.date);
    if (dateCompare !== 0) return dateCompare;
    return b.createdAt.localeCompare(a.createdAt);
  });
}

export function computeDashboardStats(parts: SparePart[]): DashboardStats {
  let totalQuantity = 0;
  let lowStockCount = 0;
  let outOfStockCount = 0;

  for (const part of parts) {
    totalQuantity += part.quantity;
    const status = getPartStatus(part);
    if (status === 'low') lowStockCount += 1;
    if (status === 'out') outOfStockCount += 1;
  }

  return {
    totalItems: parts.length,
    totalQuantity,
    lowStockCount,
    outOfStockCount,
  };
}

export function addPartItem(
  parts: SparePart[],
  movements: StockMovement[],
  input: PartInput
): { ok: true; parts: SparePart[]; newPart: SparePart } | { ok: false; error: string } {
  const name = input.name.trim();
  const partNumber = input.partNumber.trim();

  if (!name) {
    return { ok: false, error: 'يرجى إدخال اسم القطعة.' };
  }
  if (!partNumber) {
    return { ok: false, error: 'يرجى إدخال رقم القطعة.' };
  }
  if (!Number.isInteger(input.openingBalance) || input.openingBalance < 0) {
    return { ok: false, error: 'رصيد البداية يجب أن يكون رقمًا صحيحًا يساوي صفرًا أو أكثر.' };
  }
  if (!Number.isInteger(input.minStock) || input.minStock < 0) {
    return { ok: false, error: 'الحد الأدنى يجب أن يكون رقمًا صحيحًا يساوي صفرًا أو أكثر.' };
  }

  const normalizedNewNumber = normalizePartNumber(partNumber);
  const duplicate = parts.some(
    (p) => normalizePartNumber(p.partNumber) === normalizedNewNumber
  );
  if (duplicate) {
    return {
      ok: false,
      error: `رقم القطعة "${partNumber}" موجود بالفعل لصنف آخر ولا يمكن تكراره.`,
    };
  }

  const newPart: SparePart = {
    id: generateId('part'),
    name,
    partNumber,
    openingBalance: input.openingBalance,
    quantity: input.openingBalance,
    minStock: input.minStock,
  };

  const nextParts = recalculateParts([newPart, ...parts], movements);
  const created = nextParts.find((p) => p.id === newPart.id) ?? newPart;
  return { ok: true, parts: nextParts, newPart: created };
}

export function updatePartItem(
  parts: SparePart[],
  movements: StockMovement[],
  partId: string,
  input: PartInput
): { ok: true; parts: SparePart[]; updatedPart: SparePart } | { ok: false; error: string } {
  const existing = parts.find((p) => p.id === partId);
  if (!existing) {
    return { ok: false, error: 'لم يتم العثور على الصنف المطلوب تعديله.' };
  }

  const name = input.name.trim();
  const partNumber = input.partNumber.trim();

  if (!name) {
    return { ok: false, error: 'يرجى إدخال اسم القطعة.' };
  }
  if (!partNumber) {
    return { ok: false, error: 'يرجى إدخال رقم القطعة.' };
  }
  if (!Number.isInteger(input.openingBalance) || input.openingBalance < 0) {
    return { ok: false, error: 'رصيد البداية يجب أن يكون رقمًا صحيحًا يساوي صفرًا أو أكثر.' };
  }
  if (!Number.isInteger(input.minStock) || input.minStock < 0) {
    return { ok: false, error: 'الحد الأدنى يجب أن يكون رقمًا صحيحًا يساوي صفرًا أو أكثر.' };
  }

  const normalizedNumber = normalizePartNumber(partNumber);
  const duplicate = parts.some(
    (p) => p.id !== partId && normalizePartNumber(p.partNumber) === normalizedNumber
  );
  if (duplicate) {
    return {
      ok: false,
      error: `رقم القطعة "${partNumber}" مستخدم بالفعل لصنف آخر.`,
    };
  }

  // Verify the new openingBalance does not produce a negative current balance
  let totalIn = 0;
  let totalOut = 0;
  for (const m of movements) {
    if (m.partId === partId) {
      if (m.type === 'in') totalIn += m.quantity;
      if (m.type === 'out') totalOut += m.quantity;
    }
  }
  const projectedBalance = input.openingBalance + totalIn - totalOut;
  if (projectedBalance < 0) {
    const minAllowedOpening = Math.max(0, totalOut - totalIn);
    return {
      ok: false,
      error: `لا يمكن خفض رصيد البداية لهذا الرقم لأن حركات المنصرف المسجلة تتطلّب رصيد بداية لا يقل عن ${minAllowedOpening} حتى لا يصبح الرصيد سالبًا.`,
    };
  }

  const updatedRaw = parts.map((p) =>
    p.id === partId
      ? {
          ...p,
          name,
          partNumber,
          openingBalance: input.openingBalance,
          minStock: input.minStock,
        }
      : p
  );

  const nextParts = recalculateParts(updatedRaw, movements);
  const updatedPart = nextParts.find((p) => p.id === partId)!;
  return { ok: true, parts: nextParts, updatedPart };
}

export function deletePartItem(
  parts: SparePart[],
  partId: string
): { parts: SparePart[]; deletedPart: SparePart | undefined } {
  const deletedPart = parts.find((p) => p.id === partId);
  return {
    parts: parts.filter((p) => p.id !== partId),
    deletedPart,
  };
}

export function recordIncomingMovement(
  parts: SparePart[],
  movements: StockMovement[],
  input: MovementInput
):
  | {
      ok: true;
      parts: SparePart[];
      movements: StockMovement[];
      updatedPart: SparePart;
      movement: StockMovement;
    }
  | { ok: false; error: string } {
  const part = parts.find((p) => p.id === input.partId);
  if (!part) {
    return { ok: false, error: 'يرجى اختيار الصنف أولًا.' };
  }
  if (!Number.isInteger(input.quantity) || input.quantity <= 0) {
    return { ok: false, error: 'الكمية المستلمة يجب أن تكون رقمًا صحيحًا أكبر من صفر.' };
  }

  const date = input.date?.trim() || getTodayDateString();
  const movement: StockMovement = {
    id: generateId('mov'),
    partId: part.id,
    partName: part.name,
    partNumber: part.partNumber,
    type: 'in',
    quantity: input.quantity,
    date,
    notes: input.notes?.trim() ?? '',
    createdAt: new Date().toISOString(),
  };

  const nextMovements = sortMovementsNewestFirst([movement, ...movements]);
  const nextParts = recalculateParts(parts, nextMovements);
  const updatedPart = nextParts.find((p) => p.id === part.id)!;

  return {
    ok: true,
    parts: nextParts,
    movements: nextMovements,
    updatedPart,
    movement,
  };
}

export function recordOutgoingMovement(
  parts: SparePart[],
  movements: StockMovement[],
  input: MovementInput
):
  | {
      ok: true;
      parts: SparePart[];
      movements: StockMovement[];
      updatedPart: SparePart;
      movement: StockMovement;
    }
  | { ok: false; error: string } {
  const part = parts.find((p) => p.id === input.partId);
  if (!part) {
    return { ok: false, error: 'يرجى اختيار الصنف أولًا.' };
  }
  if (!Number.isInteger(input.quantity) || input.quantity <= 0) {
    return { ok: false, error: 'الكمية المصروفة يجب أن تكون رقمًا صحيحًا أكبر من صفر.' };
  }
  if (part.quantity <= 0) {
    return {
      ok: false,
      error: `الصنف "${part.name}" نافد حاليًا (الرصيد 0)، ولا يمكن صرف أي كمية منه.`,
    };
  }
  if (input.quantity > part.quantity) {
    return {
      ok: false,
      error: `الكمية المطلوبة (${input.quantity}) أكبر من الرصيد المتوفر حاليًا (${part.quantity}). تم منع العملية لعدم السماح برصيد سالب.`,
    };
  }

  const date = input.date?.trim() || getTodayDateString();
  const movement: StockMovement = {
    id: generateId('mov'),
    partId: part.id,
    partName: part.name,
    partNumber: part.partNumber,
    type: 'out',
    quantity: input.quantity,
    date,
    notes: input.notes?.trim() ?? '',
    createdAt: new Date().toISOString(),
  };

  const nextMovements = sortMovementsNewestFirst([movement, ...movements]);
  const nextParts = recalculateParts(parts, nextMovements);
  const updatedPart = nextParts.find((p) => p.id === part.id)!;

  return {
    ok: true,
    parts: nextParts,
    movements: nextMovements,
    updatedPart,
    movement,
  };
}

export function createBackupPayload(
  parts: SparePart[],
  movements: StockMovement[]
): BackupPayload {
  return {
    app: 'auto-spare-parts-inventory',
    version: 1,
    exportedAt: new Date().toISOString(),
    parts: recalculateParts(parts, movements),
    movements: sortMovementsNewestFirst(movements),
  };
}

export function validateAndParseBackup(rawJson: string):
  | {
      ok: true;
      data: {
        parts: SparePart[];
        movements: StockMovement[];
        exportedAt?: string;
      };
    }
  | { ok: false; error: string } {
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawJson);
  } catch {
    return {
      ok: false,
      error: 'ملف النسخة الاحتياطية غير صالح (صيغة JSON غير صحيحة). لم يتم تعديل البيانات الحالية.',
    };
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return {
      ok: false,
      error: 'بنية ملف النسخة الاحتياطية غير صحيحة. يجب أن يحتوي الملف على كائن بيانات متوافق.',
    };
  }

  const record = parsed as Record<string, unknown>;
  if (!Array.isArray(record.parts)) {
    return {
      ok: false,
      error: 'الملف لا يحتوي على قائمة الأصناف (parts) بشكل صحيح.',
    };
  }
  if (record.movements !== undefined && !Array.isArray(record.movements)) {
    return {
      ok: false,
      error: 'قائمة الحركات (movements) داخل الملف غير صالحة.',
    };
  }

  const seenNumbers = new Set<string>();
  const seenPartIds = new Set<string>();
  const validatedParts: SparePart[] = [];

  for (let i = 0; i < record.parts.length; i += 1) {
    const item = record.parts[i];
    if (!item || typeof item !== 'object') {
      return {
        ok: false,
        error: `بيانات الصنف رقم ${i + 1} داخل الملف غير صالحة.`,
      };
    }
    const p = item as Record<string, unknown>;
    const id = typeof p.id === 'string' && p.id.trim() ? p.id.trim() : generateId('part');
    const name = typeof p.name === 'string' ? p.name.trim() : '';
    const partNumber = typeof p.partNumber === 'string' ? p.partNumber.trim() : '';
    const minStock = Number(p.minStock);
    const openingRaw =
      p.openingBalance !== undefined ? Number(p.openingBalance) : Number(p.quantity);

    if (!name || !partNumber) {
      return {
        ok: false,
        error: `الصنف رقم ${i + 1} يفتقد اسم القطعة أو رقم القطعة.`,
      };
    }
    if (!Number.isInteger(minStock) || minStock < 0) {
      return {
        ok: false,
        error: `الحد الأدنى للصنف "${name}" غير صالح.`,
      };
    }
    if (!Number.isInteger(openingRaw) || openingRaw < 0) {
      return {
        ok: false,
        error: `رصيد البداية للصنف "${name}" غير صالح.`,
      };
    }

    const normNum = normalizePartNumber(partNumber);
    if (seenNumbers.has(normNum)) {
      return {
        ok: false,
        error: `يوجد رقم قطعة مكرر في الملف (${partNumber}). تم إلغاء الاستيراد.`,
      };
    }
    if (seenPartIds.has(id)) {
      return {
        ok: false,
        error: `يوجد معرف صنف مكرر في الملف (${id}). تم إلغاء الاستيراد.`,
      };
    }

    seenNumbers.add(normNum);
    seenPartIds.add(id);

    validatedParts.push({
      id,
      name,
      partNumber,
      openingBalance: openingRaw,
      quantity: openingRaw,
      minStock,
    });
  }

  const rawMovements = Array.isArray(record.movements) ? record.movements : [];
  const validatedMovements: StockMovement[] = [];

  for (let i = 0; i < rawMovements.length; i += 1) {
    const item = rawMovements[i];
    if (!item || typeof item !== 'object') {
      return {
        ok: false,
        error: `سجل الحركة رقم ${i + 1} داخل الملف غير صالح.`,
      };
    }
    const m = item as Record<string, unknown>;
    const type = m.type;
    const quantity = Number(m.quantity);
    const partId = typeof m.partId === 'string' ? m.partId.trim() : '';
    const partName = typeof m.partName === 'string' ? m.partName.trim() : '';
    const partNumber = typeof m.partNumber === 'string' ? m.partNumber.trim() : '';
    const date = typeof m.date === 'string' && m.date.trim() ? m.date.trim() : getTodayDateString();
    const notes = typeof m.notes === 'string' ? m.notes : '';
    const createdAt =
      typeof m.createdAt === 'string' && m.createdAt.trim()
        ? m.createdAt
        : new Date().toISOString();
    const id = typeof m.id === 'string' && m.id.trim() ? m.id.trim() : generateId('mov');

    if (type !== 'in' && type !== 'out') {
      return {
        ok: false,
        error: `نوع الحركة رقم ${i + 1} غير صالح (يجب أن يكون وارد أو منصرف).`,
      };
    }
    if (!partId || !partName || !partNumber) {
      return {
        ok: false,
        error: `الحركة رقم ${i + 1} تفتقد بيانات القطعة المرتبطة بها.`,
      };
    }
    if (!Number.isInteger(quantity) || quantity <= 0) {
      return {
        ok: false,
        error: `كمية الحركة رقم ${i + 1} يجب أن تكون رقمًا صحيحًا أكبر من صفر.`,
      };
    }

    validatedMovements.push({
      id,
      partId,
      partName,
      partNumber,
      type,
      quantity,
      date,
      notes,
      createdAt,
    });
  }

  const recalculatedParts = recalculateParts(validatedParts, validatedMovements);
  const negativePart = recalculatedParts.find((p) => p.quantity < 0);
  if (negativePart) {
    return {
      ok: false,
      error: `الحركات في الملف تؤدي إلى رصيد سالب للصنف "${negativePart.name}". تم إلغاء الاستيراد.`,
    };
  }

  return {
    ok: true,
    data: {
      parts: recalculatedParts,
      movements: sortMovementsNewestFirst(validatedMovements),
      exportedAt: typeof record.exportedAt === 'string' ? record.exportedAt : undefined,
    },
  };
}
