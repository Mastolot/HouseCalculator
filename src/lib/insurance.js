import { ASRD } from './params.js';

/**
 * Prime unique estimée d'une assurance solde restant dû.
 *
 * ⚠️ Estimation indicative — voir l'avertissement dans params.js.
 *
 * @param {object} p
 * @param {number} p.insuredCapital capital couvert
 * @param {number} p.years durée du crédit
 * @param {number} p.age âge de l'emprunteur à la souscription
 * @param {boolean} p.smoker
 * @param {number} p.coverage part couverte (1 = 100 %, 0.5 = 50 % en couple)
 * @returns {number} prime unique
 */
export function asrdSinglePremium({ insuredCapital, years, age, smoker, coverage }) {
    if (insuredCapital <= 0 || years <= 0) return 0;

    const band = ASRD.baseRateByMaxAge.find((b) => age <= b.maxAge);
    let rate = band.rate;

    if (smoker) rate *= ASRD.smokerMultiplier;
    rate *= ASRD.durationBase + ASRD.durationSlope * (years / 20);
    rate *= coverage;

    return insuredCapital * rate;
}

/**
 * Équivalent mensuel de la prime unique, à titre indicatif uniquement.
 *
 * Ce n'est PAS une charge mensuelle : une prime unique se paie en une fois.
 * Elle ne doit donc jamais entrer dans le calcul du taux d'endettement —
 * si elle est financée, c'est la mensualité du crédit qui augmente.
 */
export function asrdMonthlyEquivalent(singlePremium, years) {
    if (years <= 0) return 0;
    return singlePremium / (years * 12);
}
