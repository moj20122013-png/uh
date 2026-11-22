import {
  SAMPLE_PARTS,
  type SparePart,
  type StockMovement,
} from '../data/sampleParts';
import {
  generateId,
  getTodayDateString,
  recalculateParts,
  sortMovementsNewestFirst,
} from './inventoryEngine';

export const STORAGE_KEY = 'auto_parts_inventory_v1';

const LEGACY_STORAGE_KEYS = [
  'parts',
  'spare_parts',
  'inventory_parts',
  'auto_parts_data',
  'inventory_v1',
];

export interface PersistedInventoryState {
  version: 1;
  parts: SparePart[];
  movements: StockMovement[];
  updatedAt: string;
}

function normalizeLegacyPart(raw: unknown): SparePart | null {
  if (!raw || typeof raw !== 'object') return null;
  const obj = raw as Record<string, unknown>;
  const name = typeof obj.name === 'string' ? obj.name.trim() : '';
  const partNumber = typeof obj.partNumber === 'string' ? obj.partNumber.trim() : '';
  if (!name || !partNumber) return null;

  const id = typeof obj.id === 'string' && obj.id.trim() ? obj.id.trim() : generateId('part');
  const minStockRaw = Number(obj.minStock);
  const minStock = Number.isFinite(minStockRaw) && minStockRaw >= 0 ? Math.trunc(minStockRaw) : 0;

  const openingRaw =
    obj.openingBalance !== undefined ? Number(obj.openingBalance) : Number(obj.quantity);
  const openingBalance =
    Number.isFinite(openingRaw) && openingRaw >= 0 ? Math.trunc(openingRaw) : 0;

  return {
    id,
    name,
    partNumber,
    openingBalance,
    quantity: openingBalance,
    minStock,
  };
}

function normalizeLegacyMovement(raw: unknown): StockMovement | null {
  if (!raw || typeof raw !== 'object') return null;
  const obj = raw as Record<string, unknown>;
  const type = obj.type === 'in' || obj.type === 'out' ? obj.type : null;
  const partId = typeof obj.partId === 'string' ? obj.partId.trim() : '';
  const partName = typeof obj.partName === 'string' ? obj.partName.trim() : '';
  const partNumber = typeof obj.partNumber === 'string' ? obj.partNumber.trim() : '';
  const qtyRaw = Number(obj.quantity);

  if (!type || !partId || !partName || !partNumber || !Number.isFinite(qtyRaw) || qtyRaw <= 0) {
    return null;
  }

  return {
    id: typeof obj.id === 'string' && obj.id.trim() ? obj.id.trim() : generateId('mov'),
    partId,
    partName,
    partNumber,
    type,
    quantity: Math.trunc(qtyRaw),
    date:
      typeof obj.date === 'string' && obj.date.trim()
        ? obj.date.trim()
        : getTodayDateString(),
    notes: typeof obj.notes === 'string' ? obj.notes : '',
    createdAt:
      typeof obj.createdAt === 'string' && obj.createdAt.trim()
        ? obj.createdAt
        : new Date().toISOString(),
  };
}

function tryMigrateLegacyKeys(storage: Storage): PersistedInventoryState | null {
  for (const key of LEGACY_STORAGE_KEYS) {
    const raw = storage.getItem(key);
    if (!raw) continue;
    try {
      const parsed = JSON.parse(raw) as unknown;
      let rawParts: unknown[] = [];
      let rawMovements: unknown[] = [];

      if (Array.isArray(parsed)) {
        rawParts = parsed;
      } else if (parsed && typeof parsed === 'object') {
        const obj = parsed as Record<string, unknown>;
        if (Array.isArray(obj.parts)) rawParts = obj.parts;
        if (Array.isArray(obj.movements)) rawMovements = obj.movements;
      }

      const parts = rawParts
        .map(normalizeLegacyPart)
        .filter((p): p is SparePart => p !== null);
      const movements = sortMovementsNewestFirst(
        rawMovements
          .map(normalizeLegacyMovement)
          .filter((m): m is StockMovement => m !== null)
      );

      if (parts.length > 0 || movements.length > 0) {
        return {
          version: 1,
          parts: recalculateParts(parts, movements),
          movements,
          updatedAt: new Date().toISOString(),
        };
      }
    } catch {
      // Ignore malformed legacy key and continue checking
    }
  }
  return null;
}

export function loadInventoryState(
  storage: Storage = window.localStorage
): { state: PersistedInventoryState; migratedFromInitial: boolean; error?: string } {
  try {
    const existingRaw = storage.getItem(STORAGE_KEY);
    if (existingRaw !== null) {
      const parsed = JSON.parse(existingRaw) as Record<string, unknown>;
      const rawParts = Array.isArray(parsed.parts) ? parsed.parts : [];
      const rawMovements = Array.isArray(parsed.movements) ? parsed.movements : [];

      const parts = rawParts
        .map(normalizeLegacyPart)
        .filter((p): p is SparePart => p !== null);
      const movements = sortMovementsNewestFirst(
        rawMovements
          .map(normalizeLegacyMovement)
          .filter((m): m is StockMovement => m !== null)
      );

      const normalizedState: PersistedInventoryState = {
        version: 1,
        parts: recalculateParts(parts, movements),
        movements,
        updatedAt:
          typeof parsed.updatedAt === 'string'
            ? parsed.updatedAt
            : new Date().toISOString(),
      };

      return { state: normalizedState, migratedFromInitial: false };
    }

    // Check legacy keys if upgrading from an older localStorage schema
    const migratedLegacy = tryMigrateLegacyKeys(storage);
    if (migratedLegacy) {
      saveInventoryState(migratedLegacy.parts, migratedLegacy.movements, storage);
      return { state: migratedLegacy, migratedFromInitial: true };
    }

    // First run only: convert existing Phase 1 data into persistent storage format once
    const initialParts = SAMPLE_PARTS.map((item) => ({
      id: item.id,
      name: item.name,
      partNumber: item.partNumber,
      openingBalance: item.openingBalance,
      quantity: item.quantity,
      minStock: item.minStock,
    }));

    const initialState: PersistedInventoryState = {
      version: 1,
      parts: initialParts,
      movements: [],
      updatedAt: new Date().toISOString(),
    };
    saveInventoryState(initialState.parts, initialState.movements, storage);
    return { state: initialState, migratedFromInitial: true };
  } catch {
    return {
      state: {
        version: 1,
        parts: [],
        movements: [],
        updatedAt: new Date().toISOString(),
      },
      migratedFromInitial: false,
      error: 'تعذر قراءة البيانات المحفوظة من ذاكرة المتصفح.',
    };
  }
}

export function saveInventoryState(
  parts: SparePart[],
  movements: StockMovement[],
  storage: Storage = window.localStorage
): { ok: true } | { ok: false; error: string } {
  try {
    const payload: PersistedInventoryState = {
      version: 1,
      parts: recalculateParts(parts, movements),
      movements: sortMovementsNewestFirst(movements),
      updatedAt: new Date().toISOString(),
    };
    storage.setItem(STORAGE_KEY, JSON.stringify(payload));
    return { ok: true };
  } catch {
    return {
      ok: false,
      error: 'تعذر حفظ التغييرات في ذاكرة الهاتف (Local Storage).',
    };
  }
}
