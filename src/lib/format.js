const LOCALE = 'fr-BE';

const euro = new Intl.NumberFormat(LOCALE, { maximumFractionDigits: 0 });

/** « 331 562 € » */
export function formatEuro(value) {
    return `${euro.format(Math.round(value || 0))} €`;
}

/** « 332 k€ », « 1,2 M€ » — pour les tuiles compactes. */
export function formatEuroShort(value) {
    const n = value || 0;
    if (Math.abs(n) >= 1_000_000) return `${formatNumber(n / 1_000_000, 1)} M€`;
    if (Math.abs(n) >= 10_000) return `${euro.format(Math.round(n / 1000))} k€`;
    return formatEuro(n);
}

/**
 * Nombre localisé avec un nombre fixe de décimales.
 * Intl gère le séparateur décimal — inutile de bricoler des `.replace('.', ',')`,
 * qui étaient d'ailleurs sans effet sur un `toFixed(0)`.
 */
export function formatNumber(value, decimals = 0) {
    return new Intl.NumberFormat(LOCALE, {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
    }).format(value || 0);
}

/** « 43,4 % » */
export function formatPercent(value, decimals = 1) {
    return `${formatNumber(value, decimals)} %`;
}

/** Date du jour au format belge. */
export function formatToday() {
    return new Date().toLocaleDateString(LOCALE);
}
