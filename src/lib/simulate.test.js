import { describe, it, expect } from 'vitest';
import { simulate } from './simulate.js';
import { mortgageDeedFees } from './fees.js';

/** Garde-fou : la suite doit converger bien avant la limite dure du solveur. */
const MAX_REASONABLE_ITERATIONS = 30;

/** Scénario de référence : les valeurs par défaut de l’interface. */
const base = {
    price: 350000,
    downPayment: 50000,
    totalSavings: 0,
    nominalRate: 3.2,
    years: 25,
    peb: 'C',
    region: 'bruxelles',
    ownAndOnlyHome: true,
    income: { netMonthly: 3700 },
};

describe('scénario de référence (valeurs golden)', () => {
    const r = simulate(base);

    it('frais totaux ≈ 31 562 €', () => {
        expect(Math.abs(r.totalFees - 31562)).toBeLessThan(2);
    });

    it('capital emprunté ≈ 331 562 €', () => {
        expect(Math.abs(r.loanAmount - 331562)).toBeLessThan(2);
    });

    it('quotité ≈ 94,7 %', () => {
        expect(r.ltv).toBeCloseTo(94.7, 1);
    });

    it('mensualité ≈ 1 607 €', () => {
        expect(Math.abs(r.monthly - 1607)).toBeLessThan(2);
    });

    it('taux d’endettement ≈ 43,4 %', () => {
        expect(r.debtRatio).toBeCloseTo(43.4, 1);
    });

    it('coût total = prix + frais + intérêts', () => {
        expect(r.totalOperation).toBeCloseTo(r.input.price + r.totalFees + r.interest, 6);
    });
});

describe('convergence du point fixe', () => {
    it('le résidu est sous le centime', () => {
        const r = simulate(base);
        const recomputed =
            r.input.price + r.purchaseFees + mortgageDeedFees(r.loanAmount).total - r.input.downPayment;
        expect(Math.abs(recomputed - r.loanAmount)).toBeLessThan(0.01);
    });

    it('converge en une poignée d’itérations', () => {
        expect(simulate(base).iterations).toBeLessThan(10);
    });

    it('converge aussi quand la prime d’assurance est financée', () => {
        const r = simulate({
            ...base,
            insurance: { enabled: true, age: 55, smoker: true, coverage: 1, financing: 'loan' },
        });
        const recomputed =
            r.input.price +
            r.purchaseFees +
            mortgageDeedFees(r.loanAmount).total +
            r.asrd.singlePremium -
            r.input.downPayment;
        expect(Math.abs(recomputed - r.loanAmount)).toBeLessThan(0.01);
        expect(r.iterations).toBeLessThan(MAX_REASONABLE_ITERATIONS);
    });
});

describe('régression — revenu nul', () => {
    it('n’annonce pas un « projet tendu » à revenu zéro', () => {
        const r = simulate({ ...base, income: { netMonthly: 0 } });
        expect(r.feasibility.status).toBe('no-income');
        expect(r.warnings.map((w) => w.code)).toContain('no-income');
    });
});

describe('régression — apport supérieur au prix', () => {
    const r = simulate({ ...base, price: 100000, downPayment: 500000 });

    it('ne présente pas ce cas comme un projet finançable', () => {
        expect(r.loanAmount).toBe(0);
        expect(r.feasibility.status).toBe('no-loan');
    });

    it('avertit explicitement l’utilisateur', () => {
        expect(r.warnings.map((w) => w.code)).toContain('down-payment-exceeds-price');
    });

    it('n’affiche ni mensualité ni quotité fantômes', () => {
        expect(r.monthly).toBe(0);
        expect(r.ltv).toBe(0);
        expect(r.debtRatio).toBe(0);
    });
});

