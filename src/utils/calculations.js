// utility functions for invoice computations

/**
 * Calculate total for a single line item.
 * @param {number} quantity
 * @param {number} unitPrice
 * @returns {number}
 */
export function calculateLineTotal(quantity, unitPrice) {
  const q = parseFloat(quantity) || 0;
  const p = parseFloat(unitPrice) || 0;
  return q * p;
}

/**
 * Calculate grand total for array of items.
 * @param {Array<{quantity: number, unitPrice: number}>} items
 * @returns {number}
 */
export function calculateGrandTotal(items) {
  return items.reduce((sum, item) => {
    return sum + calculateLineTotal(item.quantity, item.unitPrice);
  }, 0);
}

/**
 * Format a number as currency string
 * @param {number} value
 * @param {string} locale
 * @param {string} currency
 * @returns {string}
 */
export function formatCurrency(value, locale = 'en-NG', currency = 'NGN') {
  return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(value);
}
