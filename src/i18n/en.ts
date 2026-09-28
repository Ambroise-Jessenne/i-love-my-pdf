import type { Dict } from './fr';

export const en: Dict = {
  meta: {
    title: 'I Love My P.D.F. — your documents stay with you',
    description:
      'Filter your personal data, merge, split and convert your PDFs right in your browser. Nothing is sent over the Internet.',
  },
  nav: {
    label: 'Main navigation',
    skip: 'Skip to content',
    filter: 'Filter',
    howItWorks: 'How it works',
    switchLang: 'Français',
  },
  footer: {
    license: 'Free software under the MIT license.',
    noTracking: 'No cookies, no trackers, no ads.',
  },
  home: {
    title: 'Your documents never leave your browser.',
    subtitle:
      'Filter your personal data before handing it to an AI, merge, split and convert your PDFs. Everything happens on your device: nothing is sent over the Internet.',
    cta: 'Filter a text',
    ctaSecondary: 'How it works',
    toolsTitle: 'Tools',
    soon: 'Coming soon',
    tools: {
      filter: {
        name: 'Filter my data',
        desc: 'Hide emails, phone numbers, IBANs… before pasting a text into ChatGPT or Claude.',
      },
      merge: { name: 'Merge PDFs', desc: 'Combine several PDFs into a single file.' },
      split: { name: 'Split a PDF', desc: 'Extract pages or cut a PDF into several files.' },
      pdfToWord: { name: 'PDF → Word', desc: 'Get a Word document with editable text.' },
      wordToPdf: { name: 'Word → PDF', desc: 'Turn a Word document into a PDF.' },
    },
    proofsTitle: 'Why you can trust us',
    proofs: [
      {
        title: 'Nothing goes online',
        text: 'Your files are processed by your browser, on your device. No server ever receives them.',
      },
      {
        title: 'Open to everyone',
        text: 'The source code is public under the MIT license: anyone can check what the site does.',
      },
      {
        title: 'Zero trackers',
        text: 'No cookies, no analytics, no ads.',
      },
    ],
  },
  how: {
    title: 'How it works',
    intro: 'Everything you need to know about what this site does with your documents — nothing beyond what you ask.',
    sections: [
      {
        title: 'Everything happens in your browser',
        text: 'When you drop a file, your browser reads it and processes it on your device. It is never sent to a server, not even ours: the site has no processing server.',
      },
      {
        title: 'How to check it yourself',
        text: 'Open your browser’s developer tools (F12 key), go to the “Network” tab, then use a tool: no request carries your data. The site also blocks any connection to another site with a security rule (Content-Security-Policy).',
      },
      {
        title: 'How filtering works',
        text: 'The filter spots personal data with rules: the shape of an email address or phone number, the check digits of an IBAN or a French social security number, and so on. Each item is replaced by a label such as [EMAIL_1]. The same item keeps the same label throughout the text, so an AI can still tell who or what is being discussed.',
      },
      {
        title: 'Its limits',
        text: 'The rules do not recognise people’s names or some unusual formats. Always review the result: you can unmask a detection or mask something that was missed.',
      },
      {
        title: 'No cookies, no trackers',
        text: 'The site sets no cookies and does not measure its audience. It loads nothing from any other site.',
      },
      {
        title: 'Open source',
        text: 'The source code will be published under the MIT license. Anyone will be able to read it, check it and suggest improvements.',
      },
    ],
    acronym: 'And the name? P.D.F. stands for Private Data Filter: a filter for your private data.',
  },
  filter: {
    title: 'Filter your personal data',
    intro:
      'Paste a text or drop a .txt file. Personal data is replaced with labels, so you can then copy the text into an AI tool with peace of mind.',
    warning:
      'Automatic detection does not catch everything, especially people’s names. Always review the result before sharing it.',
    inputLabel: 'Your text',
    inputPlaceholder: 'Paste your text here…',
    dropLabel: 'Or drop a .txt file here',
    dropButton: 'Choose a file',
    analyze: 'Analyse',
    analyzing: 'Analysing…',
    reviewTitle: 'Review the detections',
    reviewHelp:
      'Click a highlighted passage to unmask or re-mask it. To hide something that was missed, select it and click “Mask selection”.',
    maskSelection: 'Mask selection',
    found: '{count} item(s) masked',
    noneFound: 'No personal data detected. Please review your text anyway.',
    scanning: 'Looking for private data…',
    scanLabel: 'Your data is being protected',
    resultReady: 'The filtered text is ready to copy.',
    protectedBadge: 'Protected',
    resultTitle: 'Filtered text',
    copy: 'Copy filtered text',
    copied: 'Copied!',
    download: 'Download filtered document',
    restart: 'Start over',
    defaultFileName: 'text.txt',
    errorFileType: 'This file type is not supported yet. Please use a .txt file.',
    errorGeneric: 'Something went wrong. Your original file has not been changed.',
    types: {
      EMAIL: 'Email',
      TELEPHONE: 'Phone',
      IBAN: 'IBAN',
      NIR: 'Social security no.',
      CARTE_BANCAIRE: 'Bank card',
      DATE: 'Date',
      ADRESSE: 'Address',
      IP: 'IP address',
      URL: 'Link',
      MASQUE: 'Masked by hand',
    },
  },
};
