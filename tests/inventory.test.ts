import assert from 'node:assert/strict';
import test from 'node:test';
import {
  getPartStatus,
  normalizeArabicSearch,
  type SparePart,
  type StockMovement,
} from '../src/data/sampleParts';
import {
  addPartItem,
  computeDashboardStats,
  createBackupPayload,
  deletePartItem,
  normalizeDigits,
  parseQuantityInput,
  recordIncomingMovement,
  recordOutgoingMovement,
  sortMovementsNewestFirst,
  updatePartItem,
  validateAndParseBackup,
} from '../src/utils/inventoryEngine';
import {
  loadInventoryState,
  saveInventoryState,
  STORAGE_KEY,
} from '../src/utils/storage';

function createMemoryStorage(initial: Record<string, string> = {}): Storage {
  const store = new Map<string, string>(Object.entries(initial));
  return {
    get length() {
      return store.size;
    },
    clear() {
      store.clear();
    },
    getItem(key: string) {
      return store.has(key) ? store.get(key)! : null;
    },
    key(index: number) {
      return Array.from(store.keys())[index] ?? null;
    },
    removeItem(key: string) {
      store.delete(key);
    },
    setItem(key: string, value: string) {
      store.set(key, value);
    },
  };
}

test('1. إدارة الأصناف: إضافة وتعديل وحذف ومنع تكرار رقم القطعة والبحث', () => {
  let parts: SparePart[] = [];
  const movements: StockMovement[] = [];

  const addRes = addPartItem(parts, movements, {
    name: 'فلتر هواء محرك',
    partNumber: 'AF-100',
    openingBalance: 10,
    minStock: 4,
  });
  assert.equal(addRes.ok, true);
  if (!addRes.ok) return;
  parts = addRes.parts;
  assert.equal(parts.length, 1);
  assert.equal(parts[0].quantity, 10);

  // Duplicate part number (different case & spaces) must fail
  const dupRes = addPartItem(parts, movements, {
    name: 'فلتر آخر',
    partNumber: ' af-100 ',
    openingBalance: 5,
    minStock: 2,
  });
  assert.equal(dupRes.ok, false);

  // Add second part
  const addRes2 = addPartItem(parts, movements, {
    name: 'فحمات فرامل خلفية',
    partNumber: 'BP-200',
    openingBalance: 3,
    minStock: 5,
  });
  assert.equal(addRes2.ok, true);
  if (!addRes2.ok) return;
  parts = addRes2.parts;

  // Edit second part: cannot collide with AF-100
  const badEdit = updatePartItem(parts, movements, parts[0].id, {
    name: 'فحمات فرامل خلفية',
    partNumber: 'AF-100',
    openingBalance: 3,
    minStock: 5,
  });
  assert.equal(badEdit.ok, false);

  // Valid edit
  const goodEdit = updatePartItem(parts, movements, parts[0].id, {
    name: 'فحمات فرامل خلفية محدثة',
    partNumber: 'BP-201',
    openingBalance: 8,
    minStock: 5,
  });
  assert.equal(goodEdit.ok, true);
  if (!goodEdit.ok) return;
  parts = goodEdit.parts;
  assert.equal(parts[0].name, 'فحمات فرامل خلفية محدثة');
  assert.equal(parts[0].quantity, 8);

  // Search normalization
  assert.equal(
    normalizeArabicSearch('أقمشة فرامل أمامية').includes(
      normalizeArabicSearch('اقمشه')
    ),
    true
  );

  // Delete part
  const { parts: afterDelete } = deletePartItem(parts, parts[0].id);
  assert.equal(afterDelete.length, 1);
  assert.equal(afterDelete[0].partNumber, 'AF-100');
});

