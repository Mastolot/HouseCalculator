# 🪺 Nouveau Nid — Modèle de calcul

Référence du modèle fiscal et financier. Pour l'architecture du code et les commandes,
voir le [README](README.md).

Tous les paramètres décrits ici vivent dans [`src/lib/params.js`](src/lib/params.js) —
c'est le seul endroit à modifier quand un taux change.

---

## 1. Droits d'enregistrement

| Région | Habitation propre et unique | Sinon |
| --- | --- | --- |
| **Wallonie** | 3 % | 12,5 % |
| **Bruxelles** | 12,5 %, abattement de 200 000 € si prix ≤ 600 000 € | 12,5 % |

**Wallonie** — le taux réduit est passé de 12,5 % à 3 % au 1ᵉʳ janvier 2025 ;
l'abattement de 40 000 € a été supprimé au même moment. Les conditions
(domiciliation dans les 3 ans, absence d'autre bien en pleine propriété) ne sont pas
vérifiées par le simulateur : c'est la case « Hab. propre » qui les représente.

**Bruxelles** — l'abattement porte sur la base imposable, pas sur le montant dû :
l'économie maximale est de 200 000 × 12,5 % = 25 000 €. Effet de seuil réel à
600 000 € : un euro de plus fait perdre l'intégralité de l'abattement.

---

## 2. Honoraires notariaux

Barème dégressif par tranches (AR du 16 décembre 1950, indexé). Chaque tranche n'est
appliquée qu'à la part du montant qui la traverse.

| Tranche | Taux |
| --- | --- |
| 0 → 7 500 € | 4,56 % |
| 7 500 → 17 500 € | 2,85 % |
| 17 500 → 30 000 € | 2,28 % |
| 30 000 → 45 495 € | 1,71 % |
| 45 495 → 64 095 € | 1,14 % |
| 64 095 → 250 095 € | 0,57 % |
| au-delà | 0,057 % |

S'y ajoutent la TVA de 21 % sur les honoraires et un forfait de recherches et frais
administratifs (1 100 € pour l'acte de vente, 850 € pour l'acte de crédit).

---

## 3. Acte hypothécaire

| Composant | Calcul |
| --- | --- |
| Droit d'enregistrement | 1 % du capital emprunté |
| Droit d'inscription hypothécaire | 0,3 % du capital emprunté |
| Honoraires notaire | même barème dégressif, appliqué au capital emprunté |
| TVA | 21 % sur ces honoraires |
| Frais administratifs | 850 € |
| Frais de dossier bancaire | 500 € (souvent négociables) |

---

## 4. Résolution de la circularité

Les frais d'acte hypothécaire dépendent du capital emprunté, qui dépend lui-même de
ces frais. Le modèle résout ce point fixe par itération :

```
capital₀   = prix + frais_achat − apport
capitalₙ₊₁ = prix + frais_achat + frais_hypothécaires(capitalₙ)
             + prime_assurance(capitalₙ) − apport
```

L'itération s'arrête quand deux tours consécutifs diffèrent de moins d'un centime
(100 tours au maximum, jamais atteints en pratique). Le facteur de contraction — de
l'ordre de 1,3 % de frais, jusqu'à 35 % si la prime d'assurance est financée — reste
très inférieur à 1, la suite converge donc géométriquement, en 3 à 6 tours.

La version précédente s'arrêtait après exactement 3 tours, sans mesurer le résidu.

---

## 5. Quotité (loan-to-value)

`LTV = capital emprunté ÷ prix du bien`

| LTV | Ton | Lecture |
| --- | --- | --- |
| ≤ 80 % | 🟢 | Idéal, meilleures conditions bancaires |
| 80 – 90 % | 🟠 | Correct pour un premier achat |
| 90 – 100 % | 🔴 | Taux majoré et garanties supplémentaires probables |
| > 100 % | 🔴 | Refusé par la quasi-totalité des banques belges |

> ⚠️ Le modèle finance les frais d'acte dans le prêt. En pratique, une banque belge
> prête sur le prix et les frais se paient comptant : les quotités affichées sont donc
> supérieures à celles qu'appliquerait un analyste crédit.

---

## 6. Seuils d'endettement

Les banques belges tolèrent un ratio d'autant plus élevé que le reste à vivre est
confortable. Le seuil est donc indexé sur le revenu, la norme BNB (≈ 1/3) servant de
repère bas.

| Revenu mensuel | Seuil vert | Seuil orange | Reste à vivre minimum |
| --- | --- | --- | --- |
| ≥ 6 000 € | 45 % | 50 % | 1 200 € |
| ≥ 4 000 € | 42 % | 48 % | 1 400 € |
| ≥ 2 500 € | 38 % | 45 % | 1 500 € |
| < 2 500 € | 33 % | 40 % | 1 500 € |

Le verdict est rendu par `assessFeasibility()` et par elle seule. Cartes de scénario,
tableau comparatif, jauge, barre mobile et export consomment tous ce même verdict —
la version précédente recalculait des seuils codés en dur à quatre endroits, et un
même dossier pouvait ressortir vert dans une carte et orange dans la jauge.

Deux états sortent de l'échelle de couleurs :

- **Revenu manquant** — à revenu nul, le ratio n'a pas de sens. L'ancienne version
  affichait « projet tendu » ; le simulateur demande maintenant le revenu.
- **Aucun financement nécessaire** — l'apport couvre le prix et les frais.

---

## 7. Revenus complémentaires

| Élément | Prise en compte |
| --- | --- |
| 13ᵉ mois / pécule | 100 %, lissé sur 12 mois |
| Bonus annuel | 50 %, lissé sur 12 mois (non garanti) |
| Chèques repas | part patronale × 20 jours ouvrables |
| Voiture de société | +200 €/mois |

Pondérations volontairement conservatrices : la pratique varie d'un établissement à
l'autre.

---

## 8. Bonus PEB

Score A ou B → −0,15 % sur le taux, avec un plancher à 0,10 %.

> ⚠️ **Estimation, pas un barème.** La pratique va de −0,10 % à −0,25 % selon la banque
> et l'époque, et certaines ne l'appliquent plus. Affiché comme hypothèse, jamais
> comme un fait.

---

## 9. Assurance solde restant dû

Prime unique estimée, en pourcentage du capital assuré :

| Âge | Taux de base |
| --- | --- |
| ≤ 25 ans | 2,5 % |
| 26 – 30 | 3,5 % |
| 31 – 35 | 5,0 % |
| 36 – 40 | 7,0 % |
| 41 – 45 | 9,5 % |
| 46 – 50 | 13,5 % |
| 51 – 55 | 19,0 % |
| 56 – 60 | 27,0 % |
| > 60 | 35,0 % |

Ajustements : fumeur +60 % · durée `0,70 + 0,30 × (durée / 20)` · couverture 50 % en couple.

> ⚠️ Ordres de grandeur agrégés depuis des simulateurs publics du marché belge, pas un
> tarif contractuel. L'écart avec une offre ferme peut dépasser 30 %.

### Mode de paiement

Une prime unique se paie **en une fois**. Deux traitements cohérents sont proposés :

| Mode | Effet |
| --- | --- |
| **Financée dans le crédit** | La prime s'ajoute au capital emprunté. La mensualité et la quotité augmentent ; le coût des intérêts la couvre naturellement. |
| **Payée comptant** | La prime sort de l'épargne le jour de l'acte. Aucune charge mensuelle, donc aucun effet sur le taux d'endettement. |

Dans les deux cas, la prime n'apparaît qu'une fois dans le coût total de l'opération.

La version précédente divisait la prime unique par le nombre de mois et ajoutait le
résultat à la mensualité **et** au taux d'endettement, sans jamais la financer ni la
déduire de l'épargne : elle gonflait artificiellement le ratio tout en étant payée
avec de l'argent qui n'existait nulle part dans le modèle. L'« équivalent mensuel »
reste affiché, mais à titre purement indicatif.

---

## 10. Comparaison de scénarios

Jusqu'à 3 scénarios simultanés. Au-delà, le plus ancien est remplacé — et le
simulateur le dit désormais explicitement, là où l'ancienne version l'écrasait en
silence en annonçant toujours la même lettre.

---

## Sources

- Barème notarial : Arrêté royal du 16 décembre 1950 (indexé) — [notaire.be](https://www.notaire.be)
- Droits d'enregistrement wallons : réforme du 1ᵉʳ janvier 2025 — [fiscalite.wallonie.be](https://fiscalite.wallonie.be)
- Abattement bruxellois : ordonnance du 16 mars 2023 — [fiscalite.brussels](https://fiscalite.brussels)
- Droits sur acte hypothécaire : Code des droits d'enregistrement
- Norme d'endettement : Banque Nationale de Belgique

*Paramètres vérifiés le 27 juillet 2026 (`LAST_VERIFIED` dans `params.js`).*
