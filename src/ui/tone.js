/**
 * Traduction d'un « ton » métier (vert / orange / rouge) en styles.
 *
 * Le ton est décidé par le moteur (`feasibility.tone`, `ltvTone`) et jamais
 * recalculé ici : l'interface se contente de le peindre.
 */
export const TONES = {
    green: {
        text: 'text-green-700 dark:text-green-400',
        hex: '#16a34a',
        border: 'border-green-500/40',
        surface: 'bg-green-500/10 border-green-500/30 text-green-800 dark:text-green-300',
        bar: 'bg-green-500',
        icon: '✅',
    },
    orange: {
        text: 'text-orange-700 dark:text-orange-400',
        hex: '#d97706',
        border: 'border-orange-500/40',
        surface: 'bg-orange-500/10 border-orange-500/30 text-orange-800 dark:text-orange-300',
        bar: 'bg-orange-500',
        icon: '⚠️',
    },
    red: {
        text: 'text-red-700 dark:text-red-400',
        hex: '#dc2626',
        border: 'border-red-500/40',
        surface: 'bg-red-500/10 border-red-500/30 text-red-800 dark:text-red-300',
        bar: 'bg-red-500',
        icon: '🚫',
    },
    neutral: {
        text: 'text-gray-600 dark:text-gray-400',
        hex: '#727d6f',
        border: 'border-gray-200 dark:border-gray-800',
        surface: 'bg-gray-500/10 border-gray-500/30 text-gray-700 dark:text-gray-300',
        bar: 'bg-gray-400',
        icon: 'ℹ️',
    },
};

export function tone(name) {
    return TONES[name] ?? TONES.neutral;
}
