(function(root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.dateFormatUtils = factory();
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function() {
  const DATE_FORMATS = ['system', 'dd/MM/yyyy', 'MM/dd/yyyy', 'yyyy-MM-dd'];
  const CURRENCY_FORMATS = ['system', 'es-AR', 'en-US', 'code'];
  const CURRENCY_CODES = ['ARS', 'USD', 'EUR', 'BRL'];

  function pad(value) {
    return String(value).padStart(2, '0');
  }

  function normalizeFormat(format) {
    return DATE_FORMATS.includes(format) ? format : 'system';
  }

  function normalizeCurrencyFormat(format) {
    return CURRENCY_FORMATS.includes(format) ? format : 'system';
  }

  function normalizeCurrencyCode(code) {
    return CURRENCY_CODES.includes(code) ? code : 'ARS';
  }

  function toDate(value) {
    if (!value) return null;
    if (value instanceof Date) {
      return Number.isNaN(value.getTime()) ? null : value;
    }

    if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
      const [year, month, day] = value.split('-').map(Number);
      const date = new Date(year, month - 1, day);
      return Number.isNaN(date.getTime()) ? null : date;
    }

    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  function formatDate(value, format = 'system') {
    const date = toDate(value);
    if (!date) return '';

    const selected = normalizeFormat(format);
    const day = pad(date.getDate());
    const month = pad(date.getMonth() + 1);
    const year = date.getFullYear();

    if (selected === 'dd/MM/yyyy') return `${day}/${month}/${year}`;
    if (selected === 'MM/dd/yyyy') return `${month}/${day}/${year}`;
    if (selected === 'yyyy-MM-dd') return `${year}-${month}-${day}`;

    return date.toLocaleDateString(undefined);
  }

  function formatDateTime(value, format = 'system') {
    const date = toDate(value);
    if (!date) return '';

    const base = formatDate(date, format);
    const hours = pad(date.getHours());
    const minutes = pad(date.getMinutes());
    const seconds = pad(date.getSeconds());
    return `${base}, ${hours}:${minutes}:${seconds}`;
  }

  function formatRange(desde, hasta, format = 'system') {
    const from = formatDate(desde, format);
    const to = formatDate(hasta, format);

    if (from && to) return `Periodo desde ${from} hasta ${to}`;
    return 'Periodo no valido';
  }

  function formatCurrency(value, currencyCode = 'ARS', currencyFormat = 'system') {
    const amount = Number(value || 0);
    const code = normalizeCurrencyCode(currencyCode);
    const format = normalizeCurrencyFormat(currencyFormat);
    const locale = format === 'system' || format === 'code' ? undefined : format;
    const currencyDisplay = format === 'code' ? 'code' : 'symbol';

    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: code,
      currencyDisplay,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  }

  return {
    DATE_FORMATS,
    CURRENCY_FORMATS,
    CURRENCY_CODES,
    normalizeFormat,
    normalizeCurrencyFormat,
    normalizeCurrencyCode,
    formatDate,
    formatDateTime,
    formatRange,
    formatCurrency
  };
});
