import { h, showToast } from './dom.js';
import { tone } from './tone.js';
import { formatEuro, formatEuroShort, formatPercent, formatNumber } from '../lib/format.js';
import { REGISTRATION } from '../lib/params.js';

const MAX_SCENARIOS = 3;
const BADGE_COLORS = ['#5a8a5c', '#e0a858', '#7c8fb0'];
const BADGE_LABELS = ['A', 'B', 'C'];

let scenarios = [];
let nextId = 1;

const shortRegion = (region) => (region === 'bruxelles' ? 'BXL' : 'WAL');

export function saveScenario(result) {
    const replaced = scenarios.length >= MAX_SCENARIOS ? scenarios.shift() : null;
    scenarios.push({ id: nextId++, result });

    const label = BADGE_LABELS[scenarios.length - 1];
    // La version précédente écrasait le plus ancien scénario en silence, en
    // annonçant systématiquement la même lettre. On dit ce qu'on fait.
    showToast(
        replaced
            ? `Scénario ${label} sauvegardé — le plus ancien a été remplacé`
            : `Scénario ${label} sauvegardé ✓`,
    );
    return scenarios.length;
}

export function clearScenarios() {
    scenarios = [];
}

export function scenarioCount() {
    return scenarios.length;
}

export function renderScenarios({ section, grid, table, clearButton }) {
    if (scenarios.length === 0) {
        section.classList.add('hidden');
        clearButton.classList.add('hidden');
        grid.replaceChildren();
        table.replaceChildren();
        return;
    }

    section.classList.remove('hidden');
    clearButton.classList.remove('hidden');
    grid.style.gridTemplateColumns = `repeat(${scenarios.length}, minmax(0, 1fr))`;
    grid.replaceChildren(...scenarios.map(renderCard));
    table.replaceChildren(scenarios.length >= 2 ? renderTable() : renderHint());
}

function renderCard({ id, result }, index) {
    const row = (label, value, className = 'font-medium') =>
        h(
            'div',
            { class: 'flex justify-between' },
            h('span', { class: 'text-gray-600 dark:text-gray-400', text: label }),
            h('span', { class: className, text: value }),
        );

    // Les couleurs viennent du verdict calculé par le moteur, jamais de seuils
    // réécrits ici — c'est ce qui garantit la cohérence avec la jauge.
    const debtTone = tone(result.feasibility.tone);
    const ltv = tone(result.ltvTone);

    return h(
        'div',
        {
            class: 'scenario-card relative rounded-xl border border-gray-200 bg-gray-100/60 p-4 dark:border-gray-700 dark:bg-gray-800/60',
        },
        h('button', {
            type: 'button',
            class: 'scenario-remove absolute right-2 top-2 flex size-6 items-center justify-center rounded-full bg-gray-200 text-xs text-gray-600 hover:bg-red-500 hover:text-white dark:bg-gray-700 dark:text-gray-400',
            'aria-label': `Supprimer le scénario ${BADGE_LABELS[index]}`,
            text: '×',
            onclick: () => {
                scenarios = scenarios.filter((s) => s.id !== id);
                document.dispatchEvent(new CustomEvent('scenarios:changed'));
            },
        }),
        h(
            'div',
            { class: 'mb-3 flex items-center gap-2' },
            h('span', {
                class: 'scenario-badge',
                style: { background: BADGE_COLORS[index] },
                text: BADGE_LABELS[index],
            }),
            h('span', { class: 'text-sm font-semibold', text: formatEuroShort(result.input.price) }),
            h('span', { class: 'text-xs text-gray-500', text: shortRegion(result.input.region) }),
        ),
        h(
            'div',
            { class: 'space-y-1.5 text-xs' },
            row('Mensualité', formatEuro(result.monthly), 'result-value font-semibold'),
            row('Taux', `${formatNumber(result.rate, 2)} %`),
            row('Durée', `${result.input.years} ans`),
            row('Endettement', formatPercent(result.debtRatio), `font-medium ${debtTone.text}`),
            row('Quotité', formatPercent(result.ltv, 0), `font-medium ${ltv.text}`),
            row('PEB', result.input.peb),
            result.asrd.enabled &&
                row('Prime ASRD', formatEuro(result.asrd.singlePremium), 'result-value font-medium'),
        ),
        h(
            'div',
            { class: 'mt-3 border-t border-gray-200 pt-2 dark:border-gray-700' },
            h(
                'div',
                { class: 'flex justify-between text-xs' },
                h('span', { class: 'text-gray-600 dark:text-gray-400', text: 'Coût total' }),
                h('span', {
                    class: 'result-value font-bold text-brand-700 dark:text-brand-400',
                    text: formatEuroShort(result.totalOperation),
                }),
            ),
        ),
    );
}

