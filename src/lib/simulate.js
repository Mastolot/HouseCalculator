import {
    registrationDuty,
    registrationLabel,
    saleDeedFees,
    mortgageDeedFees,
} from './fees.js';
import { effectiveRate, monthlyPayment, totalInterest, ltvTone } from './credit.js';
import { asrdSinglePremium, asrdMonthlyEquivalent } from './insurance.js';
import { adjustedIncome, assessFeasibility } from './income.js';
import { LTV_BANDS, SAVINGS_BUFFER } from './params.js';

/**
 * Ton associé à l'épargne restante.
 * Décidé ici et non dans l'interface, pour que le seuil ne soit écrit qu'une fois.
 */
function savingsTone(totalSavings, savingsLeft) {
    if (totalSavings <= 0) return 'neutral';
    if (savingsLeft < 0) return 'red';
    if (savingsLeft < SAVINGS_BUFFER.low) return 'orange';
    return 'green';
}

/** Tolérance de convergence du point fixe, en euros. */
const CONVERGENCE_EPSILON = 0.01;
const MAX_ITERATIONS = 100;

/**
 * Résout la circularité capital emprunté ↔ frais.
 *
 * Les frais d'acte hypothécaire (et la prime d'assurance, si elle est
 * financée) dépendent du capital emprunté, qui dépend lui-même de ces frais.
 * On itère jusqu'à convergence plutôt que sur un nombre de tours arbitraire :
 * le facteur de contraction (~1,3 % de frais + jusqu'à 35 % de prime) reste
 * très inférieur à 1, la suite converge donc géométriquement.
 */
function solveLoanAmount({ price, purchaseFees, downPayment, insuranceFn }) {
    let loan = Math.max(0, price + purchaseFees - downPayment);

    for (let i = 0; i < MAX_ITERATIONS; i++) {
        const deed = mortgageDeedFees(loan);
        const insurance = insuranceFn(loan);
        const next = Math.max(0, price + purchaseFees + deed.total + insurance - downPayment);

        if (Math.abs(next - loan) < CONVERGENCE_EPSILON) {
            return { loan: next, iterations: i + 1 };
        }
        loan = next;
    }
    return { loan, iterations: MAX_ITERATIONS };
}

/**
 * Simulation complète. Fonction pure : mêmes entrées → mêmes sorties, aucun
 * accès au DOM, aucune lecture d'état global. C'est ce qui la rend testable.
 *
 * @param {object} input
 * @returns {object} résultat complet, prêt à être affiché
 */
export function simulate(input) {
    const {
        price = 0,
        downPayment = 0,
        totalSavings = 0,
        nominalRate = 0,
        years = 25,
        peb = 'C',
        region = 'wallonie',
        ownAndOnlyHome = true,
        income: incomeInput = {},
        insurance: insuranceInput = {},
    } = input;

    const insurance = {
        enabled: false,
        age: 30,
        smoker: false,
        coverage: 1,
        /** 'cash' : prime payée comptant · 'loan' : prime financée dans le crédit. */
        financing: 'loan',
        ...insuranceInput,
    };

    // ── Frais liés à l'acte de vente ────────────────────────────────
    const registration = registrationDuty(price, region, ownAndOnlyHome);
    const notary = saleDeedFees(price);
    const purchaseFees = registration + notary.total;

    // ── Capital emprunté (point fixe) ───────────────────────────────
    const financeInsurance = insurance.enabled && insurance.financing === 'loan';
    const insuranceFn = (loan) =>
        financeInsurance
            ? asrdSinglePremium({
                  insuredCapital: loan,
                  years,
                  age: insurance.age,
                  smoker: insurance.smoker,
                  coverage: insurance.coverage,
              })
            : 0;

    const { loan: loanAmount, iterations } = solveLoanAmount({
        price,
        purchaseFees,
        downPayment,
        insuranceFn,
    });

    const mortgage = mortgageDeedFees(loanAmount);
    const totalFees = purchaseFees + mortgage.total;

    // ── Assurance solde restant dû ──────────────────────────────────
    const asrdPremium = insurance.enabled
        ? asrdSinglePremium({
              insuredCapital: loanAmount,
              years,
              age: insurance.age,
              smoker: insurance.smoker,
              coverage: insurance.coverage,
          })
        : 0;

    // ── Crédit ──────────────────────────────────────────────────────
    const { rate, bonusApplied } = effectiveRate(nominalRate, peb);
    const monthly = monthlyPayment(loanAmount, rate, years);
    const interest = totalInterest(loanAmount, rate, years);
    const months = Math.round(years * 12);

    // ── Revenus et ratios ───────────────────────────────────────────
    const incomeBreakdown = adjustedIncome(incomeInput);
    const monthlyIncome = incomeBreakdown.total;

    // Seule la mensualité du crédit constitue une charge récurrente. Une prime
    // unique payée comptant n'en est pas une ; financée, elle est déjà dans la
    // mensualité via le capital emprunté. Dans les deux cas, pas de double compte.
    const debtRatio = monthlyIncome > 0 ? (monthly / monthlyIncome) * 100 : 0;
    const remaining = monthlyIncome - monthly;
    const ltv = price > 0 ? (loanAmount / price) * 100 : 0;

    const feasibility = assessFeasibility({
        debtRatio,
        remaining,
        monthlyIncome,
        loanAmount,
    });

    // ── Trésorerie ──────────────────────────────────────────────────
    const cashInsurance = insurance.enabled && insurance.financing === 'cash' ? asrdPremium : 0;
    const cashRequired = downPayment + cashInsurance;
    const savingsLeft = totalSavings - cashRequired;

    const totalOperation = price + totalFees + interest + asrdPremium;

    return {
        input: { price, downPayment, totalSavings, nominalRate, years, peb, region, ownAndOnlyHome, insurance },

        rate,
        pebBonusApplied: bonusApplied,
        months,

        registration,
        registrationLabel: registrationLabel(price, region, ownAndOnlyHome),
        notary,
        mortgage,
        purchaseFees,
        totalFees,

        loanAmount,
        iterations,
        ltv,
        ltvTone: ltvTone(ltv),

        monthly,
        interest,
        totalOperation,

        asrd: {
            enabled: insurance.enabled,
            financing: insurance.financing,
            singlePremium: asrdPremium,
            monthlyEquivalent: asrdMonthlyEquivalent(asrdPremium, years),
        },

        income: incomeBreakdown,
        monthlyIncome,
        debtRatio,
        remaining,
        feasibility,

        cashRequired,
        savingsLeft,
        savingsTone: savingsTone(totalSavings, savingsLeft),

        warnings: buildWarnings({
            price,
            downPayment,
            totalSavings,
            cashRequired,
            savingsLeft,
            ltv,
            monthlyIncome,
            loanAmount,
        }),
    };
}

