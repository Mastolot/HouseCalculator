/**
 * Source de vérité unique des paramètres fiscaux et bancaires.
 *
 * Règle : aucun nombre fiscal ne doit apparaître ailleurs dans le code.
 * Chaque bloc porte sa source et sa date de dernière vérification, pour qu'un
 * futur mainteneur sache quoi revérifier et où.
 */

export const PARAMS_VERSION = '2026.1';
export const LAST_VERIFIED = '2026-07-27';

/** Droits d'enregistrement par région. */
export const REGISTRATION = {
    wallonie: {
        label: 'Wallonie',
        /**
         * Taux réduit « habitation propre et unique » : 12,5 % → 3 % au
         * 1er janvier 2025. L'abattement de 40 000 € a été supprimé en même temps.
         * Conditions non modélisées ici : domiciliation dans les 3 ans,
         * absence d'autre bien en pleine propriété.
         * Source : SPW Fiscalité — https://fiscalite.wallonie.be
         */
        reducedRate: 0.03,
        standardRate: 0.125,
        abatement: null,
    },
    bruxelles: {
        label: 'Bruxelles-Capitale',
        /**
         * Taux unique de 12,5 %, avec abattement sur les 200 000 premiers €
         * si le prix n'excède pas 600 000 € (ordonnance du 16 mars 2023,
         * en vigueur depuis le 1er avril 2023).
         * Source : Bruxelles Fiscalité — https://fiscalite.brussels
         */
        reducedRate: 0.125,
        standardRate: 0.125,
        abatement: { amount: 200000, priceCap: 600000 },
    },
};

/**
 * Barème dégressif des honoraires notariaux.
 * Arrêté royal du 16 décembre 1950, tranches indexées.
 * Source : https://www.notaire.be
 */
export const NOTARY_SCALE = [
    { upTo: 7500, rate: 0.0456 },
    { upTo: 17500, rate: 0.0285 },
    { upTo: 30000, rate: 0.0228 },
    { upTo: 45495, rate: 0.0171 },
    { upTo: 64095, rate: 0.0114 },
    { upTo: 250095, rate: 0.0057 },
    { upTo: Infinity, rate: 0.00057 },
];

export const VAT_RATE = 0.21;

/** Frais forfaitaires. Ordres de grandeur constatés sur le marché, pas des tarifs officiels. */
export const FLAT_FEES = {
    /** Recherches et frais administratifs — acte de vente. */
    saleDeedAdmin: 1100,
    /** Recherches et frais administratifs — acte de crédit. */
    creditDeedAdmin: 850,
    /** Frais de dossier bancaire. Souvent négociables. */
    bankFile: 500,
};

/** Acte hypothécaire. Source : Code des droits d'enregistrement. */
export const MORTGAGE_DEED = {
    /** Droit d'enregistrement sur l'acte hypothécaire. */
    registrationRate: 0.01,
    /** Droit d'inscription hypothécaire (conservation des hypothèques). */
    inscriptionRate: 0.003,
};

/**
 * Bonus de taux pour un bien performant énergétiquement.
 *
 * ⚠️ Estimation, pas un barème. La pratique va de -0,10 % à -0,25 % selon la
 * banque et l'époque, et certaines ne l'appliquent plus du tout. Affiché comme
 * hypothèse modifiable, jamais comme un fait.
 */
export const PEB_BONUS = {
    eligibleScores: ['A', 'B'],
    rateReduction: 0.15,
    /** Un taux ne peut pas descendre sous ce plancher après bonus. */
    floorRate: 0.1,
};

/**
 * Assurance solde restant dû — prime unique estimée, en % du capital assuré.
 *
 * ⚠️ Ordres de grandeur agrégés à partir de simulateurs publics du marché belge
 * (AG, Ethias, AXA), pas un tarif contractuel. L'écart réel avec une offre
 * ferme peut dépasser 30 %. À traiter comme une estimation indicative.
 */
export const ASRD = {
    baseRateByMaxAge: [
        { maxAge: 25, rate: 0.025 },
        { maxAge: 30, rate: 0.035 },
        { maxAge: 35, rate: 0.05 },
        { maxAge: 40, rate: 0.07 },
        { maxAge: 45, rate: 0.095 },
        { maxAge: 50, rate: 0.135 },
        { maxAge: 55, rate: 0.19 },
        { maxAge: 60, rate: 0.27 },
        { maxAge: Infinity, rate: 0.35 },
    ],
    smokerMultiplier: 1.6,
    /** Ajustement de durée normalisé sur 20 ans : rate × (base + slope × durée/20). */
    durationBase: 0.7,
    durationSlope: 0.3,
};

/**
 * Prise en compte des revenus complémentaires par les banques.
 *
 * ⚠️ Pratiques de marché variables d'un établissement à l'autre. Valeurs
 * volontairement conservatrices.
 */
export const INCOME_WEIGHTS = {
    /** 13ᵉ mois et pécule : lissés à 100 % sur 12 mois. */
    thirteenthMonthShare: 1.0,
    /** Bonus annuel : environ la moitié retenue, car non garanti. */
    annualBonusShare: 0.5,
    /** Voiture de société : valorisation prudente du budget mobilité épargné. */
    companyCarMonthly: 200,
    /** Chèques repas : part patronale × jours ouvrables moyens par mois. */
    mealVoucherDaysPerMonth: 20,
};

/**
 * Seuils d'endettement adaptés au revenu.
 *
 * La norme BNB (≈ 1/3 des revenus) est un repère, pas une règle absolue :
 * les banques tolèrent un ratio plus élevé quand le reste à vivre le permet.
 * Trié par revenu décroissant — le premier seuil atteint gagne.
 */
export const DEBT_THRESHOLDS = [
    { minIncome: 6000, green: 45, orange: 50, minRemaining: 1200 },
    { minIncome: 4000, green: 42, orange: 48, minRemaining: 1400 },
    { minIncome: 2500, green: 38, orange: 45, minRemaining: 1500 },
    { minIncome: 0, green: 33, orange: 40, minRemaining: 1500 },
];

/** Quotité (loan-to-value). Repères de marché belges. */
export const LTV_BANDS = {
    comfortable: 80,
    acceptable: 90,
    /** Au-delà, la quasi-totalité des banques belges refusent. */
    maximum: 100,
};

/** Épargne résiduelle conseillée après versement de l'apport. */
export const SAVINGS_BUFFER = {
    critical: 5000,
    low: 15000,
};