const ROWS = [
    { label: 'Région', value: (r) => REGISTRATION[r.input.region].label },
    { label: 'Prix', value: (r) => formatEuro(r.input.price) },
    { label: 'Apport', value: (r) => formatEuro(r.input.downPayment) },
    { label: 'Taux effectif', value: (r) => `${formatNumber(r.rate, 2)} %` },
    { label: 'Durée', value: (r) => `${r.input.years} ans` },
    { label: 'Mensualité', value: (r) => formatEuro(r.monthly), bold: true },
    { label: 'Reste à vivre', value: (r) => formatEuro(r.remaining) },
    {
        label: 'Endettement',
        value: (r) => formatPercent(r.debtRatio),
        toneOf: (r) => r.feasibility.tone,
    },
    {
        label: 'Quotité (LTV)',
        value: (r) => formatPercent(r.ltv, 0),
        toneOf: (r) => r.ltvTone,
    },
    { label: 'Frais totaux', value: (r) => formatEuro(r.totalFees) },
    { label: 'Coût des intérêts', value: (r) => formatEuro(r.interest) },
    {
        label: 'Prime ASRD',
        value: (r) => (r.asrd.enabled ? formatEuro(r.asrd.singlePremium) : '—'),
    },
    { label: 'Coût total opération', value: (r) => formatEuro(r.totalOperation), bold: true },
];

function renderTable() {
    const head = h(
        'tr',
        { class: 'border-b border-gray-200 dark:border-gray-700' },
        h('th', { class: 'py-2 pr-4' }),
        ...scenarios.map((_, i) =>
            h(
                'th',
                { class: 'px-2 py-2 text-right' },
                h('span', {
                    class: 'scenario-badge',
                    style: { background: BADGE_COLORS[i] },
                    text: BADGE_LABELS[i],
                }),
            ),
        ),
    );

    const body = ROWS.map((row) =>
        h(
            'tr',
            { class: 'border-b border-gray-200 dark:border-gray-700' },
            h('td', {
                class: `py-1.5 pr-4 text-gray-600 dark:text-gray-400 ${row.bold ? 'font-semibold' : ''}`,
                text: row.label,
            }),
            ...scenarios.map(({ result }) =>
                h('td', {
                    class: [
                        'result-value px-2 py-1.5 text-right',
                        row.bold ? 'font-semibold' : '',
                        row.toneOf ? tone(row.toneOf(result)).text : '',
                    ]
                        .filter(Boolean)
                        .join(' '),
                    text: row.value(result),
                }),
            ),
        ),
    );

    return h(
        'div',
        {},
        h(
            'table',
            { class: 'w-full text-xs' },
            h('thead', {}, head),
            h('tbody', {}, ...body),
        ),
        h('p', {
            class: 'mt-3 text-xs text-gray-500',
            text: 'Astuce : modifiez les paramètres puis sauvegardez un nouveau scénario pour comparer.',
        }),
    );
}

function renderHint() {
    return h('p', {
        class: 'mt-2 text-xs text-gray-500',
        text: 'Sauvegardez au moins 2 scénarios pour les comparer.',
    });
}
