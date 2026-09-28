export const fr = {
  meta: {
    title: 'I Love My P.D.F. — vos documents restent chez vous',
    description:
      'Filtrez vos données personnelles, fusionnez, divisez et convertissez vos PDF directement dans votre navigateur. Rien n’est envoyé sur Internet.',
  },
  nav: {
    label: 'Navigation principale',
    skip: 'Aller au contenu',
    filter: 'Filtrer',
    howItWorks: 'Comment ça marche',
    switchLang: 'English',
  },
  footer: {
    license: 'Logiciel libre sous licence MIT.',
    noTracking: 'Aucun cookie, aucun traceur, aucune publicité.',
  },
  home: {
    title: 'Vos documents ne quittent jamais votre navigateur.',
    subtitle:
      'Filtrez vos données personnelles avant de les confier à une IA, fusionnez, divisez et convertissez vos PDF. Tout se passe sur votre appareil : rien n’est envoyé sur Internet.',
    cta: 'Filtrer un texte',
    ctaSecondary: 'Comment ça marche',
    toolsTitle: 'Les outils',
    soon: 'Bientôt',
    tools: {
      filter: {
        name: 'Filtrer mes données',
        desc: 'Masquez emails, téléphones, IBAN… avant de coller un texte dans ChatGPT ou Claude.',
      },
      merge: { name: 'Fusionner des PDF', desc: 'Assemblez plusieurs PDF en un seul fichier.' },
      split: { name: 'Diviser un PDF', desc: 'Extrayez des pages ou découpez un PDF en plusieurs fichiers.' },
      pdfToWord: { name: 'PDF → Word', desc: 'Obtenez un document Word dont le texte se modifie.' },
      wordToPdf: { name: 'Word → PDF', desc: 'Transformez un document Word en PDF.' },
    },
    proofsTitle: 'Pourquoi vous pouvez nous faire confiance',
    proofs: [
      {
        title: 'Rien ne part sur Internet',
        text: 'Vos fichiers sont traités par votre navigateur, sur votre appareil. Aucun serveur ne les reçoit.',
      },
      {
        title: 'Un code ouvert à tous',
        text: 'Le code source est public, sous licence MIT : chacun peut vérifier ce que fait le site.',
      },
      {
        title: 'Zéro traceur',
        text: 'Pas de cookie, pas de statistiques, pas de publicité.',
      },
    ],
  },
  how: {
    title: 'Comment ça marche',
    intro: 'Tout ce qu’il faut savoir sur ce que fait le site de vos documents — c’est-à-dire rien d’autre que ce que vous lui demandez.',
    sections: [
      {
        title: 'Tout se passe dans votre navigateur',
        text: 'Quand vous déposez un fichier, il est lu par votre navigateur et traité sur votre appareil. Il n’est jamais envoyé à un serveur, pas même au nôtre : le site n’a pas de serveur de traitement.',
      },
      {
        title: 'Comment le vérifier vous-même',
        text: 'Ouvrez les outils de développement de votre navigateur (touche F12), onglet « Réseau », puis utilisez un outil : aucune requête ne part avec vos données. Le site bloque aussi, par une règle de sécurité (Content-Security-Policy), toute connexion vers un autre site.',
      },
      {
        title: 'Comment fonctionne le filtrage',
        text: 'Le filtre repère les données personnelles grâce à des règles : forme d’une adresse email ou d’un numéro de téléphone, clé de contrôle d’un IBAN ou d’un numéro de sécurité sociale, etc. Chaque donnée est remplacée par une étiquette comme [EMAIL_1]. Une même donnée garde la même étiquette dans tout le texte, pour qu’une IA comprenne encore de qui ou de quoi on parle.',
      },
      {
        title: 'Ses limites',
        text: 'Les règles ne reconnaissent pas les noms de personnes ni certains formats inhabituels. Relisez toujours le résultat : vous pouvez démasquer une détection ou masquer un passage oublié.',
      },
      {
        title: 'Pas de cookie, pas de traceur',
        text: 'Le site ne dépose aucun cookie et ne mesure pas son audience. Il ne charge aucune ressource depuis un autre site.',
      },
      {
        title: 'Un code ouvert',
        text: 'Le code source sera publié sous licence MIT. Tout le monde pourra le lire, le vérifier et proposer des améliorations.',
      },
    ],
    acronym: 'Et le nom ? P.D.F. veut dire Private Data Filter : un filtre pour vos données privées.',
  },
  filter: {
    title: 'Filtrer vos données personnelles',
    intro:
      'Collez un texte ou déposez un fichier .txt. Les données personnelles sont remplacées par des étiquettes : vous pouvez ensuite copier le texte vers un outil d’IA en toute tranquillité.',
    warning:
      'La détection automatique ne trouve pas tout, en particulier les noms de personnes. Relisez toujours le résultat avant de le partager.',
    inputLabel: 'Votre texte',
    inputPlaceholder: 'Collez votre texte ici…',
    dropLabel: 'Ou déposez un fichier .txt ici',
    dropButton: 'Choisir un fichier',
    analyze: 'Analyser',
    analyzing: 'Analyse en cours…',
    reviewTitle: 'Vérifiez les détections',
    reviewHelp:
      'Cliquez sur un passage surligné pour le démasquer ou le remasquer. Pour masquer un oubli, sélectionnez-le puis cliquez sur « Masquer la sélection ».',
    maskSelection: 'Masquer la sélection',
    found: '{count} donnée(s) masquée(s)',
    noneFound: 'Aucune donnée personnelle détectée. Relisez quand même votre texte.',
    resultTitle: 'Texte filtré',
    copy: 'Copier le texte filtré',
    copied: 'Copié !',
    download: 'Télécharger le document filtré',
    restart: 'Recommencer',
    defaultFileName: 'texte.txt',
    errorFileType: 'Ce type de fichier n’est pas encore pris en charge. Utilisez un fichier .txt.',
    errorGeneric: 'Une erreur est survenue. Votre fichier d’origine n’a pas été modifié.',
    types: {
      EMAIL: 'Email',
      TELEPHONE: 'Téléphone',
      IBAN: 'IBAN',
      NIR: 'N° de sécurité sociale',
      CARTE_BANCAIRE: 'Carte bancaire',
      DATE: 'Date',
      ADRESSE: 'Adresse',
      IP: 'Adresse IP',
      URL: 'Lien',
      MASQUE: 'Masqué à la main',
    },
  },
};

export type Dict = typeof fr;