test('2 & 3 & 4 & 5 & 6 & 7: الوارد والمنصرف والرصيد والتنبيهات وسجل الحركات ولوحة التحكم', () => {
  let parts: SparePart[] = [];
  let movements: StockMovement[] = [];

  const added = addPartItem(parts, movements, {
    name: 'بواجي إشعال',
    partNumber: 'SP-909',
    openingBalance: 2,
    minStock: 3,
  });
  assert.equal(added.ok, true);
  if (!added.ok) return;
  parts = added.parts;
  const partId = parts[0].id;

  // Initially low stock (2 <= 3)
  assert.equal(getPartStatus(parts[0]), 'low');

  // Incoming +5 -> balance = 2 + 5 = 7 -> available (> 3)
  const inRes = recordIncomingMovement(parts, movements, {
    partId,
    quantity: 5,
    date: '2026-11-10',
    notes: 'مؤسسة الخليج',
  });
  assert.equal(inRes.ok, true);
  if (!inRes.ok) return;
  parts = inRes.parts;
  movements = inRes.movements;
  assert.equal(parts[0].quantity, 7);
  assert.equal(getPartStatus(parts[0]), 'available');

  // Outgoing 8 > 7 -> must fail and leave state unchanged
  const badOut = recordOutgoingMovement(parts, movements, {
    partId,
    quantity: 8,
    date: '2026-11-11',
    notes: 'بيع',
  });
  assert.equal(badOut.ok, false);
  assert.equal(parts[0].quantity, 7);
  assert.equal(movements.length, 1);

  // Outgoing 4 -> balance = 2 + 5 - 4 = 3 -> low stock (3 <= 3)
  const outRes1 = recordOutgoingMovement(parts, movements, {
    partId,
    quantity: 4,
    date: '2026-11-12',
    notes: 'بيع نقدي',
  });
  assert.equal(outRes1.ok, true);
  if (!outRes1.ok) return;
  parts = outRes1.parts;
  movements = outRes1.movements;
  assert.equal(parts[0].quantity, 3);
  assert.equal(getPartStatus(parts[0]), 'low');

  // Outgoing 3 -> balance = 0 -> out of stock
  const outRes2 = recordOutgoingMovement(parts, movements, {
    partId,
    quantity: 3,
    date: '2026-11-13',
  });
  assert.equal(outRes2.ok, true);
  if (!outRes2.ok) return;
  parts = outRes2.parts;
  movements = outRes2.movements;
  assert.equal(parts[0].quantity, 0);
  assert.equal(getPartStatus(parts[0]), 'out');

  // Cannot reduce openingBalance below 0 or make balance negative
  const invalidOpeningEdit = updatePartItem(parts, movements, partId, {
    name: 'بواجي إشعال',
    partNumber: 'SP-909',
    openingBalance: 1, // 1 + 5 - 7 = -1 < 0
    minStock: 3,
  });
  assert.equal(invalidOpeningEdit.ok, false);

  // Movements sorted newest to oldest
  const sorted = sortMovementsNewestFirst(movements);
  assert.equal(sorted[0].date, '2026-11-13');
  assert.equal(sorted[1].date, '2026-11-12');
  assert.equal(sorted[2].date, '2026-11-10');

  // Dashboard stats
  const stats = computeDashboardStats(parts);
  assert.deepEqual(stats, {
    totalItems: 1,
    totalQuantity: 0,
    lowStockCount: 0,
    outOfStockCount: 1,
  });
});

test('8: النسخ الاحتياطي والاستعادة والتحقق من صحة الملف', () => {
  const parts: SparePart[] = [
    {
      id: 'p1',
      name: 'طرمبة بنزين',
      partNumber: 'FP-11',
      openingBalance: 5,
      quantity: 5,
      minStock: 2,
    },
  ];
  const inRes = recordIncomingMovement(parts, [], {
    partId: 'p1',
    quantity: 3,
    date: '2026-11-13',
    notes: 'المورد الأول',
  });
  assert.equal(inRes.ok, true);
  if (!inRes.ok) return;

  const backup = createBackupPayload(inRes.parts, inRes.movements);
  const rawJson = JSON.stringify(backup);

  // Valid parse
  const parsed = validateAndParseBackup(rawJson);
  assert.equal(parsed.ok, true);
  if (!parsed.ok) return;
  assert.equal(parsed.data.parts[0].quantity, 8);
  assert.equal(parsed.data.movements.length, 1);

  // Invalid JSON
  assert.equal(validateAndParseBackup('{broken-json').ok, false);

  // Missing parts array
  assert.equal(validateAndParseBackup('{"movements":[]}').ok, false);

  // Duplicate partNumber in backup
  const dupBackup = JSON.stringify({
    parts: [
      { id: '1', name: 'A', partNumber: 'X1', openingBalance: 1, minStock: 0 },
      { id: '2', name: 'B', partNumber: 'x1', openingBalance: 2, minStock: 0 },
    ],
    movements: [],
  });
  assert.equal(validateAndParseBackup(dupBackup).ok, false);

  // Movements causing negative balance in backup must be rejected
  const negBackup = JSON.stringify({
    parts: [{ id: '1', name: 'A', partNumber: 'X1', openingBalance: 1, minStock: 0 }],
    movements: [
      {
        id: 'm1',
        partId: '1',
        partName: 'A',
        partNumber: 'X1',
        type: 'out',
        quantity: 5,
        date: '2026-11-13',
      },
    ],
  });
  assert.equal(validateAndParseBackup(negBackup).ok, false);
});

