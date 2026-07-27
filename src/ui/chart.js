import { Chart, DoughnutController, ArcElement, Tooltip } from 'chart.js';
import { formatEuro, formatEuroShort, formatPercent } from '../lib/format.js';
import { isDark } from './theme.js';

// Enregistrement explicite : seuls le doughnut et les tooltips sont embarqués,
// pas l'intégralité de Chart.js.
Chart.register(DoughnutController, ArcElement, Tooltip);

const SEGMENTS = [
    { key: 'capital', label: 'Capital emprunté', color: '#5a8a5c' },
    { key: 'interest', label: 'Intérêts', color: '#e0a858' },
    { key: 'fees', label: 'Frais (notaire, enregistrement…)', color: '#7c8fb0' },
    { key: 'asrd', label: 'Assurance solde restant dû', color: '#c47d5a' },
];

let chart = null;

/**
 * Options de tooltip dépendant du thème.
 *
 * Elles étaient auparavant figées à la création du graphique : passer en mode
 * sombre laissait un tooltip clair. On les réapplique désormais à chaque
 * bascule de thème (voir `refreshChartTheme`).
 */
function tooltipOptions() {
    const dark = isDark();
    return {
        backgroundColor: dark ? 'rgba(28,33,27,0.95)' : 'rgba(255,255,255,0.95)',
        titleColor: dark ? '#f6f8f5' : '#2c322a',
        bodyColor: dark ? '#c9d0c5' : '#575f54',
        borderColor: dark ? '#424a3f' : '#dfe4db',
        borderWidth: 1,
        cornerRadius: 10,
        padding: 12,
        callbacks: {
            label: (ctx) => `${ctx.label} : ${formatEuro(ctx.raw)}`,
        },
    };
}

function segmentsFor(result) {
    const values = {
        capital: result.loanAmount,
        interest: result.interest,
        fees: result.totalFees,
        asrd: result.asrd.enabled ? result.asrd.singlePremium : 0,
    };
    return SEGMENTS.filter((s) => values[s.key] > 0).map((s) => ({ ...s, value: values[s.key] }));
}

export function updateChart(canvas, legendEl, result) {
    const segments = segmentsFor(result);
    const labels = segments.map((s) => s.label);
    const data = segments.map((s) => s.value);
    const colors = segments.map((s) => s.color);

    if (chart) {
        chart.data.labels = labels;
        chart.data.datasets[0].data = data;
        chart.data.datasets[0].backgroundColor = colors;
        chart.update();
    } else {
        chart = new Chart(canvas.getContext('2d'), {
            type: 'doughnut',
            data: {
                labels,
                datasets: [{ data, backgroundColor: colors, borderWidth: 0, hoverOffset: 8 }],
            },
            options: {
                responsive: true,
                cutout: '65%',
                plugins: { legend: { display: false }, tooltip: tooltipOptions() },
            },
        });
    }

    renderLegend(legendEl, segments);
}

function renderLegend(el, segments) {
    const total = segments.reduce((sum, s) => sum + s.value, 0);
    el.replaceChildren(
        ...segments.map((s) => {
            const row = document.createElement('div');
            row.className = 'flex items-center justify-between';

            const left = document.createElement('div');
            left.className = 'flex items-center gap-2';
            const dot = document.createElement('span');
            dot.className = 'size-3 shrink-0 rounded-full';
            dot.style.background = s.color;
            const name = document.createElement('span');
            name.className = 'text-gray-600 dark:text-gray-400';
            name.textContent = s.label;
            left.append(dot, name);

            const right = document.createElement('div');
            right.className = 'result-value font-semibold';
            right.textContent = formatEuroShort(s.value);
            const pct = document.createElement('span');
            pct.className = 'ml-1 text-xs text-gray-500';
            pct.textContent = `(${formatPercent(total > 0 ? (s.value / total) * 100 : 0)})`;
            right.append(pct);

            row.append(left, right);
            return row;
        }),
    );
}

/** Réapplique les couleurs dépendantes du thème après une bascule. */
export function refreshChartTheme() {
    if (!chart) return;
    chart.options.plugins.tooltip = tooltipOptions();
    chart.update();
}