/**
 * Avertissements affichables.
 *
 * Chaque avertissement porte son propre `tone`, aligné sur celui de la donnée
 * qu'il commente : une quotité peinte en rouge dans sa tuile ne peut pas être
 * commentée par une bannière orange.
 */
function buildWarnings({ price, downPayment, totalSavings, cashRequired, savingsLeft, ltv, monthlyIncome, loanAmount }) {
    const warnings = [];
    const euro = (n) => `${Math.round(n).toLocaleString('fr-BE')} €`;

    if (monthlyIncome <= 0) {
        warnings.push({
            tone: 'red',
            code: 'no-income',
            message: 'Renseignez un revenu net mensuel pour évaluer la faisabilité du projet.',
        });
    }

    if (downPayment > price && price > 0) {
        warnings.push({
            tone: 'red',
            code: 'down-payment-exceeds-price',
            message: 'Votre apport dépasse le prix du bien — aucun crédit n’est nécessaire.',
        });
    } else if (loanAmount <= 0 && price > 0) {
        warnings.push({
            tone: 'neutral',
            code: 'no-loan-needed',
            message: 'Votre apport couvre le prix et les frais : aucun crédit n’est nécessaire.',
        });
    }

    if (totalSavings > 0) {
        if (savingsLeft < 0) {
            warnings.push({
                tone: 'red',
                code: 'savings-exceeded',
                message: `Il vous manque ${euro(-savingsLeft)} : le montant à sortir (${euro(cashRequired)}) dépasse votre épargne.`,
            });
        } else if (savingsLeft < SAVINGS_BUFFER.critical) {
            warnings.push({
                tone: 'orange',
                code: 'savings-critical',
                message: 'Épargne de sécurité très faible — prévoyez un coussin pour les imprévus.',
            });
        } else if (savingsLeft < SAVINGS_BUFFER.low) {
            warnings.push({
                tone: 'orange',
                code: 'savings-low',
                message: 'Pensez à garder 3 à 6 mois de charges en réserve (déménagement, travaux, imprévus).',
            });
        }
    }

    if (loanAmount > 0) {
        const pct = `${ltv.toFixed(0)} %`;
        if (ltv > LTV_BANDS.maximum) {
            warnings.push({
                tone: 'red',
                code: 'ltv-above-max',
                message: `Quotité de ${pct} — la plupart des banques belges refusent au-delà de ${LTV_BANDS.maximum} %. Augmentez votre apport.`,
            });
        } else if (ltv > LTV_BANDS.acceptable) {
            warnings.push({
                tone: 'red',
                code: 'ltv-high',
                message: `Quotité de ${pct} — au-delà de ${LTV_BANDS.acceptable} %, les banques exigent souvent un taux majoré et des garanties supplémentaires.`,
            });
        } else if (ltv > LTV_BANDS.comfortable) {
            warnings.push({
                tone: 'orange',
                code: 'ltv-moderate',
                message: `Quotité de ${pct} — correct pour un premier achat. Sous ${LTV_BANDS.comfortable} %, vous obtiendrez de meilleures conditions.`,
            });
        }
    }

    return warnings;
}
