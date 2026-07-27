# 🪺 Nouveau Nid

Simulateur de crédit hypothécaire belge — Wallonie et Bruxelles-Capitale.

Calcule la mensualité, les droits d'enregistrement, les frais de notaire, la quotité (LTV)
et le taux d'endettement, avec comparaison de scénarios et export PNG/PDF.

> Simulation indicative. Ne constitue ni une offre de crédit, ni un conseil financier.

## Démarrer

```bash
npm install
npm run dev
```

| Commande | Effet |
| --- | --- |
| `npm run dev` | Serveur de développement Vite |
| `npm run build` | Build de production dans `dist/` |
| `npm run preview` | Sert le build de production |
| `npm test` | Suite de tests Vitest |
| `npm run test:watch` | Tests en mode watch |

## Architecture

```
src/
  lib/          Moteur de calcul — fonctions pures, aucun accès au DOM
    params.js   Source de vérité unique des paramètres fiscaux (datés, sourcés)
    fees.js     Droits d'enregistrement, barème notarial, frais d'acte
    credit.js   Mensualité, intérêts, bonus PEB, appréciation de la quotité
    insurance.js Assurance solde restant dû
    income.js   Revenu ajusté, seuils d'endettement, verdict de faisabilité
    simulate.js Orchestrateur : simulate(input) → résultat complet
    format.js   Formatage localisé fr-BE
  ui/           Couche d'affichage — lit le résultat, ne calcule rien
  data/         Contenu éditorial (checklist d'achat)
  main.js       Câblage des entrées et du rendu
```

La règle qui tient l'ensemble : **le moteur décide, l'interface peint**. Aucun seuil,
aucun taux, aucune couleur conditionnelle n'est recalculé dans `ui/` — sinon deux
endroits finissent par diverger, ce qui est précisément ce qui était arrivé aux
seuils d'endettement de la version précédente.

## Paramètres fiscaux

Tous les nombres fiscaux vivent dans [`src/lib/params.js`](src/lib/params.js), avec
leur source et leur date de vérification. C'est le seul fichier à mettre à jour
lorsqu'un taux change.

Points à revérifier périodiquement :

- Droits d'enregistrement wallons (3 % habitation propre et unique depuis le 1ᵉʳ janvier 2025)
- Abattement bruxellois (200 000 € sous un plafond de prix de 600 000 €)
- Tranches du barème notarial (AR du 16 décembre 1950, indexées)

Deux paramètres sont des **estimations de marché**, pas des barèmes officiels, et sont
signalés comme tels dans l'interface : le bonus de taux PEB et la prime d'assurance
solde restant dû.

## Tests

```bash
npm test
```

La suite couvre le barème notarial tranche par tranche (valeurs calculées à la main),
la convergence du point fixe frais ↔ capital emprunté, les seuils adaptatifs, et une
série de régressions sur les cas limites (revenu nul, apport supérieur au prix,
quotité au-delà de 100 %, assurance financée ou payée comptant).

## Limites connues

- **Flandre non couverte** — seules la Wallonie et Bruxelles sont modélisées.
- **Frais financés dans le prêt** — le modèle ajoute les frais d'acte au capital
  emprunté. En pratique, une banque belge prête sur le prix et les frais se paient
  comptant ; les quotités affichées sont donc plus élevées que la réalité bancaire.
- **Crédits en cours non pris en compte** — le taux d'endettement ne compte que la
  nouvelle mensualité, alors qu'une banque additionne toutes les charges.
- **Pas de TAEG** — seul le taux nominal est affiché.
- Interface en français uniquement.

## Licence

MIT — voir [LICENSE](LICENSE).
