import { addDays, setDate, startOfDay, startOfMonth, subDays, subMonths } from 'date-fns';

import type { Source, Transaction, WorthIt } from '@/types';

interface MerchantTemplate {
  merchant: string;
  upiId?: string;
  categoryId: string;
  /** Rupees */
  min: number;
  max: number;
  sources: Source[];
  weight: number;
  notes?: string[];
}

const MERCHANTS: MerchantTemplate[] = [
  { merchant: 'Zomato', upiId: 'zomato@hdfcbank', categoryId: 'food', min: 180, max: 650, sources: ['gpay', 'phonepe', 'slice_card'], weight: 9, notes: ['Dinner', 'Late night biryani', 'Lunch at office'] },
  { merchant: 'Swiggy', upiId: 'swiggy@icici', categoryId: 'food', min: 150, max: 550, sources: ['gpay', 'paytm', 'slice_card'], weight: 8, notes: ['Breakfast', 'Team lunch share'] },
  { merchant: 'Chai Point', upiId: 'chaipoint@ybl', categoryId: 'food', min: 40, max: 140, sources: ['phonepe', 'bhim', 'paytm'], weight: 6 },
  { merchant: 'Haldiram\'s', upiId: 'haldirams.store@axisbank', categoryId: 'food', min: 120, max: 480, sources: ['gpay', 'phonepe'], weight: 3 },
  { merchant: 'Blinkit', upiId: 'blinkit@hdfcbank', categoryId: 'groceries', min: 220, max: 1400, sources: ['gpay', 'slice_card', 'phonepe'], weight: 6, notes: ['Weekly groceries', 'Milk and bread'] },
  { merchant: 'Zepto', upiId: 'zepto@ybl', categoryId: 'groceries', min: 180, max: 950, sources: ['phonepe', 'paytm'], weight: 4 },
  { merchant: 'Reliance Fresh', upiId: 'reliancefresh@sbi', categoryId: 'groceries', min: 300, max: 1600, sources: ['bhim', 'slice_account', 'canara'], weight: 3 },
  { merchant: 'Uber', upiId: 'uber@axisbank', categoryId: 'travel', min: 120, max: 560, sources: ['gpay', 'paytm', 'slice_card'], weight: 6, notes: ['Office commute', 'Airport drop'] },
  { merchant: 'Ola', upiId: 'olacabs@ybl', categoryId: 'travel', min: 90, max: 420, sources: ['phonepe', 'paytm'], weight: 4 },
  { merchant: 'Rapido', upiId: 'rapido@icici', categoryId: 'travel', min: 45, max: 180, sources: ['gpay', 'bhim'], weight: 4 },
  { merchant: 'Indian Oil Petrol Pump', upiId: 'iocl.pump214@sbi', categoryId: 'travel', min: 300, max: 900, sources: ['bhim', 'canara', 'slice_card'], weight: 2, notes: ['Bike petrol'] },
  { merchant: 'Amazon', upiId: 'amazon@apl', categoryId: 'shopping', min: 299, max: 2499, sources: ['slice_card', 'gpay', 'paytm'], weight: 4, notes: ['Phone cover', 'Desk lamp', 'Books'] },
  { merchant: 'Myntra', upiId: 'myntra@icici', categoryId: 'shopping', min: 499, max: 2899, sources: ['slice_card', 'phonepe'], weight: 2, notes: ['New shirt'] },
  { merchant: 'Decathlon', upiId: 'decathlon@hdfcbank', categoryId: 'shopping', min: 399, max: 2499, sources: ['slice_card', 'gpay'], weight: 1 },
  { merchant: 'Apollo Pharmacy', upiId: 'apollopharmacy@axisbank', categoryId: 'health', min: 90, max: 900, sources: ['gpay', 'phonepe', 'bhim'], weight: 2, notes: ['Medicines'] },
  { merchant: 'Cult.fit', upiId: 'cultfit@icici', categoryId: 'health', min: 999, max: 1999, sources: ['slice_card'], weight: 1 },
  { merchant: 'PVR INOX', upiId: 'pvrinox@hdfcbank', categoryId: 'entertainment', min: 250, max: 900, sources: ['paytm', 'slice_card', 'gpay'], weight: 2, notes: ['Movie with friends'] },
  { merchant: 'BookMyShow', upiId: 'bookmyshow@icici', categoryId: 'entertainment', min: 300, max: 1500, sources: ['paytm', 'gpay'], weight: 1 },
  { merchant: 'Udemy', upiId: 'udemy@razorpay', categoryId: 'education', min: 449, max: 799, sources: ['slice_card', 'gpay'], weight: 1, notes: ['React Native course'] },
  { merchant: 'Rahul Verma', upiId: 'rahulv@okaxis', categoryId: 'transfers', min: 100, max: 1500, sources: ['gpay', 'bhim'], weight: 3, notes: ['Split for dinner', 'Returned money'] },
  { merchant: 'Priya Singh', upiId: 'priya.singh@oksbi', categoryId: 'transfers', min: 200, max: 2000, sources: ['phonepe', 'gpay'], weight: 2 },
  { merchant: 'Sharma General Store', upiId: 'sharmastore@paytm', categoryId: 'groceries', min: 30, max: 260, sources: ['paytm', 'phonepe', 'bhim'], weight: 5 },
];

