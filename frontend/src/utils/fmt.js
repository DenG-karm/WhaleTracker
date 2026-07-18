/**
 * fmt.js – Intl number, currency & date formatting utilities
 *
 * Usage:
 *   import { useFmt } from '../utils/fmt';
 *   const fmt = useFmt();
 *   fmt.num(1234567)       // "1,234,567" or "1.234.567"
 *   fmt.currency(1500)     // "$1,500.00" or "₺1.500,00"
 *   fmt.date(new Date())   // locale-aware short date
 *   fmt.pct(0.1234)        // "12.34%"
 */

import { useTranslation } from 'react-i18next';

// ── Pure helpers (locale string param) ────────────────────────────────────────

export function fmtNumber(value, locale = 'en') {
    const bcp = locale.startsWith('tr') ? 'tr-TR' : 'en-US';
    return new Intl.NumberFormat(bcp).format(value);
}

export function fmtCurrency(value, locale = 'en', currency = 'USD') {
    const bcp = locale.startsWith('tr') ? 'tr-TR' : 'en-US';
    return new Intl.NumberFormat(bcp, { style: 'currency', currency }).format(value);
}

export function fmtDate(date, locale = 'en', opts = {}) {
    const bcp = locale.startsWith('tr') ? 'tr-TR' : 'en-US';
    const defaults = { year: 'numeric', month: 'short', day: 'numeric' };
    return new Intl.DateTimeFormat(bcp, { ...defaults, ...opts }).format(new Date(date));
}

export function fmtPercent(value, locale = 'en', fractionDigits = 2) {
    const bcp = locale.startsWith('tr') ? 'tr-TR' : 'en-US';
    return new Intl.NumberFormat(bcp, {
        style: 'percent',
        minimumFractionDigits: fractionDigits,
        maximumFractionDigits: fractionDigits,
    }).format(value);
}

// ── React hook ────────────────────────────────────────────────────────────────

export function useFmt() {
    const { i18n } = useTranslation();
    const locale = (i18n.language || 'en').slice(0, 2);
    return {
        num:      (v)            => fmtNumber(v, locale),
        currency: (v, cur)       => fmtCurrency(v, locale, cur || 'USD'),
        date:     (d, opts)      => fmtDate(d, locale, opts),
        pct:      (v, digits)    => fmtPercent(v, locale, digits),
    };
}
