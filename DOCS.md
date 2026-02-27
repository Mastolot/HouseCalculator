# 🏠 HouseCalculator — Documentation Technique

## Vue d'ensemble

Simulateur hypothécaire belge ciblant **Wallonie** et **Bruxelles-Capitale**.
Application single-page HTML avec Tailwind CSS + Chart.js, aucun build nécessaire.

---

## Modèle fiscal belge implémenté

### 1. Droits d'enregistrement

| Région | Taux | Conditions |
|--------|------|-----------|
| **Wallonie** | 3% | Taux réduit habitation propre et unique (réforme janv. 2024) |
| **Bruxelles** | 12,5% | Abattement sur les 200 000 premiers € si prix ≤ 600 000 € |

> ⚠️ **Wallonie — simplification** : le taux de 3% s'applique sans vérification du plafond de prix.
> En réalité, il y a un plafond (~200 000 € base, ajusté selon localisation et enfants à charge).
> Pour Chièvres (zone non tendue), les prix sont généralement sous le plafond → OK pour la plupart des cas.

### 2. Frais de notaire — Acte de vente

Les honoraires suivent le **barème dégressif réglementé belge** (AR 1950, indexé) :

| Tranche | Taux |
|---------|------|
| 0 → 7 500 € | 4,56% |
| 7 500 → 17 500 € | 2,85% |
| 17 500 → 30 000 € | 2,28% |
| 30 000 → 45 495 € | 1,71% |
| 45 495 → 64 095 € | 1,14% |
| 64 095 → 250 095 € | 0,57% |
| > 250 095 € | 0,057% |

**Plus :**
- TVA 21% sur les honoraires
- Frais administratifs et de recherche : ~1 100 €

### 3. Frais d'acte hypothécaire

| Composant | Calcul |
|-----------|--------|
| Droit d'enregistrement sur acte hypothécaire | 1% du montant emprunté |
| Droit d'inscription hypothécaire (conservation) | 0,3% du montant emprunté |
| Honoraires notaire (acte crédit) | Même barème dégressif, appliqué au montant emprunté |
| TVA 21% | Sur les honoraires de l'acte de crédit |
| Frais administratifs | ~850 € |
| Frais de dossier bancaire | ~500 € |

### 4. Calcul itératif des frais

Les frais hypothécaires dépendent du montant emprunté, qui lui-même dépend des frais.
Le modèle résout cette circularité par **3 itérations** :

```
loanAmount₀ = prix + frais_achat - apport
Pour i = 1..3 :
  mortgage_fees = f(loanAmountᵢ₋₁)
  loanAmountᵢ = prix + frais_achat + mortgage_fees - apport
```

Converge en 2-3 itérations (écart < 1 € après 3 tours).

### 5. Quotité (Loan-to-Value / LTV)

```
LTV = montant_emprunté / prix_du_bien × 100%
```

| LTV | Couleur | Signification |
|-----|---------|---------------|
| ≤ 80% | 🟢 Vert | Idéal — meilleures conditions bancaires |
| 80-90% | 🟠 Orange | OK pour premier achat — taux éventuellement majoré |
| > 90% | 🔴 Rouge | Risqué — garanties supplémentaires exigées |
| > 100% | 🔴 Rouge | Refusé par la plupart des banques belges |

### 6. Bonus PEB (Performance Énergétique du Bâtiment)

- Score A ou B → réduction de taux de -0,15%
- Simplifié : en réalité varie selon la banque (certaines offrent -0,10% à -0,25%)

### 7. Seuils d'endettement

| Ratio | Statut |
|-------|--------|
| < 35% + reste à vivre > 1 500 € | ✅ Réalisable |
| 35-45% | ⚠️ Tendu |
| > 45% | 🚫 À risque |

### 8. Revenus complémentaires (vision banque)

- **13ème mois / pécule** : 100% lissé sur 12 mois
- **Bonus annuel** : 60% pris en compte, lissé sur 12 mois
- **Voiture de société** : +450 €/mois de reste à vivre estimé

### 9. Assurance Solde Restant Dû (ASRD)

Activable via un toggle. Calcul basé sur le marché belge (tarifs moyens AG Insurance / Ethias / AXA).

**Paramètres :** âge, fumeur/non-fumeur, couverture (100% ou 50% couple).

**Prime unique estimée** (% du capital, non-fumeur, 100% couverture) :

| Âge | Taux de base |
|-----|-------------|
| ≤ 25 ans | 2,5% |
| 26-30 | 3,5% |
| 31-35 | 5,0% |
| 36-40 | 7,0% |
| 41-45 | 9,5% |
| 46-50 | 13,5% |
| 51-55 | 19,0% |
| 56-60 | 27,0% |
| > 60 | 35,0% |

