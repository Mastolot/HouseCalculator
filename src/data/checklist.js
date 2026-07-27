/**
 * Checklist d'achat immobilier en Belgique.
 *
 * Sortie du markup pour éviter 200 lignes de HTML répétitif : le contenu se
 * relit et se met à jour ici, le rendu est fait une fois dans l'interface.
 */
export const CHECKLIST = [
    {
        title: 'Avant la visite / Recherche',
        icon: '🔍',
        items: [
            {
                label: 'Définir son budget maximum (simulation ci-dessus !)',
                detail: 'Incluez les frais de notaire, d’enregistrement et le coût de travaux éventuels.',
            },
            {
                label: 'Vérifier la zone d’inondation',
                detail: 'Consultez le Géoportail de Wallonie (aléa d’inondation). Certaines assurances refusent les biens en zone à risque.',
                link: { href: 'https://geoportail.wallonie.be/walonmap', text: 'Géoportail de Wallonie' },
            },
            {
                label: 'Comparer plusieurs offres de crédit',
                detail: 'Consultez au moins 3 banques. Les taux et frais de dossier varient significativement. Le courtier en crédit n’est pas payé par vous en Belgique.',
            },
        ],
    },
    {
        title: 'Lors des visites',
        icon: '🏠',
        items: [
            {
                label: 'Demander le certificat PEB',
                detail: 'Obligatoire pour toute vente et doit figurer dans l’annonce. Vérifiez le score (A à G), son impact sur la consommation et sur le taux proposé par la banque.',
            },
            {
                label: 'Vérifier le contrôle de l’installation électrique (RGIE)',
                detail: 'Le vendeur doit fournir une attestation de conformité. Si l’installation est non conforme, l’acheteur a 18 mois pour la mettre aux normes. Coût moyen : 3 000 à 10 000 €.',
            },
            {
                label: 'Citerne à mazout : demander l’attestation de contrôle',
                detail: 'Un contrôle d’étanchéité est obligatoire. Citerne enterrée : test tous les 3 ans en Wallonie. Budget remplacement : 2 000 à 5 000 €.',
            },
            {
                label: 'Vérifier la présence d’amiante',
                detail: 'Pour les bâtiments d’avant 2001. Pas encore obligatoire à la vente en Wallonie (contrairement à la Flandre) mais fortement recommandé. Désamiantage toiture : 30 à 60 €/m².',
            },
            {
                label: 'Demander le précompte immobilier annuel',
                detail: 'Taxe foncière régionale et communale. En Wallonie, comptez généralement 800 à 2 500 €/an selon la commune et le revenu cadastral.',
            },
            {
                label: 'Copropriété : demander les PV des 3 dernières AG',
                detail: 'Vérifiez les travaux votés, le fonds de réserve, les charges courantes et les litiges éventuels. Le syndic doit fournir ces documents.',
            },
        ],
    },
    {
        title: 'Offre & compromis de vente',
        icon: '📝',
        items: [
            {
                label: 'L’offre d’achat vous engage juridiquement',
                detail: 'En droit belge, une offre acceptée par le vendeur vaut vente. Prévoyez toujours une condition suspensive de crédit et un délai de validité.',
            },
            {
                label: 'Condition suspensive d’obtention du crédit',
                detail: 'Indispensable. Prévoyez 45 à 60 jours. Sans cette clause, vous devez acheter même si la banque refuse. Faites rédiger le compromis par votre notaire (service gratuit).',
            },
            {
                label: 'Acompte de 5 à 10 % au compromis',
                detail: 'Versé sur le compte tiers du notaire, jamais au vendeur directement. Cet argent doit être disponible à la signature du compromis.',
            },
            {
                label: 'Renseignements urbanistiques',
                detail: 'Le notaire les demande à la commune : permis en ordre, absence d’infraction, absence de plan d’expropriation. Demandez aussi les servitudes éventuelles.',
            },
            {
                label: 'Attestation de sol (BDES / Bruxelles Environnement)',
                detail: 'Obligatoire dans les 3 régions. En Wallonie, le notaire consulte la Banque de Données de l’État des Sols pour vérifier une éventuelle pollution.',
            },
            {
                label: 'DIU — Dossier d’Intervention Ultérieure',
                detail: 'Obligatoire depuis 2001. Recense les travaux réalisés (plans, matériaux, câblages). À défaut, un coordinateur sécurité doit l’établir.',
            },
        ],
    },
    {
        title: 'Crédit & acte authentique',
        icon: '🏦',
        items: [
            {
                label: 'Délai de réflexion de 14 jours minimum',
                detail: 'Loi sur le crédit hypothécaire : après réception de l’offre de la banque, vous disposez d’au moins 14 jours pour l’accepter ou la refuser.',
            },
            {
                label: 'Négocier les frais de dossier bancaire',
                detail: 'Les frais de dossier (250 à 500 €) sont souvent négociables, surtout si vous domiciliez vos revenus. Demandez aussi l’effet d’une assurance incendie groupée sur le taux.',
            },
            {
                label: 'Assurance incendie obligatoire',
                detail: 'Exigée pour tout crédit hypothécaire. Comparez les primes. La banque peut la proposer, mais vous restez libre de votre assureur.',
            },
            {
                label: 'Acte authentique dans les ~4 mois',
                detail: 'Signé chez le notaire : transfert officiel de propriété, paiement des droits d’enregistrement et inscription de l’hypothèque. Vous choisissez votre notaire sans surcoût.',
            },
        ],
    },
    {
        title: 'Après l’achat',
        icon: '🔑',
        items: [
            {
                label: 'Changement de domicile à la commune',
                detail: 'Obligatoire dans les 8 jours du déménagement. Nécessaire pour l’assurance, la fiscalité régionale et les primes éventuelles.',
            },
            {
                label: 'Transfert des compteurs (eau, gaz, électricité)',
                detail: 'Relevez les index le jour de la remise des clés, puis contactez le fournisseur d’énergie et le distributeur d’eau.',
            },
            {
                label: 'Mise en conformité électrique (si nécessaire)',
                detail: 'Si l’attestation RGIE mentionne des infractions, vous avez 18 mois à partir de l’acte pour régulariser et refaire passer le contrôle.',
            },
            {
                label: 'Budget récurrent annuel',
                detail: 'Précompte immobilier, assurance incendie, entretien annuel de la chaudière (obligatoire), ramonage, charges de copropriété. Comptez 2 000 à 4 000 €/an minimum.',
            },
        ],
    },
];