interface RecurringTemplate {
  merchant: string;
  upiId?: string;
  categoryId: string;
  /** Rupees */
  amount: number;
  type: 'debit' | 'credit';
  source: Source;
  dayOfMonth: number;
  hour: number;
  note?: string;
}

const RECURRING: RecurringTemplate[] = [
  { merchant: 'Acme Technologies Pvt Ltd', categoryId: 'income', amount: 65000, type: 'credit', source: 'canara', dayOfMonth: 1, hour: 10, note: 'Salary' },
  { merchant: 'Suresh Sharma (Landlord)', upiId: 'sureshsharma@okhdfcbank', categoryId: 'rent', amount: 15000, type: 'debit', source: 'phonepe', dayOfMonth: 3, hour: 11, note: 'Monthly rent' },
  { merchant: 'BESCOM Electricity', upiId: 'bescom@billdesk', categoryId: 'bills', amount: 1340, type: 'debit', source: 'bhim', dayOfMonth: 8, hour: 19 },
  { merchant: 'Jio Recharge', upiId: 'jio@sbi', categoryId: 'bills', amount: 349, type: 'debit', source: 'paytm', dayOfMonth: 10, hour: 9 },
  { merchant: 'Netflix', upiId: 'netflix@icici', categoryId: 'entertainment', amount: 649, type: 'debit', source: 'slice_card', dayOfMonth: 12, hour: 6 },
  { merchant: 'Airtel Xstream Fiber', upiId: 'airtel@ybl', categoryId: 'bills', amount: 799, type: 'debit', source: 'gpay', dayOfMonth: 15, hour: 20 },
  { merchant: 'Groww SIP', upiId: 'groww@axisbank', categoryId: 'transfers', amount: 5000, type: 'debit', source: 'slice_account', dayOfMonth: 5, hour: 8, note: 'Monthly SIP' },
];

const DAYS_BACK = 90;
const UNTAGGED_RECENT_DAYS = 14;
const SEED = 20261010;

