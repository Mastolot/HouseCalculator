import './styles.css';

import { simulate } from './lib/simulate.js';
import { LAST_VERIFIED, PEB_BONUS } from './lib/params.js';
import { formatEuro, formatEuroShort, formatPercent, formatNumber } from './lib/format.js';
import { CHECKLIST } from './data/checklist.js';

import { $, $$, h, toggleDisclosure } from './ui/dom.js';
import { initTheme } from './ui/theme.js';
import { updateChart, refreshChartTheme } from './ui/chart.js';
import { tone } from './ui/tone.js';
import { saveScenario, clearScenarios, renderScenarios } from './ui/scenarios.js';
import { exportSimulation } from './ui/export.js';

/** État qui ne vit pas déjà dans un champ du formulaire. */
const state = {
    region: 'bruxelles',
    peb: 'C',
};

let lastResult = null;

// ─── Lecture des entrées ─────────────────────────────────────────

const num = (id) => parseFloat($(`#${id}`).value) || 0;
const checked = (id) => $(`#${id}`).checked;

function readInputs() {
    return {
        price: num('price'),
        downPayment: num('downPayment'),
        totalSavings: num('totalSavings'),
        nominalRate: num('rate'),
        years: num('duration'),
        peb: state.peb,
        region: state.region,
        ownAndOnlyHome: checked('ownAndOnlyHome'),
        income: {
            netMonthly: num('income'),
            thirteenthMonth: num('thirteenthMonth'),
            annualBonus: num('annualBonus'),
            mealVoucherPerDay: num('mealVoucherPerDay'),
            companyCar: checked('companyCar'),
        },
        insurance: {
            enabled: checked('asrdEnabled'),
            age: num('asrdAge') || 30,
            smoker: checked('asrdSmoker'),
            coverage: parseFloat($('#asrdCoverage').value),
            financing: $('#asrdFinancing').value,
        },
    };
}

// ─── Rendu ───────────────────────────────────────────────────────

function recalculate() {
    lastResult = simulate(readInputs());
    render(lastResult);
}

function render(r) {
    renderControls(r);
    renderFeasibility(r);
    renderKeyFigures(r);
    renderWarnings(r);
    renderSavings(r);
    renderAsrd(r);
    renderStickyBar(r);
    renderFeeBreakdown(r);
    updateChart($('#costChart'), $('#chartLegend'), r);
}

function renderControls(r) {
    $('#priceDisplay').textContent = formatEuro(r.input.price);
    $('#downPaymentDisplay').textContent = formatEuro(r.input.downPayment);
    $('#rateDisplay').textContent = `${formatNumber(r.input.nominalRate, 2)} %`;
    $('#durationDisplay').textContent = `${r.input.years} ans`;
    $('#adjustedIncome').textContent = `${formatEuro(r.monthlyIncome)}/mois`;

    const note = $('#pebBonusNote');
    note.classList.toggle('hidden', !r.pebBonusApplied);
    if (r.pebBonusApplied) {
        note.textContent = `✨ Bonus PEB estimé : −${formatNumber(PEB_BONUS.rateReduction, 2)} % → taux effectif ${formatNumber(r.rate, 2)} %`;
    }

    $$('input[type="range"]').forEach(paintTrack);
}

/** Remplit la partie gauche du slider jusqu'à la valeur courante. */
function paintTrack(input) {
    const min = parseFloat(input.min);
    const max = parseFloat(input.max);
    const pct = ((parseFloat(input.value) - min) / (max - min)) * 100;
    const rest = getComputedStyle(document.documentElement).getPropertyValue('--color-gray-200');
    const restDark = getComputedStyle(document.documentElement).getPropertyValue('--color-gray-700');
    const track = document.documentElement.classList.contains('dark') ? restDark : rest;
    input.style.background = `linear-gradient(to right, #5a8a5c 0 ${pct}%, ${track} ${pct}% 100%)`;
}