test('9: حفظ Local Storage وترحيل البيانات وعدم إعادة البيانات التجريبية بعد البدء', () => {
  // 1. Fresh load converts initial items once and stores them
  const storage = createMemoryStorage();
  const firstLoad = loadInventoryState(storage);
  assert.equal(firstLoad.state.parts.length, 10);
  assert.ok(storage.getItem(STORAGE_KEY));

  // 2. If user deletes all items and saves, reload must stay empty (NO demo data fallback!)
  saveInventoryState([], [], storage);
  const secondLoad = loadInventoryState(storage);
  assert.equal(secondLoad.state.parts.length, 0);
  assert.equal(secondLoad.state.movements.length, 0);

  // 3. Legacy key migration preserves existing items without openingBalance field
  const legacyStorage = createMemoryStorage({
    parts: JSON.stringify([
      { id: 'old-1', name: 'فلتر قديم', partNumber: 'OLD-1', quantity: 12, minStock: 3, isDemo: true },
    ]),
  });
  const migrated = loadInventoryState(legacyStorage);
  assert.equal(migrated.migratedFromInitial, true);
  assert.equal(migrated.state.parts.length, 1);
  assert.equal(migrated.state.parts[0].openingBalance, 12);
  assert.equal(migrated.state.parts[0].quantity, 12);
});

test('10: دعم الأرقام العربية والإنجليزية واختبار الوارد والمنصرف بكمية 1', () => {
  // Arabic-Indic & Persian & English digit normalization
  assert.equal(normalizeDigits('١٢٣'), '123');
  assert.equal(normalizeDigits('۱۲۳'), '123');
  assert.equal(parseQuantityInput('1'), 1);
  assert.equal(parseQuantityInput(' 1 '), 1);
  assert.equal(parseQuantityInput('١'), 1);
  assert.equal(parseQuantityInput('۱'), 1);
  assert.equal(parseQuantityInput('١٥'), 15);

  // Zero, negative, decimal, empty, or non-numeric rejected cleanly
  assert.equal(parseQuantityInput('0'), 0);
  assert.equal(parseQuantityInput('٠'), 0);
  assert.equal(parseQuantityInput('-1'), -1);
  assert.equal(parseQuantityInput('-١'), -1);
  assert.equal(parseQuantityInput('1.5'), null);
  assert.equal(parseQuantityInput(''), null);
  assert.equal(parseQuantityInput('abc'), null);

  // Incoming & outgoing by quantity = 1 (parsed from Arabic '١' and English '1')
  let parts: SparePart[] = [
    {
      id: 'part-1',
      name: 'فلتر زيت',
      partNumber: 'OF-001',
      openingBalance: 1,
      quantity: 1,
      minStock: 1,
    },
  ];
  let movements: StockMovement[] = [];

  const qtyIn = parseQuantityInput('١');
  assert.equal(qtyIn, 1);
  const inResult = recordIncomingMovement(parts, movements, {
    partId: 'part-1',
    quantity: qtyIn!,
    date: '2026-11-20',
    notes: 'توريد تجريبي',
  });
  assert.equal(inResult.ok, true);
  if (!inResult.ok) return;
  parts = inResult.parts;
  movements = inResult.movements;
  assert.equal(parts[0].quantity, 2);
  assert.equal(movements.length, 1);
  assert.equal(movements[0].type, 'in');
  assert.equal(movements[0].quantity, 1);

  const qtyOut = parseQuantityInput('1');
  assert.equal(qtyOut, 1);
  const outResult = recordOutgoingMovement(parts, movements, {
    partId: 'part-1',
    quantity: qtyOut!,
    date: '2026-11-20',
    notes: 'صرف تجريبي',
  });
  assert.equal(outResult.ok, true);
  if (!outResult.ok) return;
  parts = outResult.parts;
  movements = outResult.movements;
  assert.equal(parts[0].quantity, 1);
  assert.equal(movements.length, 2);
  assert.equal(movements[0].type, 'out');
  assert.equal(movements[0].quantity, 1);

  // Outgoing 1 again -> balance reaches 0
  const outResult2 = recordOutgoingMovement(parts, movements, {
    partId: 'part-1',
    quantity: 1,
    date: '2026-11-20',
  });
  assert.equal(outResult2.ok, true);
  if (!outResult2.ok) return;
  parts = outResult2.parts;
  movements = outResult2.movements;
  assert.equal(parts[0].quantity, 0);
  assert.equal(movements.length, 3);

  // Outgoing 1 when balance is 0 -> must be rejected
  const blockedOut = recordOutgoingMovement(parts, movements, {
    partId: 'part-1',
    quantity: 1,
    date: '2026-11-20',
  });
  assert.equal(blockedOut.ok, false);
  assert.equal(parts[0].quantity, 0);
  assert.equal(movements.length, 3);
});

