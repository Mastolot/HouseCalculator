import { describe, it, expect } from 'vitest';
import { adjustedIncome, debtThresholds, assessFeasibility } from './income.js';

describe('revenu ajusté', () => {
    it('sans revenu complémentaire, le revenu net est repris tel quel', () => {
        expect(adjustedIncome({ netMonthly: 3700 }).total).toBe(3700);
    });

    it('le 13ᵉ mois est lissé à 100 % sur douze mois', () => {
        expect(adjustedIncome({ netMonthly: 0, thirteenthMonth: 2400 }).total).toBe(200);
    });

    it('le bonus annuel n’est retenu qu’à moitié', () => {
        expect(adjustedIncome({ netMonthly: 0, annualBonus: 2400 }).total).toBe(100);
    });

    it('chèques repas : part patronale × 20 jours', () => {
        expect(adjustedIncome({ netMonthly: 0, mealVoucherPerDay: 6 }).total).toBe(120);
    });

    it('voiture de société : forfait, uniquement si cochée', () => {
        expect(adjustedIncome({ netMonthly: 0, companyCar: true }).total).toBe(200);
        expect(adjustedIncome({ netMonthly: 0, companyCar: false }).total).toBe(0);
    });

    it('tolère un objet vide', () => {
        expect(adjustedIncome().total).toBe(0);
        expect(adjustedIncome({}).total).toBe(0);
    });

    it('le détail se somme bien au total', () => {
        const i = adjustedIncome({
            netMonthly: 3000,
            thirteenthMonth: 3000,
            annualBonus: 1200,
            mealVoucherPerDay: 4,
            companyCar: true,
        });
        expect(i.total).toBeCloseTo(
            i.base + i.fromThirteenth + i.fromBonus + i.fromCar + i.fromMealVouchers,
            6,
        );
    });
});

describe('seuils d’endettement adaptatifs', () => {
    it('sélectionne la tranche correspondant au revenu', () => {
        expect(debtThresholds(7000).green).toBe(45);
        expect(debtThresholds(4500).green).toBe(42);
        expect(debtThresholds(3000).green).toBe(38);
        expect(debtThresholds(1800).green).toBe(33);
    });

    it('bornes de tranche inclusives', () => {
        expect(debtThresholds(6000).green).toBe(45);
        expect(debtThresholds(5999).green).toBe(42);
    });

    it('renvoie toujours une tranche, même à revenu nul ou négatif', () => {
        expect(debtThresholds(0).green).toBe(33);
        expect(debtThresholds(-100).green).toBe(33);
    });
});

describe('verdict de faisabilité', () => {
    const ctx = { monthlyIncome: 3700, loanAmount: 300000 };

    it('vert sous le seuil, avec un reste à vivre suffisant', () => {
        const f = assessFeasibility({ ...ctx, debtRatio: 30, remaining: 2500 });
        expect(f.status).toBe('ok');
        expect(f.tone).toBe('green');
    });

    it('orange si le reste à vivre est trop faible, même à ratio bas', () => {
        // 30 % d’endettement mais 900 € pour vivre : ce n’est pas un dossier vert.
        const f = assessFeasibility({ ...ctx, debtRatio: 30, remaining: 900 });
        expect(f.status).toBe('tight');
    });

    it('rouge au-delà du seuil orange', () => {
        const f = assessFeasibility({ ...ctx, debtRatio: 55, remaining: 1200 });
        expect(f.status).toBe('risky');
    });

    it('cas dégénérés : pas de revenu, pas de crédit', () => {
        expect(assessFeasibility({ ...ctx, monthlyIncome: 0, debtRatio: 0, remaining: 0 }).status)
            .toBe('no-income');
        expect(assessFeasibility({ ...ctx, loanAmount: 0, debtRatio: 0, remaining: 3700 }).status)
            .toBe('no-loan');
    });

    it('le seuil suit le revenu : 40 % passe à 7 000 € mais pas à 2 000 €', () => {
        expect(assessFeasibility({ debtRatio: 40, remaining: 4200, monthlyIncome: 7000, loanAmount: 1 }).status)
            .toBe('ok');
        expect(assessFeasibility({ debtRatio: 40, remaining: 1200, monthlyIncome: 2000, loanAmount: 1 }).status)
            .toBe('tight');
    });
});
