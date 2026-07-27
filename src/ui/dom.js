/** Sélecteur court. */
export const $ = (selector, root = document) => root.querySelector(selector);
export const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

/**
 * Construit un élément.
 *
 * Tout passe par `textContent` : aucune chaîne interpolée n'est jamais
 * interprétée comme du HTML, ce qui ferme par construction la porte à
 * l'injection le jour où un champ libre apparaîtra dans l'interface.
 *
 * @param {string} tag
 * @param {object} attrs classes, dataset, style, écouteurs (`onclick`), attributs
 * @param  {...(Node|string|null|false)} children
 */
export function h(tag, attrs = {}, ...children) {
    const el = document.createElement(tag);

    for (const [key, value] of Object.entries(attrs)) {
        if (value == null || value === false) continue;

        if (key === 'class') el.className = value;
        else if (key === 'text') el.textContent = value;
        else if (key === 'style') Object.assign(el.style, value);
        else if (key === 'dataset') Object.assign(el.dataset, value);
        else if (key.startsWith('on')) el.addEventListener(key.slice(2).toLowerCase(), value);
        else el.setAttribute(key, value === true ? '' : value);
    }

    for (const child of children.flat()) {
        if (child == null || child === false) continue;
        el.append(child instanceof Node ? child : document.createTextNode(String(child)));
    }
    return el;
}

/** Affiche/masque un bloc en gardant `aria-expanded` cohérent sur le bouton. */
export function toggleDisclosure(button, panel) {
    const open = panel.classList.toggle('hidden');
    button.setAttribute('aria-expanded', String(!open));
}

/** Toast éphémère. */
export function showToast(message) {
    const toast = h('div', {
        class: 'toast border border-gray-200 bg-white text-gray-900 shadow-lg dark:border-gray-700 dark:bg-gray-800 dark:text-white',
        role: 'status',
        text: message,
    });
    $('#toastContainer').append(toast);
    setTimeout(() => toast.classList.add('out'), 2000);
    setTimeout(() => toast.remove(), 2400);
}
