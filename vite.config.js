import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
    // Chemins relatifs : le site fonctionne aussi bien à la racine d'un domaine
    // que sous un sous-chemin GitHub Pages (/HouseCalculator/).
    base: './',
    plugins: [tailwindcss()],
    build: {
        target: 'es2022',
        // html2canvas-pro et jsPDF ne sont chargés qu'au clic sur « Exporter »
        // (import dynamique dans src/ui/export.js) — d'où les chunks séparés.
        chunkSizeWarningLimit: 700,
    },
    test: {
        environment: 'node',
        include: ['src/**/*.test.js'],
    },
});
