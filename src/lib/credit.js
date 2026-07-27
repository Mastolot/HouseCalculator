import { PEB_BONUS, LTV_BANDS } from './params.js';

/**
 * Appréciation de la quotité — **source de vérité unique**.
 * Utilisée par la tuile LTV, les cartes de scénario, le tableau comparatif
 * et l'export, pour qu'un même dossier ne soit jamais coloré différemment
 * d'un endroit à l'autre.
 *
 * @returns {'green'|'orange'|'red'}
 */
export function ltvTone(ltv) {
    if (ltv <= LTV_BANDS.comfortable) return 'green';
    if (ltv <= LTV_BANDS.acceptable) return 'orange';
    return 'red';
}

/**
 * Taux effectif après bonus PEB éventuel.
 * @param {number} nominalRate taux nominal annuel, en pourcent (ex. 3.2)
 * @param {string} pebScore 'A' … 'G'
 */
export function effectiveRate(nominalRate, pebScore) {
    const eligible = PEB_BONUS.eligibleScores.includes(pebScore);
    if (!eligible) return { rate: nominalRate, bonusApplied: false };
    return {
        rate: Math.max(PEB_BONUS.floorRate, nominalRate - PEB_BONUS.rateReduction),
        bonusApplied: true,
    };
}

/**
 * Mensualité d'un crédit à taux fixe (annuité constante).
 *
 * @param {number} principal capital emprunté
 * @param {number} annualRatePercent taux annuel en pourcent
 * @param {number} years durée en années
 */
export function monthlyPayment(principal, annualRatePercent, years) {
    const months = Math.round(years * 12);
    if (principal <= 0 || months <= 0) return 0;

    const monthlyRate = annualRatePercent / 100 / 12;
    // Taux nul : simple division du capital, la formule d'annuité diverge.
    if (monthlyRate <= 0) return principal / months;

    const growth = Math.pow(1 + monthlyRate, months);
    return (principal * (monthlyRate * growth)) / (growth - 1);
}

/** Coût total des intérêts sur toute la durée. */
export function totalInterest(principal, annualRatePercent, years) {
    const months = Math.round(years * 12);
    if (principal <= 0 || months <= 0) return 0;
    return monthlyPayment(principal, annualRatePercent, years) * months - principal;
}