const FEASIBILITY_TEXT = {
    'no-income': () => 'Renseignez vos revenus nets mensuels pour obtenir une évaluation.',
    'no-loan': (r) =>
        `Votre apport de ${formatEuro(r.input.downPayment)} couvre le prix et les frais : aucun crédit n’est nécessaire.`,
    ok: (r) =>
        `Endettement de ${formatPercent(r.debtRatio)}, sous le seuil de ${r.feasibility.thresholds.green} % applicable à vos revenus. Reste à vivre : ${formatEuro(r.remaining)}.`,
    tight: (r) =>
        `Endettement de ${formatPercent(r.debtRatio)} pour un seuil de ${r.feasibility.thresholds.green} %. La banque pourrait exiger des garanties supplémentaires. Reste à vivre : ${formatEuro(r.remaining)}.`,
    risky: (r) =>
        `Endettement de ${formatPercent(r.debtRatio)}, au-delà de ${r.feasibility.thresholds.orange} %. Réduisez le prix, augmentez l’apport ou allongez la durée.`,
};

function renderFeasibility(r) {
    const t = tone(r.feasibility.tone);
    const circumference = 2 * Math.PI * 58;
    const capped = Math.min(Math.max(r.debtRatio, 0), 60);

    const ring = $('#gaugeRing');
    ring.style.strokeDashoffset = circumference - (capped / 60) * circumference;
    ring.setAttribute('stroke', t.hex);

    const percent = $('#gaugePercent');
    percent.textContent = r.feasibility.status === 'no-income' ? '—' : formatPercent(r.debtRatio);
    percent.className = `result-value text-2xl font-bold ${t.text}`;

    $('#feasLabel').textContent = `${t.icon} ${r.feasibility.label}`;
    $('#feasLabel').className = `mb-1 text-lg font-bold ${t.text}`;
    $('#feasDesc').textContent = FEASIBILITY_TEXT[r.feasibility.status](r);

    $('#feasibilityCard').className = `card animate-in border p-6 ${t.border}`;

    $('#monthlyResult').textContent = formatEuro(r.monthly);
    $('#remainResult').textContent =
        r.feasibility.status === 'no-income' ? '—' : formatEuro(r.remaining);
}

function renderKeyFigures(r) {
    $('#financingNeed').textContent = formatEuroShort(r.loanAmount);
    $('#totalInterest').textContent = formatEuroShort(r.interest);
    $('#totalFees').textContent = formatEuroShort(r.totalFees);

    const ltv = $('#ltvDisplay');
    ltv.textContent = r.loanAmount > 0 ? formatPercent(r.ltv, 0) : '—';
    ltv.className = `result-value text-base font-bold sm:text-lg ${
        r.loanAmount > 0 ? tone(r.ltvTone).text : ''
    }`;
}

function renderWarnings(r) {
    $('#warnings').replaceChildren(
        ...r.warnings.map((w) => {
            const t = tone(w.tone);
            return h(
                'div',
                { class: `rounded-xl border px-4 py-2.5 text-xs leading-relaxed ${t.surface}` },
                `${t.icon} ${w.message}`,
            );
        }),
    );
}

function renderSavings(r) {
    const box = $('#savingsBox');
    if (r.input.totalSavings <= 0) {
        box.classList.add('hidden');
        return;
    }
    box.classList.remove('hidden');

    const left = r.savingsLeft;
    const t = tone(r.savingsTone);

    box.className = `mt-3 rounded-lg border px-3 py-2 ${t.surface}`;
    const display = $('#savingsLeft');
    display.textContent = formatEuro(left);
    display.className = `result-value text-sm font-bold ${t.text}`;

    const bar = $('#savingsBar');
    bar.style.width = `${Math.max(0, Math.min(100, (left / r.input.totalSavings) * 100))}%`;
    bar.className = `h-1.5 rounded-full transition-all duration-300 ${t.bar}`;
}

function renderAsrd(r) {
    if (!r.asrd.enabled) return;
    $('#asrdPremium').textContent = formatEuro(r.asrd.singlePremium);
    $('#asrdMonthly').textContent = `${formatEuro(r.asrd.monthlyEquivalent)}/mois`;
    $('#asrdFinancingNote').textContent =
        r.asrd.financing === 'loan'
            ? 'La prime s’ajoute au capital emprunté : la mensualité et la quotité augmentent.'
            : 'La prime sort de votre épargne le jour de l’acte et n’alourdit pas la mensualité.';
}

function renderStickyBar(r) {
    $('#stickyMonthly').textContent = formatEuro(r.monthly);
    $('#stickyRemain').textContent = formatEuro(r.remaining);
    const debt = $('#stickyDebt');
    debt.textContent = r.feasibility.status === 'no-income' ? '—' : formatPercent(r.debtRatio);
    debt.className = `result-value text-base font-bold leading-tight ${tone(r.feasibility.tone).text}`;
}