function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function generateMockTransactions(now: Date = new Date()): Transaction[] {
  const rand = mulberry32(SEED);
  const int = (min: number, max: number) => Math.floor(rand() * (max - min + 1)) + min;
  const pick = <T,>(items: T[]): T => items[Math.floor(rand() * items.length)];
  const totalWeight = MERCHANTS.reduce((sum, m) => sum + m.weight, 0);
  const pickMerchant = () => {
    let r = rand() * totalWeight;
    for (const m of MERCHANTS) {
      r -= m.weight;
      if (r <= 0) return m;
    }
    return MERCHANTS[MERCHANTS.length - 1];
  };

  const today = startOfDay(now);
  const firstDay = subDays(today, DAYS_BACK);
  const transactions: Transaction[] = [];
  let counter = 0;
  const nextId = () => `t_${(counter++).toString().padStart(4, '0')}`;

  const pushTx = (tx: Omit<Transaction, 'id'>) => {
    if (new Date(tx.date) > now) return;
    transactions.push({ id: nextId(), ...tx });
  };

  for (let day = firstDay; day <= today; day = addDays(day, 1)) {
    const daysAgo = Math.round((today.getTime() - day.getTime()) / 86_400_000);
    const isWeekend = day.getDay() === 0 || day.getDay() === 6;
    const count = int(isWeekend ? 2 : 1, isWeekend ? 3 : 2);

    for (let i = 0; i < count; i++) {
      const m = pickMerchant();
      const date = new Date(day);
      date.setHours(int(8, 23), int(0, 59), 0, 0);
      const rupees = int(m.min, m.max);
      const isRecent = daysAgo <= UNTAGGED_RECENT_DAYS;
      const untagged = rand() < (isRecent ? 0.35 : 0.04) && rupees >= 50;
      const rated = !untagged && rand() < 0.35;
      const worthIt: WorthIt = rated ? (rand() < 0.7 ? 'yes' : 'no') : null;

      pushTx({
        amount: rupees * 100,
        type: 'debit',
        merchant: m.merchant,
        upiId: m.upiId,
        source: pick(m.sources),
        date: date.toISOString(),
        categoryId: untagged ? null : m.categoryId,
        note: !untagged && m.notes && rand() < 0.3 ? pick(m.notes) : undefined,
        worthIt,
        tags: [],
      });
    }

    if (rand() < 0.06) {
      const date = new Date(day);
      date.setHours(int(9, 21), int(0, 59), 0, 0);
      pushTx({
        amount: int(30, 400) * 100,
        type: 'debit',
        merchant: 'Cash',
        source: 'cash',
        date: date.toISOString(),
        categoryId: pick(['food', 'travel', 'groceries', 'misc']),
        note: pick(['Auto rickshaw', 'Street food', 'Vegetables', 'Tip']),
        worthIt: null,
        tags: [],
      });
    }
  }

  for (let monthOffset = 3; monthOffset >= 0; monthOffset--) {
    const monthStart = startOfMonth(subMonths(today, monthOffset));
    for (const r of RECURRING) {
      const date = setDate(monthStart, r.dayOfMonth);
      date.setHours(r.hour, 5, 0, 0);
      if (date < firstDay) continue;
      pushTx({
        amount: r.amount * 100,
        type: r.type,
        merchant: r.merchant,
        upiId: r.upiId,
        source: r.source,
        date: date.toISOString(),
        categoryId: r.categoryId,
        note: r.note,
        worthIt: null,
        tags: [],
      });
    }
  }

  // A short trip about five weeks ago so tags have something to show.
  const tripStart = subDays(today, 36);
  const trip: [string, string, number, Source, string][] = [
    ['IndiGo Airlines', 'travel', 5480, 'slice_card', 'Flight to Goa'],
    ['Zostel Goa', 'travel', 2400, 'gpay', 'Hostel, 3 nights'],
    ['Britto\'s Baga', 'food', 1850, 'phonepe', 'Dinner by the beach'],
    ['Scooter Rental Goa', 'travel', 1200, 'cash', 'Scooty for 3 days'],
    ['Curlies Anjuna', 'food', 1320, 'slice_card', 'Sunset drinks'],
  ];
  trip.forEach(([merchant, categoryId, rupees, source, note], i) => {
    const date = addDays(tripStart, Math.floor(i / 2));
    date.setHours(12 + i * 2, 15, 0, 0);
    pushTx({
      amount: rupees * 100,
      type: 'debit',
      merchant,
      source,
      date: date.toISOString(),
      categoryId,
      note,
      worthIt: i === 4 ? 'no' : 'yes',
      tags: ['goa-trip'],
    });
  });

  // A couple of refunds and cashback credits.
  const credits: [string, number, Source, number, string][] = [
    ['Amazon Refund', 799, 'gpay', 20, 'Returned headphones'],
    ['Google Pay Cashback', 45, 'gpay', 9, 'Scratch card'],
    ['Rahul Verma', 650, 'gpay', 4, 'Goa trip share'],
  ];
  for (const [merchant, rupees, source, daysAgo, note] of credits) {
    const date = subDays(today, daysAgo);
    date.setHours(17, 30, 0, 0);
    pushTx({
      amount: rupees * 100,
      type: 'credit',
      merchant,
      source,
      date: date.toISOString(),
      categoryId: 'income',
      note,
      worthIt: null,
      tags: [],
    });
  }

  return transactions.sort((a, b) => b.date.localeCompare(a.date));
}
