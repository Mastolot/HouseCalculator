import {
    REGISTRATION,
    NOTARY_SCALE,
    VAT_RATE,
    FLAT_FEES,
    MORTGAGE_DEED,
} from './params.js';

/**
 * Droits d'enregistrement dus sur l'acte de vente.
 *
 * @param {number} price prix du bien
 * @param {'wallonie'|'bruxelles'} region
 * @param {boolean} ownAndOnlyHome habitation propre et unique
 */
export function registrationDuty(price, region, ownAndOnlyHome) {
    const cfg = REGISTRATION[region];
    if (!cfg) throw new Error(`Région inconnue : ${region}`);
    if (price <= 0) return 0;

    if (!ownAndOnlyHome) return price * cfg.standardRate;

    const { abatement, reducedRate } = cfg;
    if (abatement && price <= abatement.priceCap) {
        return Math.max(0, price - abatement.amount) * reducedRate;
    }
    return price * reducedRate;
}

/** Libellé explicatif du régime appliqué, pour l'affichage du détail. */
export function registrationLabel(price, region, ownAndOnlyHome) {
    const cfg = REGISTRATION[region];
    const pct = (r) => `${(r * 100).toString().replace('.', ',')} %`;

    if (!ownAndOnlyHome) {
        return `${pct(cfg.standardRate)} (taux normal — pas habitation propre et unique)`;
    }
    if (cfg.abatement) {
        return price <= cfg.abatement.priceCap
            ? `${pct(cfg.reducedRate)} avec abattement (0 % sur les premiers ${cfg.abatement.amount / 1000} k€)`
            : `${pct(cfg.reducedRate)} sans abattement (prix > ${cfg.abatement.priceCap / 1000} k€)`;
    }
    return `${pct(cfg.reducedRate)} (taux réduit habitation propre et unique)`;
}

/**
 * Honoraires notariaux selon le barème dégressif par tranches.
 * Chaque tranche n'est taxée que sur la part du montant qui la traverse.
 */
export function notaryScaleFees(amount) {
    if (amount <= 0) return 0;
    let fees = 0;
    let previousCap = 0;

    for (const bracket of NOTARY_SCALE) {
        if (amount <= previousCap) break;
        fees += (Math.min(amount, bracket.upTo) - previousCap) * bracket.rate;
        previousCap = bracket.upTo;
    }
    return fees;
}

/** Frais de l'acte de vente : honoraires + TVA + frais administratifs. */
export function saleDeedFees(price) {
    const honoraires = notaryScaleFees(price);
    const vat = honoraires * VAT_RATE;
    const admin = price > 0 ? FLAT_FEES.saleDeedAdmin : 0;
    return { honoraires, vat, admin, total: honoraires + vat + admin };
}

/** Frais de l'acte hypothécaire, fonction du capital emprunté. */
export function mortgageDeedFees(loanAmount) {
    if (loanAmount <= 0) {
        return {
            registrationTax: 0,
            inscriptionFee: 0,
            honoraires: 0,
            vat: 0,
            admin: 0,
            bankFile: 0,
            total: 0,
        };
    }

    const registrationTax = loanAmount * MORTGAGE_DEED.registrationRate;
    const inscriptionFee = loanAmount * MORTGAGE_DEED.inscriptionRate;
    const honoraires = notaryScaleFees(loanAmount);
    const vat = honoraires * VAT_RATE;

    return {
        registrationTax,
        inscriptionFee,
        honoraires,
        vat,
        admin: FLAT_FEES.creditDeedAdmin,
        bankFile: FLAT_FEES.bankFile,
        total:
            registrationTax +
            inscriptionFee +
            honoraires +
            vat +
            FLAT_FEES.creditDeedAdmin +
            FLAT_FEES.bankFile,
    };
}