function renderFeeBreakdown(r) {
    const line = (label, value, hint) =>
        h(
            'div',
            { class: 'flex justify-between gap-4 border-b border-gray-200 py-2 dark:border-gray-800' },
            h(
                'span',
                { class: 'text-gray-600 dark:text-gray-400' },
                label,
                hint && h('span', { class: 'text-xs text-gray-500', text: ` (${hint})` }),
            ),
            h('span', { class: 'result-value shrink-0 font-medium', text: formatEuro(value) }),
        );

    const heading = (text) =>
        h('div', {
            class: 'mb-2 mt-4 text-xs font-semibold uppercase tracking-wider text-brand-700 dark:text-brand-400',
            text,
        });

    const summaryLine = (label, value) =>
        h(
            'div',
            { class: 'flex justify-between py-1' },
            h('span', { class: 'text-gray-600 dark:text-gray-400', text: label }),
            h('span', { class: 'font-medium', text: value }),
        );

    $('#feeBreakdown').replaceChildren(
        h('p', {
            class: 'mb-3 text-xs leading-relaxed text-gray-600 dark:text-gray-400',
            text: 'Frais calculés selon le barème dégressif notarial belge (AR 1950) et la TVA de 21 %.',
        }),

        heading('Acte de vente'),
        line('Droits d’enregistrement', r.registration, r.registrationLabel),
        line('Honoraires notaire', r.notary.honoraires, 'barème dégressif'),
        line('TVA 21 % sur honoraires', r.notary.vat),
        line('Frais administratifs & recherches', r.notary.admin),

        heading('Acte hypothécaire'),
        line('Droit d’enregistrement', r.mortgage.registrationTax, '1 % du prêt'),
        line('Droit d’inscription hypothécaire', r.mortgage.inscriptionFee, '0,3 %'),
        line('Honoraires notaire', r.mortgage.honoraires, 'acte de crédit'),
        line('TVA 21 % sur honoraires', r.mortgage.vat),
        line('Frais administratifs', r.mortgage.admin),
        line('Frais de dossier bancaire', r.mortgage.bankFile, 'souvent négociables'),

        h(
            'div',
            {
                class: 'mt-2 flex justify-between border-b border-gray-200 py-2 font-semibold dark:border-gray-800',
            },
            h('span', { text: 'Total des frais' }),
            h('span', {
                class: 'result-value text-brand-700 dark:text-brand-400',
                text: formatEuro(r.totalFees),
            }),
        ),

        h(
            'div',
            { class: 'mt-4 border-t border-gray-300 pt-3 dark:border-gray-700' },
            heading('Résumé du crédit'),
            summaryLine('Prix du bien', formatEuro(r.input.price)),
            summaryLine('Capital emprunté', formatEuro(r.loanAmount)),
            summaryLine('Quotité (LTV)', formatPercent(r.ltv)),
            summaryLine('Taux effectif', `${formatNumber(r.rate, 2)} %`),
            summaryLine('Nombre de mensualités', String(r.months)),
            summaryLine('Coût total des intérêts', formatEuro(r.interest)),
            r.asrd.enabled &&
                summaryLine(
                    `Prime ASRD (${r.asrd.financing === 'loan' ? 'financée' : 'comptant'})`,
                    formatEuro(r.asrd.singlePremium),
                ),
            h(
                'div',
                {
                    class: 'mt-2 flex justify-between border-t border-gray-300 pt-2 text-base font-semibold dark:border-gray-700',
                },
                h('span', { text: 'Coût total de l’opération' }),
                h('span', {
                    class: 'result-value text-brand-700 dark:text-brand-400',
                    text: formatEuro(r.totalOperation),
                }),
            ),
        ),
    );
}

// ─── Checklist ───────────────────────────────────────────────────

