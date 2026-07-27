import { INCOME_WEIGHTS, DEBT_THRESHOLDS } from './params.js';

/**
 * Revenu mensuel retenu par la banque, revenus complémentaires pondérés.
 *
 * Fonction pure : elle ne touche pas au DOM, contrairement à la version
 * historique qui écrivait son résultat dans la page au passage.
 */
export function adjustedIncome({
    netMonthly = 0,
    thirteenthMonth = 0,
    annualBonus = 0,
    mealVoucherPerDay = 0,
    companyCar = false,
} = {}) {
    const w = INCOME_WEIGHTS;

    const fromThirteenth = (thirteenthMonth * w.thirteenthMonthShare) / 12;
    const fromBonus = (annualBonus * w.annualBonusShare) / 12;
    const fromCar = companyCar ? w.companyCarMonthly : 0;
    const fromMealVouchers = mealVoucherPerDay * w.mealVoucherDaysPerMonth;

    return {
        base: netMonthly,
        fromThirteenth,
        fromBonus,
        fromCar,
        fromMealVouchers,
        total: netMonthly + fromThirteenth + fromBonus + fromCar + fromMealVouchers,
    };
}

/** Seuils d'endettement applicables à ce niveau de revenu. */
export function debtThresholds(monthlyIncome) {
    return DEBT_THRESHOLDS.find((t) => monthlyIncome >= t.minIncome) ?? DEBT_THRESHOLDS.at(-1);
}

/**
 * Verdict de faisabilité — **source de vérité unique**.
 *
 * Toute la surface d'affichage (jauge, cartes de scénario, tableau comparatif,
 * export) doit passer par ici. La version historique dupliquait des seuils
 * codés en dur à quatre endroits, et un même dossier pouvait ressortir vert
 * dans une carte et orange dans la jauge.
 *
 * @returns {{status: 'no-income'|'no-loan'|'ok'|'tight'|'risky', label: string,
 *            tone: 'neutral'|'green'|'orange'|'red', thresholds: object}}
 */
export function assessFeasibility({ debtRatio, remaining, monthlyIncome, loanAmount }) {
    const thresholds = debtThresholds(monthlyIncome);

    if (monthlyIncome <= 0) {
        return {
            status: 'no-income',
            tone: 'neutral',
            label: 'Revenu manquant',
            thresholds,
        };
    }

    if (loanAmount <= 0) {
        return {
            status: 'no-loan',
            tone: 'green',
            label: 'Aucun financement nécessaire',
            thresholds,
        };
    }

    if (debtRatio < thresholds.green && remaining > thresholds.minRemaining) {
        return { status: 'ok', tone: 'green', label: 'Projet réalisable', thresholds };
    }
    if (debtRatio <= thresholds.orange) {
        return { status: 'tight', tone: 'orange', label: 'Projet tendu', thresholds };
    }
    return { status: 'risky', tone: 'red', label: 'Projet à risque', thresholds };
}
