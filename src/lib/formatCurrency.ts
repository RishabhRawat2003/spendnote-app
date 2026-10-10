function groupIndian(integerPart: string): string {
  if (integerPart.length <= 3) return integerPart;
  const lastThree = integerPart.slice(-3);
  const rest = integerPart.slice(0, -3);
  return `${rest.replace(/\B(?=(\d{2})+(?!\d))/g, ',')},${lastThree}`;
}

function supportsIndianIntl(): boolean {
  try {
    return new Intl.NumberFormat('en-IN').format(1234567) === '12,34,567';
  } catch {
    return false;
  }
}

const intlFormatter = supportsIndianIntl()
  ? {
      whole: new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }),
      decimal: new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
    }
  : null;

function formatNumber(rupees: number, withDecimals: boolean): string {
  if (intlFormatter) {
    return (withDecimals ? intlFormatter.decimal : intlFormatter.whole).format(rupees);
  }
  const fixed = rupees.toFixed(withDecimals ? 2 : 0);
  const [integerPart, fraction] = fixed.split('.');
  return fraction ? `${groupIndian(integerPart)}.${fraction}` : groupIndian(integerPart);
}

interface FormatOptions {
  /** Prefix with + or − */
  sign?: 'debit' | 'credit';
  /** ₹1.2L / ₹12.5k style for tight spaces like chart labels */
  compact?: boolean;
}

/** Formats an amount in paise as Indian rupees, e.g. 12345600 -> "₹1,23,456". */
export function formatCurrency(paise: number, options: FormatOptions = {}): string {
  const abs = Math.abs(paise);
  const rupees = abs / 100;
  let body: string;

  if (options.compact && rupees >= 1000) {
    if (rupees >= 1_00_00_000) body = `${trimZero(rupees / 1_00_00_000)}Cr`;
    else if (rupees >= 1_00_000) body = `${trimZero(rupees / 1_00_000)}L`;
    else body = `${trimZero(rupees / 1000)}k`;
  } else {
    body = formatNumber(rupees, abs % 100 !== 0);
  }

  const prefix = options.sign === 'debit' ? '−' : options.sign === 'credit' ? '+' : paise < 0 ? '−' : '';
  return `${prefix}₹${body}`;
}

function trimZero(value: number): string {
  return value.toFixed(1).replace(/\.0$/, '');
}

/** Parses user input like "1,250.50" into paise. Returns null if invalid. */
export function parseRupeesToPaise(input: string): number | null {
  const cleaned = input.replace(/[,\s₹]/g, '');
  if (!/^\d+(\.\d{0,2})?$/.test(cleaned)) return null;
  const paise = Math.round(parseFloat(cleaned) * 100);
  return Number.isFinite(paise) ? paise : null;
}
