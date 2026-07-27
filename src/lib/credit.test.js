import { describe, it, expect } from 'vitest';
import { effectiveRate, monthlyPayment, totalInterest } from './credit.js';

describe('mensualité (annuité constante)', () => {
    it('valeur de référence : 200 000 € à 3 % sur 20 ans', () => {
        // Vérifiée contre un tableau d’amortissement standard : ≈ 1 109,20 €
        expect(monthlyPayment(200000, 3, 20)).toBeCloseTo(1109.2, 1);
    });

    it('taux nul : simple division du capital', () => {
        expect(monthlyPayment(120000, 0, 10)).toBeCloseTo(1000, 6);
    });

    it('capital ou durée nuls', () => {
        expect(monthlyPayment(0, 3, 20)).toBe(0);
        expect(monthlyPayment(200000, 3, 0)).toBe(0);
    });

    it('la mensualité décroît quand la durée s’allonge', () => {
        const m15 = monthlyPayment(250000, 3.2, 15);
        const m25 = monthlyPayment(250000, 3.2, 25);
        expect(m25).toBeLessThan(m15);
    });

    it('somme des mensualités − capital = intérêts totaux', () => {
        const principal = 250000;
        const m = monthlyPayment(principal, 3.2, 25);
        expect(totalInterest(principal, 3.2, 25)).toBeCloseTo(m * 300 - principal, 6);
    });
});

describe('bonus PEB', () => {
    it('s’applique aux scores A et B', () => {
        const a = effectiveRate(3.2, 'A');
        expect(a.rate).toBeCloseTo(3.05, 10);
        expect(a.bonusApplied).toBe(true);
        expect(effectiveRate(3.2, 'B').bonusApplied).toBe(true);
    });

    it('ne s’applique pas de C à G', () => {
        for (const score of ['C', 'D', 'E', 'F', 'G']) {
            expect(effectiveRate(3.2, score)).toEqual({ rate: 3.2, bonusApplied: false });
        }
    });

    it('ne fait jamais passer le taux sous le plancher', () => {
        expect(effectiveRate(0.5, 'A').rate).toBeCloseTo(0.35, 10);
        expect(effectiveRate(0.2, 'A').rate).toBe(0.1);
    });
});