function renderChecklist() {
    $('#checklistContent').replaceChildren(
        ...CHECKLIST.map((phase) =>
            h(
                'div',
                {},
                h('h3', {
                    class: 'mb-3 text-xs font-bold uppercase tracking-wider text-brand-700 dark:text-brand-400',
                    text: `${phase.icon} ${phase.title}`,
                }),
                h(
                    'div',
                    { class: 'space-y-2' },
                    ...phase.items.map((item) =>
                        h(
                            'label',
                            { class: 'group flex cursor-pointer items-start gap-3' },
                            h('input', {
                                type: 'checkbox',
                                class: 'mt-0.5 size-4 shrink-0 rounded border-gray-300 text-brand-600 focus:ring-brand-500 dark:border-gray-600 dark:bg-gray-800',
                            }),
                            h(
                                'div',
                                {},
                                h('span', {
                                    class: 'text-sm text-gray-700 dark:text-gray-300',
                                    text: item.label,
                                }),
                                h(
                                    'p',
                                    { class: 'mt-0.5 text-xs text-gray-600 dark:text-gray-500' },
                                    item.detail,
                                    item.link &&
                                        h('a', {
                                            href: item.link.href,
                                            target: '_blank',
                                            rel: 'noopener noreferrer',
                                            class: 'ml-1 text-brand-700 underline dark:text-brand-400',
                                            text: item.link.text,
                                        }),
                                ),
                            ),
                        ),
                    ),
                ),
            ),
        ),
    );
}

// ─── Câblage ─────────────────────────────────────────────────────

function refreshScenarios() {
    renderScenarios({
        section: $('#scenarioSection'),
        grid: $('#scenarioGrid'),
        table: $('#scenarioTable'),
        clearButton: $('#clearScenarios'),
    });
}

function setRegion(region) {
    state.region = region;
    const toggle = $('#regionToggle');
    toggle.setAttribute('aria-checked', String(region === 'bruxelles'));

    const active = 'font-medium text-gray-900 dark:text-white';
    const inactive = 'font-medium text-gray-500';
    $('#labelWallonie').className = region === 'wallonie' ? active : inactive;
    $('#labelBruxelles').className = region === 'bruxelles' ? active : inactive;
    recalculate();
}

function setPeb(score) {
    state.peb = score;
    $$('#pebGroup .peb-btn').forEach((btn) =>
        btn.setAttribute('aria-pressed', String(btn.dataset.peb === score)),
    );
    recalculate();
}

function init() {
    $('#paramsDate').textContent = new Date(LAST_VERIFIED).toLocaleDateString('fr-BE');

    // Un seul écouteur pour tous les champs : plus de `oninput` en dur dans le HTML.
    $$('input, select').forEach((el) => {
        if (el.closest('#checklistContent')) return;
        el.addEventListener(el.type === 'checkbox' || el.tagName === 'SELECT' ? 'change' : 'input', () => {
            if (el.id === 'asrdEnabled') {
                $('#asrdPanel').classList.toggle('hidden', !el.checked);
            }
            recalculate();
        });
    });

    $('#regionToggle').addEventListener('click', () =>
        setRegion(state.region === 'bruxelles' ? 'wallonie' : 'bruxelles'),
    );
    $('#pebGroup').addEventListener('click', (e) => {
        const btn = e.target.closest('.peb-btn');
        if (btn) setPeb(btn.dataset.peb);
    });

    initTheme($('#themeBtn'), () => {
        refreshChartTheme();
        $$('input[type="range"]').forEach(paintTrack);
    });

    for (const [buttonId, panelId] of [
        ['extrasToggle', 'extrasPanel'],
        ['feeDetailToggle', 'feeDetailPanel'],
        ['checklistToggle', 'checklistPanel'],
    ]) {
        const button = $(`#${buttonId}`);
        button.addEventListener('click', () => toggleDisclosure(button, $(`#${panelId}`)));
    }

    $('#saveScenario').addEventListener('click', () => {
        saveScenario(lastResult);
        refreshScenarios();
    });
    $('#clearScenarios').addEventListener('click', () => {
        clearScenarios();
        refreshScenarios();
    });
    document.addEventListener('scenarios:changed', refreshScenarios);

    const exportToggle = $('#exportToggle');
    const exportMenu = $('#exportMenu');
    exportToggle.addEventListener('click', (e) => {
        e.stopPropagation();
        const open = exportMenu.classList.toggle('hidden');
        exportToggle.setAttribute('aria-expanded', String(!open));
    });
    exportMenu.addEventListener('click', (e) => {
        const btn = e.target.closest('[data-format]');
        if (!btn) return;
        exportMenu.classList.add('hidden');
        exportToggle.setAttribute('aria-expanded', 'false');
        exportSimulation(btn.dataset.format, lastResult);
    });
    document.addEventListener('click', () => {
        exportMenu.classList.add('hidden');
        exportToggle.setAttribute('aria-expanded', 'false');
    });

    renderChecklist();
    setRegion(state.region);
}

init();
