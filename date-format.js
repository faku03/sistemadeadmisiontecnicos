(function(root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.dateFormatUtils = factory();
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function() {
  const DATE_FORMATS = ['system', 'dd/MM/yyyy', 'MM/dd/yyyy', 'yyyy-MM-dd'];

  function pad(value) {
    return String(value).padStart(2, '0');
  }

  function normalizeFormat(format) {
    return DATE_FORMATS.includes(format) ? format : 'system';
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

  return {
    DATE_FORMATS,
    normalizeFormat,
    formatDate,
    formatDateTime,
    formatRange
  };
});
