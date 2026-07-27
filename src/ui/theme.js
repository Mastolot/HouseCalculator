const STORAGE_KEY = 'nn-theme';

/**
 * Le thème vit uniquement dans la classe `.dark` de <html>, appliquée avant le
 * premier rendu par le script inline de index.html.
 *
 * La version précédente réécrivait les classes de chaque carte en JavaScript à
 * chaque bascule ; tout contenu rendu dynamiquement gardait donc les couleurs
 * du thème dans lequel il avait été créé. Ici, Tailwind fait le travail via les
 * variants `dark:` et il n'y a plus rien à synchroniser.
 */
export function isDark() {
    return document.documentElement.classList.contains('dark');
}

function persist(dark) {
    try {
        localStorage.setItem(STORAGE_KEY, dark ? 'dark' : 'light');
    } catch {
        /* mode privé : la préférence ne survivra pas au rechargement */
    }
}

/**
 * @param {HTMLElement} button
 * @param {() => void} onChange appelé après bascule (redessin du graphique)
 */
export function initTheme(button, onChange) {
    button.addEventListener('click', () => {
        const dark = document.documentElement.classList.toggle('dark');
        persist(dark);
        onChange?.();
    });

    // Suit la préférence système tant que l'utilisateur n'a pas tranché.
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
        let stored = null;
        try {
            stored = localStorage.getItem(STORAGE_KEY);
        } catch {
            /* ignore */
        }
        if (stored) return;
        document.documentElement.classList.toggle('dark', e.matches);
        onChange?.();
    });
}
