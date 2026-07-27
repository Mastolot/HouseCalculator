import { h, showToast } from './dom.js';
import { tone } from './tone.js';
import { isDark } from './theme.js';
import { formatEuro, formatPercent, formatNumber, formatToday } from '../lib/format.js';
import { REGISTRATION } from '../lib/params.js';

/** Format A4 portrait, en millimètres. */
const A4 = { width: 210, height: 297, margin: 10 };

function palette() {
    const dark = isDark();
    return {
        page: dark ? '#11140f' : '#f6f8f5',
        card: dark ? '#1c211b' : '#ffffff',
        tile: dark ? '#2c322a' : '#eef1ec',
        border: dark ? '#2c322a' : '#dfe4db',
        text: dark ? '#f6f8f5' : '#2c322a',
        muted: dark ? '#99a396' : '#5c6459',
        brand: '#5a8a5c',
    };
}

function buildExportCard(result) {
    const c = palette();
    const debt = tone(result.feasibility.tone);
    const ltv = tone(result.ltvTone);

    const line = (label, value, color = c.text, bold = false) =>
        h(
            'div',
            { style: { display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: '13px' } },
            h('span', { style: { color: c.muted }, text: label }),
            h('span', { style: { color, fontWeight: bold ? '700' : '600' }, text: value }),
        );

    const tile = (label, value, color = c.text) =>
        h(
            'div',
            { style: { background: c.tile, padding: '14px', borderRadius: '12px', textAlign: 'center' } },
            h('div', { style: { fontSize: '11px', color: c.muted, marginBottom: '4px' }, text: label }),
            h('div', { style: { fontSize: '18px', fontWeight: '700', color }, text: value }),
        );

    const card = (...children) =>
        h(
            'div',
            {
                style: {
                    background: c.card,
                    border: `1px solid ${c.border}`,
                    borderRadius: '16px',
                    padding: '20px',
                },
            },
            ...children,
        );

    const heading = (text) =>
        h('div', {
            style: {
                fontSize: '11px',
                fontWeight: '600',
                color: c.brand,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                marginBottom: '12px',
            },
            text,
        });

    return h(
        'div',
        {
            style: {
                position: 'fixed',
                left: '-10000px',
                top: '0',
                width: '800px',
                padding: '40px',
                fontFamily: 'Inter, system-ui, sans-serif',
                background: c.page,
                color: c.text,
            },
        },
        h(
            'div',
            { style: { marginBottom: '24px' } },
            h('div', { style: { fontSize: '18px', fontWeight: '700' }, text: 'Nouveau Nid' }),
            h('div', {
                style: { fontSize: '11px', color: c.muted },
                text: `Simulation hypothécaire — ${formatToday()}`,
            }),
        ),

        h(
            'div',
            {
                style: {
                    background: c.card,
                    border: `1px solid ${c.border}`,
                    borderRadius: '16px',
                    padding: '24px',
                    marginBottom: '16px',
                },
            },
            h('div', {
                style: { fontSize: '18px', fontWeight: '700', color: debt.hex, marginBottom: '4px' },
                text: `${debt.icon} ${result.feasibility.label}`,
            }),
            h('div', {
                style: { fontSize: '13px', color: c.muted, marginBottom: '16px' },
                text: `Région : ${REGISTRATION[result.input.region].label} · Seuil applicable : ${result.feasibility.thresholds.green} %`,
            }),
            h(
                'div',
                { style: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' } },
                tile('Mensualité', formatEuro(result.monthly)),
                tile('Reste à vivre', formatEuro(result.remaining)),
                tile('Quotité (LTV)', formatPercent(result.ltv, 0), ltv.hex),
                tile('Endettement', formatPercent(result.debtRatio), debt.hex),
            ),
        ),

        h(
            'div',
            { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' } },
            card(
                heading('Paramètres'),
                line('Prix du bien', formatEuro(result.input.price)),
                line('Apport personnel', formatEuro(result.input.downPayment)),
                line('Taux effectif', `${formatNumber(result.rate, 2)} %`),
                line('Durée', `${result.input.years} ans`),
                line('Score PEB', result.input.peb),
            ),
            card(
                heading('Résumé financier'),
                line('Capital emprunté', formatEuro(result.loanAmount)),
                line('Coût des intérêts', formatEuro(result.interest)),
                line('Frais totaux', formatEuro(result.totalFees)),
                result.asrd.enabled &&
                    line(
                        `Prime ASRD (${result.asrd.financing === 'loan' ? 'financée' : 'comptant'})`,
                        formatEuro(result.asrd.singlePremium),
                    ),
                h('div', {
                    style: { borderTop: `1px solid ${c.border}`, marginTop: '6px', paddingTop: '4px' },
                }),
                line('Coût total opération', formatEuro(result.totalOperation), c.brand, true),
            ),
        ),

        h('div', {
            style: { textAlign: 'center', fontSize: '10px', color: c.muted, paddingTop: '8px' },
            text: 'Simulation indicative — ne constitue pas une offre de crédit ni un conseil financier.',
        }),
    );
}

function showSpinner() {
    const overlay = h(
        'div',
        {
            class: 'fixed inset-0 z-[200] flex items-center justify-center bg-black/30 backdrop-blur-sm',
            id: 'exportOverlay',
        },
        h(
            'div',
            {
                class: 'rounded-2xl bg-white px-8 py-5 text-center shadow-xl dark:bg-gray-800 dark:text-white',
            },
            h('div', { class: 'spinner mx-auto mb-2' }),
            h('div', { class: 'text-sm font-medium', text: 'Génération en cours…' }),
        ),
    );
    document.body.append(overlay);
    return () => overlay.remove();
}

/**
 * Exporte la simulation en PNG ou en PDF.
 *
 * html2canvas-pro et jsPDF représentent ~500 Ko : ils ne sont chargés qu'ici,
 * au premier clic, et non sur chaque visite comme dans la version précédente.
 * html2canvas-pro (et non html2canvas) parce que Tailwind v4 produit des
 * couleurs `oklch`, que l'ancienne version ne sait pas interpréter.
 */
export async function exportSimulation(format, result) {
    if (!result) {
        showToast('Lancez d’abord une simulation');
        return;
    }

    const hideSpinner = showSpinner();
    const card = buildExportCard(result);
    document.body.append(card);

    try {
        const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
            import('html2canvas-pro'),
            import('jspdf'),
        ]);

        await document.fonts?.ready;

        const canvas = await html2canvas(card, {
            scale: 2,
            backgroundColor: palette().page,
            logging: false,
        });

        const filename = `simulation-hypothecaire-${new Date().toISOString().slice(0, 10)}`;

        if (format === 'png') {
            const link = h('a', { download: `${filename}.png`, href: canvas.toDataURL('image/png') });
            link.click();
            showToast('Image PNG exportée ✓');
            return;
        }

        // Mise à l'échelle proportionnelle dans la zone imprimable. L'ancienne
        // version mélangeait largeur mise à l'échelle et décalage de centrage
        // dans le même argument, ce qui déformait l'image.
        const printable = { w: A4.width - 2 * A4.margin, h: A4.height - 2 * A4.margin };
        const ratio = canvas.height / canvas.width;

        let width = printable.w;
        let height = width * ratio;
        if (height > printable.h) {
            height = printable.h;
            width = height / ratio;
        }

        const pdf = new jsPDF('p', 'mm', 'a4');
        pdf.addImage(
            canvas.toDataURL('image/png'),
            'PNG',
            (A4.width - width) / 2,
            A4.margin,
            width,
            height,
        );
        pdf.save(`${filename}.pdf`);
        showToast('PDF exporté ✓');
    } catch (error) {
        console.error('Échec de l’export :', error);
        showToast('Erreur lors de l’export');
    } finally {
        card.remove();
        hideSpinner();
    }
}