**Ajustements :**
- Fumeur : +60%
- Durée : facteur `0.70 + 0.30 × (durée / 20)` (normalisé sur 20 ans)
- Couverture 50% : prime divisée par 2

**Intégration :** la prime mensuelle équivalente (prime unique / nb mois) est ajoutée à la mensualité et prise en compte dans le taux d'endettement.

### 10. Comparaison de scénarios

- Jusqu'à 3 scénarios sauvegardés simultanément
- Chaque scénario capture : prix, apport, taux, durée, PEB, région, ASRD, mensualité, endettement, LTV, coût total
- Cards visuelles avec badges colorés (A, B, C)
- Tableau comparatif automatique dès 2 scénarios avec code couleur sur endettement et LTV
- Bouton "Effacer tout" pour reset

---

## Architecture du code

```
index.html          — Application complète (HTML + CSS + JS inline)
DOCS.md             — Cette documentation
```

### Fonctions principales (dans `<script>`)

| Fonction | Rôle |
|----------|------|
| `notaryFeesScale(amount)` | Calcul barème dégressif notaire belge |
| `calcNotaryFees(price)` | Frais complets acte de vente (honoraires + TVA + admin) |
| `calcMortgageDeedFees(loanAmount)` | Frais complets acte hypothécaire |
| `calcRegistrationFees(price, region)` | Droits d'enregistrement selon région |
| `calcASRD(loan, years, age, smoker, coverage)` | Prime ASRD estimée (unique + mensuelle) |
| `calculate()` | Orchestrateur principal — met tout à jour |
| `getAdjustedIncome()` | Revenus ajustés selon vision bancaire |
| `updateFeasibility(ratio, remaining)` | Jauge de faisabilité + couleurs |
| `updateChart(capital, interest, fees, asrd)` | Chart.js doughnut (4 segments si ASRD) |
| `updateFeeBreakdown(data)` | Détail des frais (2 sections : vente + hypothèque) |
| `saveScenario()` | Sauvegarde la simulation courante (max 3) |
| `removeScenario(id)` | Supprime un scénario par ID |
| `clearScenarios()` | Efface tous les scénarios |
| `renderScenarios()` | Affiche les cards + tableau comparatif |

### Variables globales

| Variable | Type | Valeur par défaut |
|----------|------|-------------------|
| `region` | string | `'wallonie'` |
| `pebScore` | string | `'C'` |
| `isDark` | boolean | `true` |
| `chart` | Chart instance | `null` |
| `savedScenarios` | array | `[]` (max 3) |
| `lastCalcResult` | object | `null` |

---

## Améliorations futures possibles

### Haute priorité
1. ~~**Assurance solde restant dû (ASRD)**~~ ✅ Implémenté
2. **Habitation propre et unique** — Ajouter un toggle pour distinguer taux réduit vs taux plein (12,5%). Actuellement on assume toujours le taux réduit.
3. **Plafond de prix Wallonie** — Le taux réduit de 3% est soumis à un plafond (~200 000 € ajusté). Ajouter un input pour le nombre d'enfants à charge pour calculer le plafond exact.

### Moyenne priorité
4. **Neuf vs existant** — Construction neuve = 21% TVA (sur le bâtiment, pas le terrain) au lieu des droits d'enregistrement. Ajouter un toggle neuf/existant avec répartition terrain/bâtiment.
5. **Chèque Habitat (Wallonie)** — Avantage fiscal : jusqu'à 1 520 €/an de réduction d'impôt, dégressif sur 20 ans. Ajouter le calcul et l'afficher comme "économie estimée".
6. **Région flamande** — Ajouter la Flandre (taux d'enregistrement : 3% hab. unique, 12% sinon). Pas prioritaire pour "Back to Chièvres" (Hainaut).
7. **Tableau d'amortissement** — Afficher mois par mois le capital, les intérêts et le solde restant dû.

### Basse priorité
8. ~~**Comparaison de scénarios**~~ ✅ Implémenté
9. **Export PDF** — Générer un résumé imprimable de la simulation.
10. **Taux variable vs fixe** — Simuler un scénario de taux variable avec cap.
11. **Frais de rénovation PEB** — Estimer le coût de rénovation pour passer d'un PEB E/F/G à un PEB B/A.

---

## Sources et références

- Barème notarial : Arrêté Royal du 16 décembre 1950 (indexé)
- Droits d'enregistrement Wallonie : Réforme janvier 2024 — taux réduit à 3%
- Droits d'enregistrement Bruxelles : Ordonnance mai 2023 — abattement 200k€, plafond 600k€
- Droit d'inscription hypothécaire : 0,3% (Code des droits d'enregistrement)
- Droit d'enregistrement acte hypothécaire : 1% (Code des droits d'enregistrement)
- Seuil d'endettement : Norme BNB (Banque Nationale de Belgique) — max 1/3 des revenus

---

*Dernière mise à jour : 27 février 2026*