describe('régression — assurance solde restant dû', () => {
    const noInsurance = simulate(base);
    const cash = simulate({
        ...base,
        insurance: { enabled: true, age: 30, financing: 'cash' },
    });
    const financed = simulate({
        ...base,
        insurance: { enabled: true, age: 30, financing: 'loan' },
    });

    it('payée comptant : n’alourdit pas le taux d’endettement', () => {
        // Une prime unique n’est pas une charge mensuelle récurrente.
        expect(cash.debtRatio).toBeCloseTo(noInsurance.debtRatio, 6);
        expect(cash.loanAmount).toBeCloseTo(noInsurance.loanAmount, 6);
    });

    it('payée comptant : sort de la trésorerie', () => {
        expect(cash.cashRequired).toBeCloseTo(base.downPayment + cash.asrd.singlePremium, 6);
    });

    it('financée : augmente le capital, donc la mensualité et la quotité', () => {
        expect(financed.loanAmount).toBeGreaterThan(noInsurance.loanAmount);
        expect(financed.monthly).toBeGreaterThan(noInsurance.monthly);
        expect(financed.ltv).toBeGreaterThan(noInsurance.ltv);
        expect(financed.cashRequired).toBe(base.downPayment);
    });

    it('la prime n’est comptée qu’une fois dans le coût total', () => {
        expect(financed.totalOperation).toBeCloseTo(
            financed.input.price + financed.totalFees + financed.interest + financed.asrd.singlePremium,
            6,
        );
    });

    it('la prime croît avec l’âge et le tabagisme', () => {
        const young = simulate({ ...base, insurance: { enabled: true, age: 28 } });
        const older = simulate({ ...base, insurance: { enabled: true, age: 52 } });
        const smoker = simulate({ ...base, insurance: { enabled: true, age: 28, smoker: true } });
        expect(older.asrd.singlePremium).toBeGreaterThan(young.asrd.singlePremium);
        expect(smoker.asrd.singlePremium).toBeGreaterThan(young.asrd.singlePremium);
    });
});

describe('quotité et avertissements', () => {
    it('signale une quotité supérieure à 100 %', () => {
        const r = simulate({ ...base, ownAndOnlyHome: false, downPayment: 20000 });
        expect(r.ltv).toBeGreaterThan(100);
        expect(r.warnings.map((w) => w.code)).toContain('ltv-above-max');
    });

    it('reste silencieux sous 80 %', () => {
        const r = simulate({ ...base, downPayment: 120000 });
        expect(r.ltv).toBeLessThan(80);
        const ltvWarnings = r.warnings.filter((w) => w.code.startsWith('ltv-'));
        expect(ltvWarnings).toHaveLength(0);
    });

    it('l’avertissement de quotité porte le même ton que la tuile', () => {
        // Une quotité peinte en rouge ne doit pas être commentée en orange.
        for (const downPayment of [10000, 30000, 60000, 90000, 150000]) {
            const r = simulate({ ...base, downPayment });
            const ltvWarning = r.warnings.find((w) => w.code.startsWith('ltv-'));
            if (ltvWarning) expect(ltvWarning.tone).toBe(r.ltvTone);
        }
    });

    it('alerte quand la trésorerie dépasse l’épargne', () => {
        const r = simulate({ ...base, totalSavings: 30000, downPayment: 50000 });
        expect(r.savingsLeft).toBeLessThan(0);
        expect(r.warnings.map((w) => w.code)).toContain('savings-exceeded');
    });
});

describe('cohérence entre régions', () => {
    it('la Wallonie en habitation propre coûte moins cher que Bruxelles', () => {
        const wal = simulate({ ...base, region: 'wallonie' });
        const bxl = simulate({ ...base, region: 'bruxelles' });
        expect(wal.totalFees).toBeLessThan(bxl.totalFees);
        expect(wal.monthly).toBeLessThan(bxl.monthly);
    });

    it('perdre le statut d’habitation propre renchérit toujours l’opération', () => {
        for (const region of ['wallonie', 'bruxelles']) {
            const own = simulate({ ...base, region });
            const notOwn = simulate({ ...base, region, ownAndOnlyHome: false });
            expect(notOwn.totalFees).toBeGreaterThan(own.totalFees);
        }
    });
});
