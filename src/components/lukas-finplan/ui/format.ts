const CZK_FORMATTER = new Intl.NumberFormat('cs-CZ', {
  style: 'currency',
  currency: 'CZK',
  maximumFractionDigits: 0,
});

const NUMBER_FORMATTER = new Intl.NumberFormat('cs-CZ', {
  maximumFractionDigits: 0,
});

export function fmtCZK(value: number): string {
  return CZK_FORMATTER.format(Math.round(value));
}

export function fmtNumber(value: number): string {
  return NUMBER_FORMATTER.format(Math.round(value));
}

export function fmtSum(value: number | null): string {
  return value == null ? 'Není třeba zajistit' : fmtCZK(value);
}
