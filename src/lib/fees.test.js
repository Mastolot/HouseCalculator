import { describe, it, expect } from 'vitest';
import {
    registrationDuty,
    notaryScaleFees,
    saleDeedFees,
    mortgageDeedFees,
} from './fees.js';

describe('droits d’enregistrement', () => {
    it('Wallonie : 3 % pour une habitation propre et unique', () => {
        expect(registrationDuty(350000, 'wallonie', true)).toBe(10500);
    });

    it('Wallonie : 12,5 % sinon', () => {
        expect(registrationDuty(350000, 'wallonie', false)).toBe(43750);
    });

    it('Bruxelles : abattement de 200 k€ sous le plafond de 600 k€', () => {
        // (350 000 − 200 000) × 12,5 %
        expect(registrationDuty(350000, 'bruxelles', true)).toBe(18750);
    });

    it('Bruxelles : abattement perdu au-delà du plafond', () => {
        expect(registrationDuty(700000, 'bruxelles', true)).toBe(87500);
    });

    it('Bruxelles : pile sur le plafond, l’abattement s’applique encore', () => {
        expect(registrationDuty(600000, 'bruxelles', true)).toBe(50000);
        // Un euro de plus fait basculer sur la base pleine — effet de seuil réel.
        expect(registrationDuty(600001, 'bruxelles', true)).toBeCloseTo(75000.125, 2);
    });

    it('Bruxelles : pas d’abattement hors habitation propre', () => {
        expect(registrationDuty(350000, 'bruxelles', false)).toBe(43750);
    });

    it('prix nul ou région inconnue', () => {
        expect(registrationDuty(0, 'wallonie', true)).toBe(0);
        expect(() => registrationDuty(1000, 'flandre', true)).toThrow(/Région inconnue/);
    });
});

describe('barème notarial dégressif', () => {
    it('borne inférieure : première tranche entière', () => {
        // 7 500 × 4,56 %
        expect(notaryScaleFees(7500)).toBeCloseTo(342, 6);
    });

    it('cumule les tranches successives', () => {
        // 342 + 10 000 × 2,85 %
        expect(notaryScaleFees(17500)).toBeCloseTo(627, 6);
    });

    it('valeur calculée à la main sur 350 000 €', () => {
        //  7 500 × 4,56 %   =  342,000
        // 10 000 × 2,85 %   =  285,000
        // 12 500 × 2,28 %   =  285,000
        // 15 495 × 1,71 %   =  264,9645
        // 18 600 × 1,14 %   =  212,040
        // 186 000 × 0,57 %  = 1060,200
        // 99 905 × 0,057 %  =   56,94585
        expect(notaryScaleFees(350000)).toBeCloseTo(2506.15035, 5);
    });

    it('est monotone croissante', () => {
        let previous = 0;
        for (const amount of [1000, 7500, 20000, 50000, 100000, 300000, 900000]) {
            const fees = notaryScaleFees(amount);
            expect(fees).toBeGreaterThan(previous);
            previous = fees;
        }
    });

    it('renvoie zéro pour un montant nul ou négatif', () => {
        expect(notaryScaleFees(0)).toBe(0);
        expect(notaryScaleFees(-5000)).toBe(0);
    });
});

describe('frais d’acte', () => {
    it('acte de vente : honoraires + TVA 21 % + forfait administratif', () => {
        const { honoraires, vat, admin, total } = saleDeedFees(350000);
        expect(vat).toBeCloseTo(honoraires * 0.21, 6);
        expect(admin).toBe(1100);
        expect(total).toBeCloseTo(honoraires + vat + admin, 6);
    });

    it('acte hypothécaire : 1 % d’enregistrement + 0,3 % d’inscription', () => {
        const m = mortgageDeedFees(300000);
        expect(m.registrationTax).toBeCloseTo(3000, 6);
        expect(m.inscriptionFee).toBeCloseTo(900, 6);
        expect(m.bankFile).toBe(500);
        expect(m.total).toBeCloseTo(
            m.registrationTax + m.inscriptionFee + m.honoraires + m.vat + m.admin + m.bankFile,
            6,
        );
    });

    it('aucun frais forfaitaire quand il n’y a pas de crédit', () => {
        const m = mortgageDeedFees(0);
        expect(m.total).toBe(0);
        expect(m.bankFile).toBe(0);
    });
});
