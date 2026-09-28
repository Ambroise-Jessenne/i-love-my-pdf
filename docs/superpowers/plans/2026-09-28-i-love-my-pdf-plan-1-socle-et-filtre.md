# I Love My P.D.F. — Plan 1 : socle du site et outil « Filtrer »

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Livrer un premier prototype local du site I Love My P.D.F. : pages FR/EN (accueil, comment ça marche), charte « Chaleureux & Accessible », et l'outil Filtrer complet (texte collé ou fichier .txt → détection → relecture → copie ou téléchargement), sans aucune requête vers un autre site.

**Architecture:** Site statique Astro avec un îlot React par outil. La logique métier vit dans `src/core/` (TypeScript pur, testé avec Vitest, sans DOM). Les traitements passent par un Web Worker exposé avec Comlink. Les composants React ne font que de l'affichage. Une Content-Security-Policy interdit toute connexion vers une autre origine, et un test Playwright le vérifie.

**Tech Stack:** Astro, React 19, TypeScript, Comlink, Vitest, Playwright. CSS natif avec design tokens.

**Spec de référence :** `docs/superpowers/specs/2026-09-28-i-love-my-pdf-design.md`

**Feuille de route (plans suivants, hors de ce document) :**
- Plan 2 : Fusionner et Diviser des PDF (pdf-lib, pdf.js, fflate).
- Plan 3 : PDF → Word et Word → PDF (pdf.js, docx, mammoth.js).
- Plan 4 : Filtrer des fichiers DOCX et PDF.
- Plan 5 : page À propos / Soutenir, finitions, README, CONTRIBUTING, publication GitHub.

**Environnement :** Windows, PowerShell, à la racine du projet `C:\Bureau\IA\PROJETS\I Love My Private Data Filter`. Toutes les commandes `npm`/`npx`/`git` ci-dessous fonctionnent telles quelles en PowerShell.

---

## Structure des fichiers créés par ce plan

```
.gitignore
package.json
astro.config.mjs
tsconfig.json
vitest.config.ts
playwright.config.ts
public/favicon.svg
docs/detection.md                         Limites connues du moteur de détection
src/core/detect/types.ts                  Types PiiType, Detection, Rule
src/core/detect/resolve.ts                Résolution des chevauchements
src/core/detect/detect.ts                 runRules() et detect()
src/core/detect/rules/index.ts            Liste RULES
src/core/detect/rules/email.ts
src/core/detect/rules/url.ts
src/core/detect/rules/ip.ts
src/core/detect/rules/phone.ts
src/core/detect/rules/iban.ts             + isValidIban()
src/core/detect/rules/nir.ts              + isValidNir()
src/core/detect/rules/card.ts             + passesLuhn()
src/core/detect/rules/date.ts
src/core/detect/rules/address.ts
src/core/redact/redact.ts                 redact() et addManual()
src/core/files/names.ts                   filteredName()
src/workers/filter.worker.ts              Worker exposant detect/redact
src/workers/filterClient.ts               Accès paresseux au worker
src/i18n/fr.ts, en.ts, index.ts           Textes FR/EN
src/styles/tokens.css                     Design tokens (clair + sombre)
src/styles/global.css                     Styles de base
src/layouts/BaseLayout.astro              En-tête, pied, CSP
src/pages/index.astro                     Redirection vers /fr/
src/pages/[lang]/index.astro              Accueil
src/pages/[lang]/how-it-works.astro       Comment ça marche
src/pages/[lang]/filter.astro             Page de l'outil Filtrer
src/components/ui/ui.css
src/components/ui/DropZone.tsx
src/components/ui/Notice.tsx
src/components/ui/download.ts
src/components/tools/filter/FilterTool.tsx
src/components/tools/filter/HighlightedText.tsx
src/components/tools/filter/selection.ts
src/components/tools/filter/filter.css
e2e/site.spec.ts
e2e/filter.spec.ts
.claude/launch.json
```

Tests unitaires : à côté du fichier testé (`*.test.ts`).

---

### Task 0 : Vérifications préalables

**Files:** aucun

- [ ] **Step 1 : Vérifier Node**

Run: `node --version`
Expected: `v22.x` ou supérieur. Sinon, installer Node 22 LTS avant de continuer.

- [ ] **Step 2 : Vérifier le dépôt Git**

Run: `git status`
Expected : dépôt existant, cahier des charges commité. Si la commande répond « not a git repository », exécuter :

```
git init
git add docs/superpowers/specs/2026-09-28-i-love-my-pdf-design.md
git commit -m "docs: add I Love My P.D.F. design spec"
```

---

### Task 1 : Squelette Astro + React + TypeScript + Vitest

**Files:**
- Create: `.gitignore`, `package.json`, `astro.config.mjs`, `tsconfig.json`, `vitest.config.ts`, `public/favicon.svg`, `src/pages/index.astro`

- [ ] **Step 1 : Créer `.gitignore`**

```
.superpowers/
node_modules/
dist/
.astro/
test-results/
playwright-report/
```

- [ ] **Step 2 : Créer `package.json`**

```json
{
  "name": "i-love-my-pdf",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "license": "MIT",
  "scripts": {
    "dev": "astro dev",
    "build": "astro build",
    "preview": "astro preview",
    "check": "astro check",
    "test": "vitest run",
    "test:e2e": "playwright test"
  }
}
```

- [ ] **Step 3 : Installer les dépendances**

Run:
```
npm install astro @astrojs/react react react-dom comlink
npm install -D typescript @astrojs/check @types/react @types/react-dom vitest @playwright/test
npx playwright install chromium
```
Expected : installation sans erreur (des avertissements `npm warn` sont acceptables).

- [ ] **Step 4 : Créer `astro.config.mjs`**

```js
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';

export default defineConfig({
  integrations: [react()],
  vite: {
    worker: { format: 'es' },
  },
});
```

- [ ] **Step 5 : Créer `tsconfig.json`**

```json
{
  "extends": "astro/tsconfigs/strict",
  "include": [".astro/types.d.ts", "**/*"],
  "exclude": ["dist"],
  "compilerOptions": {
    "jsx": "react-jsx",
    "jsxImportSource": "react"
  }
}
```

- [ ] **Step 6 : Créer `vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
  },
});
```

- [ ] **Step 7 : Créer `public/favicon.svg`**

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><circle cx="16" cy="16" r="16" fill="#e07a5f"/><path d="M16 24s-7-4.4-7-9.2A3.8 3.8 0 0 1 16 12.6a3.8 3.8 0 0 1 7 2.2C23 19.6 16 24 16 24z" fill="#fff8f2"/></svg>
```

- [ ] **Step 8 : Créer une page provisoire `src/pages/index.astro`**

```astro
<h1>I Love My P.D.F.</h1>
```

- [ ] **Step 9 : Vérifier que le site se construit**

Run: `npm run build`
Expected : se termine par un message de succès (« Complete! ») et crée `dist/index.html`.

- [ ] **Step 10 : Commit**

```
git add .gitignore package.json package-lock.json astro.config.mjs tsconfig.json vitest.config.ts public/favicon.svg src/pages/index.astro
git commit -m "chore: scaffold Astro + React + TypeScript + Vitest"
```

---

### Task 2 : Types de détection et résolution des chevauchements

**Files:**
- Create: `src/core/detect/types.ts`, `src/core/detect/resolve.ts`, `src/core/detect/detect.ts`, `src/core/detect/rules/index.ts`
- Test: `src/core/detect/resolve.test.ts`, `src/core/detect/detect.test.ts`

- [ ] **Step 1 : Créer `src/core/detect/types.ts`**

```ts
export type PiiType =
  | 'EMAIL'
  | 'TELEPHONE'
  | 'IBAN'
  | 'NIR'
  | 'CARTE_BANCAIRE'
  | 'DATE'
  | 'ADRESSE'
  | 'IP'
  | 'URL'
  | 'MASQUE';

export interface Detection {
  id: string;
  type: PiiType;
  start: number;
  end: number;
  value: string;
}

export interface Rule {
  type: PiiType;
  /** Must carry the `g` flag. */
  pattern: RegExp;
  /** Breaks ties between detections of identical length. */
  priority: number;
  validate?: (match: string) => boolean;
}
```

- [ ] **Step 2 : Écrire le test qui échoue `src/core/detect/resolve.test.ts`**

```ts
import { describe, expect, it } from 'vitest';
import type { PiiType } from './types';
import { resolveOverlaps, type Candidate } from './resolve';

const c = (type: PiiType, start: number, end: number, priority = 0): Candidate => ({
  id: `${type}-${start}-${end}`,
  type,
  start,
  end,
  value: 'x'.repeat(end - start),
  priority,
});

describe('resolveOverlaps', () => {
  it('keeps non-overlapping candidates sorted by position', () => {
    const result = resolveOverlaps([c('EMAIL', 10, 20), c('IP', 0, 5)]);
    expect(result.map((d) => d.id)).toEqual(['IP-0-5', 'EMAIL-10-20']);
  });

  it('keeps the longest candidate when two overlap', () => {
    const result = resolveOverlaps([c('CARTE_BANCAIRE', 5, 21, 99), c('IBAN', 0, 27, 1)]);
    expect(result.map((d) => d.id)).toEqual(['IBAN-0-27']);
  });

  it('uses priority when overlapping candidates have the same length', () => {
    const result = resolveOverlaps([c('CARTE_BANCAIRE', 0, 15, 60), c('NIR', 0, 15, 70)]);
    expect(result.map((d) => d.id)).toEqual(['NIR-0-15']);
  });

  it('keeps candidates that only touch each other', () => {
    const result = resolveOverlaps([c('EMAIL', 0, 5), c('URL', 5, 9)]);
    expect(result).toHaveLength(2);
  });

  it('removes the priority field from the output', () => {
    const [only] = resolveOverlaps([c('EMAIL', 0, 5)]);
    expect(only).toEqual({ id: 'EMAIL-0-5', type: 'EMAIL', start: 0, end: 5, value: 'xxxxx' });
  });
});
```

- [ ] **Step 3 : Lancer le test pour le voir échouer**

Run: `npx vitest run src/core/detect/resolve.test.ts`
Expected: FAIL — `Failed to resolve import "./resolve"`.

- [ ] **Step 4 : Créer `src/core/detect/resolve.ts`**

```ts
import type { Detection } from './types';

export interface Candidate extends Detection {
  priority: number;
}

export function resolveOverlaps(candidates: Candidate[]): Detection[] {
  const ordered = [...candidates].sort(
    (a, b) => b.end - b.start - (a.end - a.start) || b.priority - a.priority || a.start - b.start,
  );
  const kept: Candidate[] = [];
  for (const candidate of ordered) {
    const overlaps = kept.some((k) => candidate.start < k.end && k.start < candidate.end);
    if (!overlaps) kept.push(candidate);
  }
  return kept
    .sort((a, b) => a.start - b.start)
    .map(({ id, type, start, end, value }) => ({ id, type, start, end, value }));
}
```

- [ ] **Step 5 : Lancer le test**

Run: `npx vitest run src/core/detect/resolve.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 6 : Écrire le test qui échoue `src/core/detect/detect.test.ts`**

```ts
import { describe, expect, it } from 'vitest';
import type { Rule } from './types';
import { runRules } from './detect';

describe('runRules', () => {
  const digits: Rule = {
    type: 'IP',
    priority: 1,
    pattern: /\d+/g,
    validate: (m) => m !== '0',
  };

  it('returns one detection per validated match, with positions', () => {
    expect(runRules('a 12 b 0 c 345', [digits])).toEqual([
      { id: 'IP-2-4', type: 'IP', start: 2, end: 4, value: '12' },
      { id: 'IP-11-14', type: 'IP', start: 11, end: 14, value: '345' },
    ]);
  });

  it('returns nothing for an empty text', () => {
    expect(runRules('', [digits])).toEqual([]);
  });
});
```

- [ ] **Step 7 : Lancer le test pour le voir échouer**

Run: `npx vitest run src/core/detect/detect.test.ts`
Expected: FAIL — `Failed to resolve import "./detect"`.

- [ ] **Step 8 : Créer `src/core/detect/rules/index.ts`**

```ts
import type { Rule } from '../types';

export const RULES: Rule[] = [];
```

- [ ] **Step 9 : Créer `src/core/detect/detect.ts`**

```ts
import type { Detection, Rule } from './types';
import { resolveOverlaps, type Candidate } from './resolve';
import { RULES } from './rules';

export function runRules(text: string, rules: Rule[]): Detection[] {
  const candidates: Candidate[] = [];
  for (const rule of rules) {
    for (const match of text.matchAll(rule.pattern)) {
      const value = match[0];
      if (rule.validate && !rule.validate(value)) continue;
      const start = match.index ?? 0;
      const end = start + value.length;
      candidates.push({
        id: `${rule.type}-${start}-${end}`,
        type: rule.type,
        start,
        end,
        value,
        priority: rule.priority,
      });
    }
  }
  return resolveOverlaps(candidates);
}

export function detect(text: string): Detection[] {
  return runRules(text, RULES);
}
```

- [ ] **Step 10 : Lancer tous les tests**

Run: `npm test`
Expected: PASS (7 tests).

- [ ] **Step 11 : Commit**

```
git add src/core/detect
git commit -m "feat(detect): add detection types, rule runner and overlap resolution"
```

---

### Task 3 : Règles email, URL et adresse IP

**Files:**
- Create: `src/core/detect/rules/email.ts`, `src/core/detect/rules/url.ts`, `src/core/detect/rules/ip.ts`
- Modify: `src/core/detect/rules/index.ts`
- Test: `src/core/detect/rules/web.test.ts`

- [ ] **Step 1 : Écrire le test qui échoue `src/core/detect/rules/web.test.ts`**

```ts
import { describe, expect, it } from 'vitest';
import type { Rule } from '../types';
import { runRules } from '../detect';
import { emailRule } from './email';
import { urlRule } from './url';
import { ipRule } from './ip';

const values = (text: string, rule: Rule) => runRules(text, [rule]).map((d) => d.value);

describe('emailRule', () => {
  it('finds email addresses without trailing punctuation', () => {
    expect(values('Écrivez à jean.dupont@exemple.fr.', emailRule)).toEqual(['jean.dupont@exemple.fr']);
  });

  it('finds several addresses', () => {
    expect(values('a@b.io et marie+test@sous.domaine.org', emailRule)).toEqual([
      'a@b.io',
      'marie+test@sous.domaine.org',
    ]);
  });

  it('ignores a lone at sign', () => {
    expect(values('rendez-vous @ midi', emailRule)).toEqual([]);
  });
});

describe('urlRule', () => {
  it('finds http(s) links without trailing punctuation', () => {
    expect(values('Voir https://exemple.fr/page?id=3. Merci', urlRule)).toEqual(['https://exemple.fr/page?id=3']);
  });

  it('finds www links', () => {
    expect(values('Site : www.site.com, bientôt', urlRule)).toEqual(['www.site.com']);
  });
});

describe('ipRule', () => {
  it('finds IPv4 addresses', () => {
    expect(values('Serveur 192.168.1.42 ok', ipRule)).toEqual(['192.168.1.42']);
  });

  it('ignores impossible addresses', () => {
    expect(values('999.1.1.1 et 192.168.1.420', ipRule)).toEqual([]);
  });
});
```

- [ ] **Step 2 : Lancer le test pour le voir échouer**

Run: `npx vitest run src/core/detect/rules/web.test.ts`
Expected: FAIL — `Failed to resolve import "./email"`.

- [ ] **Step 3 : Créer `src/core/detect/rules/email.ts`**

```ts
import type { Rule } from '../types';

export const emailRule: Rule = {
  type: 'EMAIL',
  priority: 45,
  pattern: /[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}/g,
};
```

- [ ] **Step 4 : Créer `src/core/detect/rules/url.ts`**

```ts
import type { Rule } from '../types';

export const urlRule: Rule = {
  type: 'URL',
  priority: 50,
  pattern: /\b(?:https?:\/\/|www\.)[^\s<>"']*[^\s<>"'.,;:!?)\]]/g,
};
```

- [ ] **Step 5 : Créer `src/core/detect/rules/ip.ts`**

```ts
import type { Rule } from '../types';

const OCTET = '(?:25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]?\\d)';

export const ipRule: Rule = {
  type: 'IP',
  priority: 20,
  pattern: new RegExp(`\\b${OCTET}(?:\\.${OCTET}){3}\\b`, 'g'),
};
```

- [ ] **Step 6 : Remplacer `src/core/detect/rules/index.ts`**

```ts
import type { Rule } from '../types';
import { emailRule } from './email';
import { urlRule } from './url';
import { ipRule } from './ip';

export const RULES: Rule[] = [urlRule, emailRule, ipRule];
```

- [ ] **Step 7 : Lancer tous les tests**

Run: `npm test`
Expected: PASS (14 tests).

- [ ] **Step 8 : Commit**

```
git add src/core/detect/rules
git commit -m "feat(detect): detect emails, URLs and IPv4 addresses"
```

---

### Task 4 : Règle téléphone

**Files:**
- Create: `src/core/detect/rules/phone.ts`
- Modify: `src/core/detect/rules/index.ts`
- Test: `src/core/detect/rules/phone.test.ts`

- [ ] **Step 1 : Écrire le test qui échoue `src/core/detect/rules/phone.test.ts`**

```ts
import { describe, expect, it } from 'vitest';
import { runRules } from '../detect';
import { phoneRule } from './phone';

const values = (text: string) => runRules(text, [phoneRule]).map((d) => d.value);

describe('phoneRule', () => {
  it.each([
    ['Appelez le 06 12 34 56 78 demain', '06 12 34 56 78'],
    ['Tél : +33 6 12 34 56 78', '+33 6 12 34 56 78'],
    ['Fixe 01.23.45.67.89', '01.23.45.67.89'],
    ['Portable 0612345678', '0612345678'],
    ['Depuis la Belgique : 0033 1 23 45 67 89', '0033 1 23 45 67 89'],
    ['Londres : +44 20 7946 0958', '+44 20 7946 0958'],
    ['San Francisco : +1 415 555 2671', '+1 415 555 2671'],
  ])('finds the number in %j', (text, expected) => {
    expect(values(text)).toEqual([expected]);
  });

  it('ignores short numbers', () => {
    expect(values('Commande 12345, lot 06 12')).toEqual([]);
  });
});
```

- [ ] **Step 2 : Lancer le test pour le voir échouer**

Run: `npx vitest run src/core/detect/rules/phone.test.ts`
Expected: FAIL — `Failed to resolve import "./phone"`.

- [ ] **Step 3 : Créer `src/core/detect/rules/phone.ts`**

```ts
import type { Rule } from '../types';

const FRENCH = String.raw`(?<![\w+])(?:(?:\+|00)33[\s.-]?[1-9]|0[1-9])(?:[\s.-]?\d{2}){4}(?!\d)`;
const INTERNATIONAL = String.raw`(?<![\w+])\+(?!33)[1-9]\d{0,2}(?:[\s.-]?\d{2,4}){2,5}(?!\d)`;

export const phoneRule: Rule = {
  type: 'TELEPHONE',
  priority: 40,
  pattern: new RegExp(`${FRENCH}|${INTERNATIONAL}`, 'g'),
};
```

- [ ] **Step 4 : Remplacer `src/core/detect/rules/index.ts`**

```ts
import type { Rule } from '../types';
import { emailRule } from './email';
import { urlRule } from './url';
import { ipRule } from './ip';
import { phoneRule } from './phone';

export const RULES: Rule[] = [urlRule, emailRule, phoneRule, ipRule];
```

- [ ] **Step 5 : Lancer tous les tests**

Run: `npm test`
Expected: PASS (22 tests).

- [ ] **Step 6 : Commit**

```
git add src/core/detect/rules
git commit -m "feat(detect): detect French and international phone numbers"
```

---

### Task 5 : Règle IBAN avec clé de contrôle

**Files:**
- Create: `src/core/detect/rules/iban.ts`
- Modify: `src/core/detect/rules/index.ts`
- Test: `src/core/detect/rules/iban.test.ts`

- [ ] **Step 1 : Écrire le test qui échoue `src/core/detect/rules/iban.test.ts`**

```ts
import { describe, expect, it } from 'vitest';
import { runRules } from '../detect';
import { ibanRule, isValidIban } from './iban';

const values = (text: string) => runRules(text, [ibanRule]).map((d) => d.value);

describe('isValidIban', () => {
  it('accepts valid IBANs', () => {
    expect(isValidIban('FR76 3000 6000 0112 3456 7890 189')).toBe(true);
    expect(isValidIban('DE89370400440532013000')).toBe(true);
  });

  it('rejects a wrong check digit', () => {
    expect(isValidIban('FR76 3000 6000 0112 3456 7890 188')).toBe(false);
  });

  it('rejects malformed input', () => {
    expect(isValidIban('FR76')).toBe(false);
  });
});

describe('ibanRule', () => {
  it('finds a spaced IBAN and stops before the next word', () => {
    expect(values('IBAN : FR76 3000 6000 0112 3456 7890 189 EUR')).toEqual(['FR76 3000 6000 0112 3456 7890 189']);
  });

  it('finds a compact IBAN', () => {
    expect(values('iban FR7630006000011234567890189.')).toEqual(['FR7630006000011234567890189']);
  });

  it('finds a German IBAN', () => {
    expect(values('Konto DE89 3704 0044 0532 0130 00')).toEqual(['DE89 3704 0044 0532 0130 00']);
  });

  it('ignores an IBAN with a wrong check digit', () => {
    expect(values('FR76 3000 6000 0112 3456 7890 188')).toEqual([]);
  });
});
```

- [ ] **Step 2 : Lancer le test pour le voir échouer**

Run: `npx vitest run src/core/detect/rules/iban.test.ts`
Expected: FAIL — `Failed to resolve import "./iban"`.

- [ ] **Step 3 : Créer `src/core/detect/rules/iban.ts`**

```ts
import type { Rule } from '../types';

export function isValidIban(raw: string): boolean {
  const iban = raw.replace(/\s/g, '').toUpperCase();
  if (!/^[A-Z]{2}\d{2}[A-Z0-9]{11,30}$/.test(iban)) return false;
  const rearranged = iban.slice(4) + iban.slice(0, 4);
  let remainder = 0;
  for (const ch of rearranged) {
    const digits = ch >= 'A' && ch <= 'Z' ? String(ch.charCodeAt(0) - 55) : ch;
    for (const digit of digits) remainder = (remainder * 10 + Number(digit)) % 97;
  }
  return remainder === 1;
}

export const ibanRule: Rule = {
  type: 'IBAN',
  priority: 80,
  pattern: /\b[A-Z]{2}\d{2}(?: ?[A-Z0-9]{4}){2,7}(?: ?[A-Z0-9]{1,4})?\b/g,
  validate: isValidIban,
};
```

- [ ] **Step 4 : Remplacer `src/core/detect/rules/index.ts`**

```ts
import type { Rule } from '../types';
import { emailRule } from './email';
import { urlRule } from './url';
import { ipRule } from './ip';
import { phoneRule } from './phone';
import { ibanRule } from './iban';

export const RULES: Rule[] = [ibanRule, urlRule, emailRule, phoneRule, ipRule];
```

- [ ] **Step 5 : Lancer tous les tests**

Run: `npm test`
Expected: PASS (29 tests).

- [ ] **Step 6 : Commit**

```
git add src/core/detect/rules
git commit -m "feat(detect): detect IBANs with mod-97 validation"
```

---

### Task 6 : Numéro de sécurité sociale (NIR) et carte bancaire

**Files:**
- Create: `src/core/detect/rules/nir.ts`, `src/core/detect/rules/card.ts`
- Modify: `src/core/detect/rules/index.ts`
- Test: `src/core/detect/rules/numbers.test.ts`

- [ ] **Step 1 : Écrire le test qui échoue `src/core/detect/rules/numbers.test.ts`**

```ts
import { describe, expect, it } from 'vitest';
import { runRules } from '../detect';
import { isValidNir, nirRule } from './nir';
import { cardRule, passesLuhn } from './card';

describe('isValidNir', () => {
  it('accepts a NIR whose key matches', () => {
    expect(isValidNir('1 85 05 78 006 084 91')).toBe(true);
  });

  it('rejects a wrong key', () => {
    expect(isValidNir('1 85 05 78 006 084 36')).toBe(false);
  });
});

describe('nirRule', () => {
  const values = (text: string) => runRules(text, [nirRule]).map((d) => d.value);

  it('finds a spaced NIR', () => {
    expect(values('N° SS : 1 85 05 78 006 084 91.')).toEqual(['1 85 05 78 006 084 91']);
  });

  it('finds a compact NIR', () => {
    expect(values('nir 185057800608491')).toEqual(['185057800608491']);
  });

  it('ignores a NIR with a wrong key', () => {
    expect(values('1 85 05 78 006 084 36')).toEqual([]);
  });
});

describe('passesLuhn', () => {
  it('accepts a valid card number', () => {
    expect(passesLuhn('4111111111111111')).toBe(true);
  });

  it('rejects an invalid card number', () => {
    expect(passesLuhn('4111111111111112')).toBe(false);
  });
});

describe('cardRule', () => {
  const values = (text: string) => runRules(text, [cardRule]).map((d) => d.value);

  it.each([
    ['Carte 4111 1111 1111 1111 exp', '4111 1111 1111 1111'],
    ['Carte 4111-1111-1111-1111', '4111-1111-1111-1111'],
    ['MC 5555555555554444', '5555555555554444'],
  ])('finds the card in %j', (text, expected) => {
    expect(values(text)).toEqual([expected]);
  });

  it('ignores a number failing the Luhn check', () => {
    expect(values('4111 1111 1111 1112')).toEqual([]);
  });
});
```

- [ ] **Step 2 : Lancer le test pour le voir échouer**

Run: `npx vitest run src/core/detect/rules/numbers.test.ts`
Expected: FAIL — `Failed to resolve import "./nir"`.

- [ ] **Step 3 : Créer `src/core/detect/rules/nir.ts`**

```ts
import type { Rule } from '../types';

export function isValidNir(raw: string): boolean {
  const nir = raw.replace(/\s/g, '').toUpperCase();
  if (!/^[12]\d{4}(?:\d{2}|2A|2B)\d{8}$/.test(nir)) return false;
  // Corsican départements 2A/2B are replaced by 19/18 to compute the key.
  const body = nir.slice(0, 13).replace('2A', '19').replace('2B', '18');
  let remainder = 0;
  for (const digit of body) remainder = (remainder * 10 + Number(digit)) % 97;
  return 97 - remainder === Number(nir.slice(13));
}

export const nirRule: Rule = {
  type: 'NIR',
  priority: 70,
  pattern: /\b[12] ?\d{2} ?\d{2} ?(?:\d{2}|2[AB]) ?\d{3} ?\d{3} ?\d{2}\b/g,
  validate: isValidNir,
};
```

- [ ] **Step 4 : Créer `src/core/detect/rules/card.ts`**

```ts
import type { Rule } from '../types';

export function passesLuhn(digits: string): boolean {
  let sum = 0;
  for (let i = 0; i < digits.length; i++) {
    let d = Number(digits[digits.length - 1 - i]);
    if (i % 2 === 1) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
  }
  return sum % 10 === 0;
}

export const cardRule: Rule = {
  type: 'CARTE_BANCAIRE',
  priority: 60,
  pattern: /\b\d(?:[ -]?\d){12,18}\b/g,
  validate: (match) => {
    const digits = match.replace(/\D/g, '');
    return digits.length >= 13 && digits.length <= 19 && passesLuhn(digits);
  },
};
```

- [ ] **Step 5 : Remplacer `src/core/detect/rules/index.ts`**

```ts
import type { Rule } from '../types';
import { emailRule } from './email';
import { urlRule } from './url';
import { ipRule } from './ip';
import { phoneRule } from './phone';
import { ibanRule } from './iban';
import { nirRule } from './nir';
import { cardRule } from './card';

export const RULES: Rule[] = [ibanRule, nirRule, cardRule, urlRule, emailRule, phoneRule, ipRule];
```

- [ ] **Step 6 : Lancer tous les tests**

Run: `npm test`
Expected: PASS (40 tests).

- [ ] **Step 7 : Commit**

```
git add src/core/detect/rules
git commit -m "feat(detect): detect French social security and card numbers"
```

---

### Task 7 : Dates et adresses postales

**Files:**
- Create: `src/core/detect/rules/date.ts`, `src/core/detect/rules/address.ts`
- Modify: `src/core/detect/rules/index.ts`
- Test: `src/core/detect/rules/text.test.ts`

- [ ] **Step 1 : Écrire le test qui échoue `src/core/detect/rules/text.test.ts`**

```ts
import { describe, expect, it } from 'vitest';
import { runRules } from '../detect';
import { dateRules } from './date';
import { addressRules } from './address';

describe('dateRules', () => {
  const values = (text: string) => runRules(text, dateRules).map((d) => d.value);

  it.each([
    ['né le 12/03/1985 à Lyon', '12/03/1985'],
    ['le 12.03.1985', '12.03.1985'],
    ['date ISO 1985-03-12', '1985-03-12'],
    ['le 12 mars 1985', '12 mars 1985'],
    ['depuis le 1er janvier 2000', '1er janvier 2000'],
    ['born March 12, 1985', 'March 12, 1985'],
  ])('finds the date in %j', (text, expected) => {
    expect(values(text)).toEqual([expected]);
  });

  it('ignores impossible months', () => {
    expect(values('12/13/1985')).toEqual([]);
  });
});

describe('addressRules', () => {
  const values = (text: string) => runRules(text, addressRules).map((d) => d.value);

  it('finds a full address with postcode and city', () => {
    expect(values("J'habite au 12 rue de la Paix, 75002 Paris depuis 2010")).toEqual([
      '12 rue de la Paix, 75002 Paris',
    ]);
  });

  it('handles bis/ter and compound city names', () => {
    expect(values('Siège : 12 bis boulevard Saint-Michel 75005 Paris.')).toEqual([
      '12 bis boulevard Saint-Michel 75005 Paris',
    ]);
  });

  it('finds a street without postcode', () => {
    expect(values('au 3 avenue Victor Hugo.')).toEqual(['3 avenue Victor Hugo']);
  });

  it('ignores numbers that are not addresses', () => {
    expect(values("J'ai 3 chats et 2 chiens")).toEqual([]);
  });
});
```

- [ ] **Step 2 : Lancer le test pour le voir échouer**

Run: `npx vitest run src/core/detect/rules/text.test.ts`
Expected: FAIL — `Failed to resolve import "./date"`.

- [ ] **Step 3 : Créer `src/core/detect/rules/date.ts`**

```ts
import type { Rule } from '../types';

const DAY = '(?:0?[1-9]|[12]\\d|3[01])';
const MONTH = '(?:0?[1-9]|1[0-2])';
const YEAR = '(?:19|20)\\d{2}';
const FR_MONTHS =
  'janvier|février|fevrier|mars|avril|mai|juin|juillet|août|aout|septembre|octobre|novembre|décembre|decembre';
const EN_MONTHS = 'January|February|March|April|May|June|July|August|September|October|November|December';

const date = (source: string, flags = 'g'): Rule => ({
  type: 'DATE',
  priority: 30,
  pattern: new RegExp(source, flags),
});

export const dateRules: Rule[] = [
  date(`\\b${DAY}[/.-]${MONTH}[/.-]${YEAR}\\b`),
  date(`\\b${YEAR}-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12]\\d|3[01])\\b`),
  date(`\\b(?:1er|${DAY}) (?:${FR_MONTHS}) ${YEAR}\\b`, 'gi'),
  date(`\\b(?:${EN_MONTHS}) ${DAY}(?:st|nd|rd|th)?,? ${YEAR}\\b`, 'gi'),
];
```

- [ ] **Step 4 : Créer `src/core/detect/rules/address.ts`**

```ts
import type { Rule } from '../types';

const NUMBER = '\\b\\d{1,4}(?: ?(?:bis|ter))?,? ';
const STREET_TYPE =
  '(?:[Rr]ue|[Aa]venue|[Aa]v\\.|[Bb]oulevard|[Bb]d|[Pp]lace|[Cc]hemin|[Aa]ll[ée]e|[Ii]mpasse|[Rr]oute|[Qq]uai|[Cc]ours|[Ss]quare)';
const WORD = "[A-Za-zÀ-ÿ'’-]+";
const CITY = `[A-ZÀ-Þ]${WORD}(?: [A-ZÀ-Þ]${WORD})*`;

const address = (source: string): Rule => ({
  type: 'ADRESSE',
  priority: 90,
  pattern: new RegExp(source, 'g'),
});

export const addressRules: Rule[] = [
  // Full address: street, postcode and city.
  address(`${NUMBER}${STREET_TYPE} [^\\n,]{2,60}?,? \\d{5} ${CITY}`),
  // Street only: number, street type and up to four words.
  address(`${NUMBER}${STREET_TYPE} ${WORD}(?: ${WORD}){0,3}`),
];
```

- [ ] **Step 5 : Remplacer `src/core/detect/rules/index.ts`**

```ts
import type { Rule } from '../types';
import { emailRule } from './email';
import { urlRule } from './url';
import { ipRule } from './ip';
import { phoneRule } from './phone';
import { ibanRule } from './iban';
import { nirRule } from './nir';
import { cardRule } from './card';
import { dateRules } from './date';
import { addressRules } from './address';

export const RULES: Rule[] = [
  ...addressRules,
  ibanRule,
  nirRule,
  cardRule,
  urlRule,
  emailRule,
  phoneRule,
  ...dateRules,
  ipRule,
];
```

- [ ] **Step 6 : Lancer tous les tests**

Run: `npm test`
Expected: PASS (51 tests).

- [ ] **Step 7 : Commit**

```
git add src/core/detect/rules
git commit -m "feat(detect): detect dates and French postal addresses"
```

---

### Task 8 : Corpus synthétique et limites documentées

**Files:**
- Test: `src/core/detect/corpus.test.ts`
- Create: `docs/detection.md`

- [ ] **Step 1 : Écrire le test `src/core/detect/corpus.test.ts`**

```ts
import { describe, expect, it } from 'vitest';
import type { PiiType } from './types';
import { detect } from './detect';

const CORPUS = [
  'Bonjour, je suis joignable à jean.dupont@exemple.fr ou au 06 12 34 56 78.',
  'Mon collègue : +44 20 7946 0958.',
  'IBAN : FR76 3000 6000 0112 3456 7890 189.',
  'N° de sécurité sociale : 1 85 05 78 006 084 91.',
  'Carte : 4111 1111 1111 1111.',
  'Né le 12/03/1985, embauché le 1er janvier 2010.',
  'Adresse : 12 rue de la Paix, 75002 Paris.',
  'Serveur : 192.168.1.42, site : https://exemple.fr/contact.',
].join('\n');

const EXPECTED: Array<{ type: PiiType; value: string }> = [
  { type: 'EMAIL', value: 'jean.dupont@exemple.fr' },
  { type: 'TELEPHONE', value: '06 12 34 56 78' },
  { type: 'TELEPHONE', value: '+44 20 7946 0958' },
  { type: 'IBAN', value: 'FR76 3000 6000 0112 3456 7890 189' },
  { type: 'NIR', value: '1 85 05 78 006 084 91' },
  { type: 'CARTE_BANCAIRE', value: '4111 1111 1111 1111' },
  { type: 'DATE', value: '12/03/1985' },
  { type: 'DATE', value: '1er janvier 2010' },
  { type: 'ADRESSE', value: '12 rue de la Paix, 75002 Paris' },
  { type: 'IP', value: '192.168.1.42' },
  { type: 'URL', value: 'https://exemple.fr/contact' },
];

describe('detect on the synthetic corpus', () => {
  const found = detect(CORPUS).map(({ type, value }) => ({ type, value }));

  it.each(EXPECTED)('finds $type $value', (expected) => {
    expect(found).toContainEqual(expected);
  });

  it('finds nothing else', () => {
    expect(found).toHaveLength(EXPECTED.length);
  });
});
```

- [ ] **Step 2 : Lancer le test**

Run: `npx vitest run src/core/detect/corpus.test.ts`
Expected: PASS (12 tests). Si un cas échoue, corriger la règle concernée dans `src/core/detect/rules/` (ne pas modifier le corpus), relancer `npm test`, puis continuer.

- [ ] **Step 3 : Créer `docs/detection.md`**

```markdown
# Moteur de détection — fonctionnement et limites

Le filtre repère les données personnelles avec des règles (expressions régulières et clés de contrôle). Il ne comprend pas le sens du texte.

## Données reconnues

| Étiquette | Exemples | Contrôle supplémentaire |
|---|---|---|
| EMAIL | jean.dupont@exemple.fr | — |
| TELEPHONE | 06 12 34 56 78, +33 6 12 34 56 78, +44 20 7946 0958 | — |
| IBAN | FR76 3000 6000 0112 3456 7890 189 | clé modulo 97 |
| NIR | 1 85 05 78 006 084 91 | clé de contrôle |
| CARTE_BANCAIRE | 4111 1111 1111 1111 | algorithme de Luhn |
| DATE | 12/03/1985, 1985-03-12, 12 mars 1985, March 12, 1985 | — |
| ADRESSE | 12 rue de la Paix, 75002 Paris | — |
| IP | 192.168.1.42 | — |
| URL | https://exemple.fr/contact, www.site.com | — |

## Ce que le filtre ne trouve pas

- Les noms et prénoms de personnes.
- Les noms d'entreprises, de lieux ou de villes cités seuls.
- Les adresses sans numéro ni type de voie reconnu (« lieu-dit Les Pins »).
- Les numéros de téléphone écrits dans un format inhabituel (« 06-1234-5678 »).
- Les identifiants étrangers autres que les IBAN (numéros fiscaux, passeports, etc.).

## Faux positifs connus

- Toutes les dates sont masquées, pas seulement les dates de naissance.
- Un numéro de version à quatre parties (« 1.2.3.4 ») est pris pour une adresse IP.
- Une suite de 13 à 19 chiffres qui respecte l'algorithme de Luhn est prise pour une carte bancaire.
- L'adresse « sans code postal » peut englober jusqu'à quatre mots après le type de voie (« 3 rue Victor Hugo et »).

L'utilisateur peut démasquer un faux positif ou masquer un oubli à la main avant d'exporter.
```

- [ ] **Step 4 : Lancer tous les tests**

Run: `npm test`
Expected: PASS (63 tests).

- [ ] **Step 5 : Commit**

```
git add src/core/detect/corpus.test.ts docs/detection.md
git commit -m "test(detect): add synthetic corpus and document detection limits"
```

---

### Task 9 : Remplacement par étiquettes et masquage manuel

**Files:**
- Create: `src/core/redact/redact.ts`
- Test: `src/core/redact/redact.test.ts`

- [ ] **Step 1 : Écrire le test qui échoue `src/core/redact/redact.test.ts`**

```ts
import { describe, expect, it } from 'vitest';
import type { Detection, PiiType } from '../detect/types';
import { detect } from '../detect/detect';
import { addManual, redact } from './redact';

const at = (text: string, type: PiiType, value: string, from = 0): Detection => {
  const start = text.indexOf(value, from);
  return { id: `${type}-${start}`, type, start, end: start + value.length, value };
};

describe('redact', () => {
  it('replaces detections with numbered labels per type', () => {
    const text = 'a@x.fr puis b@x.fr et 06 12 34 56 78';
    const detections = [at(text, 'EMAIL', 'a@x.fr'), at(text, 'EMAIL', 'b@x.fr'), at(text, 'TELEPHONE', '06 12 34 56 78')];
    expect(redact(text, detections)).toBe('[EMAIL_1] puis [EMAIL_2] et [TELEPHONE_1]');
  });

  it('gives the same label to the same value', () => {
    const text = 'A@x.fr, a@x.fr, 06 12 34 56 78 et 0612345678';
    const detections = [
      at(text, 'EMAIL', 'A@x.fr'),
      at(text, 'EMAIL', 'a@x.fr'),
      at(text, 'TELEPHONE', '06 12 34 56 78'),
      at(text, 'TELEPHONE', '0612345678'),
    ];
    expect(redact(text, detections)).toBe('[EMAIL_1], [EMAIL_1], [TELEPHONE_1] et [TELEPHONE_1]');
  });

  it('returns the text unchanged without detections', () => {
    expect(redact('rien à masquer', [])).toBe('rien à masquer');
  });

  it('skips a detection that overlaps an earlier one', () => {
    const text = 'abcdefghij';
    const first: Detection = { id: '1', type: 'MASQUE', start: 0, end: 6, value: 'abcdef' };
    const second: Detection = { id: '2', type: 'MASQUE', start: 4, end: 8, value: 'efgh' };
    expect(redact(text, [second, first])).toBe('[MASQUE_1]ghij');
  });

  it('leaves none of the detected values in the output', () => {
    const text = 'Mail jean@exemple.fr, IBAN FR76 3000 6000 0112 3456 7890 189, tel 06 12 34 56 78.';
    const detections = detect(text);
    const output = redact(text, detections);
    for (const d of detections) expect(output).not.toContain(d.value);
    expect(output).toBe('Mail [EMAIL_1], IBAN [IBAN_1], tel [TELEPHONE_1].');
  });
});

describe('addManual', () => {
  const text = 'Rendez-vous avec Marie Curie demain';

  it('adds a MASQUE detection for the selected range', () => {
    const start = text.indexOf('Marie');
    const result = addManual([], text, start, start + 'Marie Curie'.length);
    expect(result).toEqual([
      { id: `MASQUE-${start}-${start + 11}`, type: 'MASQUE', start, end: start + 11, value: 'Marie Curie' },
    ]);
  });

  it('accepts a reversed selection', () => {
    const start = text.indexOf('Marie');
    const [manual] = addManual([], text, start + 5, start);
    expect(manual.value).toBe('Marie');
  });

  it('ignores an empty selection', () => {
    expect(addManual([], text, 4, 4)).toEqual([]);
  });

  it('absorbs detections it overlaps', () => {
    const existing: Detection = { id: 'x', type: 'DATE', start: 5, end: 10, value: text.slice(5, 10) };
    const result = addManual([existing], text, 8, 15);
    expect(result).toEqual([
      { id: 'MASQUE-5-15', type: 'MASQUE', start: 5, end: 15, value: text.slice(5, 15) },
    ]);
  });
});
```

- [ ] **Step 2 : Lancer le test pour le voir échouer**

Run: `npx vitest run src/core/redact/redact.test.ts`
Expected: FAIL — `Failed to resolve import "./redact"`.

- [ ] **Step 3 : Créer `src/core/redact/redact.ts`**

```ts
import type { Detection, PiiType } from '../detect/types';

const COMPACT_TYPES: PiiType[] = ['TELEPHONE', 'IBAN', 'CARTE_BANCAIRE', 'NIR'];

function normalize(type: PiiType, value: string): string {
  if (COMPACT_TYPES.includes(type)) return value.replace(/[^A-Za-z0-9+]/g, '').toUpperCase();
  return value.trim().replace(/\s+/g, ' ').toLowerCase();
}

export function redact(text: string, detections: Detection[]): string {
  const sorted = [...detections].sort((a, b) => a.start - b.start);
  const counters = new Map<PiiType, number>();
  const labels = new Map<string, string>();
  let output = '';
  let cursor = 0;
  for (const d of sorted) {
    if (d.start < cursor) continue;
    const key = `${d.type}:${normalize(d.type, d.value)}`;
    let label = labels.get(key);
    if (!label) {
      const n = (counters.get(d.type) ?? 0) + 1;
      counters.set(d.type, n);
      label = `[${d.type}_${n}]`;
      labels.set(key, label);
    }
    output += text.slice(cursor, d.start) + label;
    cursor = d.end;
  }
  return output + text.slice(cursor);
}

export function addManual(detections: Detection[], text: string, from: number, to: number): Detection[] {
  let start = Math.min(from, to);
  let end = Math.max(from, to);
  if (start === end) return detections;
  const kept: Detection[] = [];
  for (const d of detections) {
    if (d.start < end && start < d.end) {
      start = Math.min(start, d.start);
      end = Math.max(end, d.end);
    } else {
      kept.push(d);
    }
  }
  const manual: Detection = { id: `MASQUE-${start}-${end}`, type: 'MASQUE', start, end, value: text.slice(start, end) };
  return [...kept, manual].sort((a, b) => a.start - b.start);
}
```

- [ ] **Step 4 : Lancer tous les tests**

Run: `npm test`
Expected: PASS (72 tests).

- [ ] **Step 5 : Commit**

```
git add src/core/redact
git commit -m "feat(redact): replace detections with consistent labels and support manual masks"
```

---

### Task 10 : Nom du fichier filtré

**Files:**
- Create: `src/core/files/names.ts`
- Test: `src/core/files/names.test.ts`

- [ ] **Step 1 : Écrire le test qui échoue `src/core/files/names.test.ts`**

```ts
import { describe, expect, it } from 'vitest';
import { filteredName } from './names';

describe('filteredName', () => {
  it.each([
    ['note.txt', 'note_prv.txt'],
    ['contrat.final.txt', 'contrat.final_prv.txt'],
    ['README', 'README_prv.txt'],
    ['.env', '.env_prv.txt'],
    ['', 'texte_prv.txt'],
  ])('%j → %j', (input, expected) => {
    expect(filteredName(input)).toBe(expected);
  });
});
```

- [ ] **Step 2 : Lancer le test pour le voir échouer**

Run: `npx vitest run src/core/files/names.test.ts`
Expected: FAIL — `Failed to resolve import "./names"`.

- [ ] **Step 3 : Créer `src/core/files/names.ts`**

```ts
export function filteredName(original: string): string {
  const dot = original.lastIndexOf('.');
  if (dot <= 0) return `${original || 'texte'}_prv.txt`;
  return `${original.slice(0, dot)}_prv${original.slice(dot)}`;
}
```

- [ ] **Step 4 : Lancer tous les tests**

Run: `npm test`
Expected: PASS (77 tests).

- [ ] **Step 5 : Commit**

```
git add src/core/files
git commit -m "feat(files): name filtered files with the _prv suffix"
```

---

### Task 11 : Web Worker du filtrage

**Files:**
- Create: `src/workers/filter.worker.ts`, `src/workers/filterClient.ts`

Le worker n'a pas de test unitaire (Vitest tourne sous Node, sans Worker). Il est couvert par les tests Playwright de la Task 16.

- [ ] **Step 1 : Créer `src/workers/filter.worker.ts`**

```ts
import { expose } from 'comlink';
import { detect } from '../core/detect/detect';
import { redact } from '../core/redact/redact';

const api = { detect, redact };

export type FilterApi = typeof api;

expose(api);
```

- [ ] **Step 2 : Créer `src/workers/filterClient.ts`**

```ts
import { wrap, type Remote } from 'comlink';
import type { FilterApi } from './filter.worker';

let api: Remote<FilterApi> | undefined;

export function getFilterApi(): Remote<FilterApi> {
  api ??= wrap<FilterApi>(new Worker(new URL('./filter.worker.ts', import.meta.url), { type: 'module' }));
  return api;
}
```

- [ ] **Step 3 : Vérifier les types**

Run: `npm run check`
Expected : `0 errors`.

- [ ] **Step 4 : Commit**

```
git add src/workers
git commit -m "feat(workers): run detection and redaction in a Web Worker"
```

---

### Task 12 : Textes FR/EN, design tokens et gabarit de page

**Files:**
- Create: `src/i18n/fr.ts`, `src/i18n/en.ts`, `src/i18n/index.ts`, `src/styles/tokens.css`, `src/styles/global.css`, `src/layouts/BaseLayout.astro`

- [ ] **Step 1 : Créer `src/i18n/fr.ts`**

```ts
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
```

- [ ] **Step 2 : Créer `src/i18n/en.ts`**

```ts
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
```

- [ ] **Step 3 : Créer `src/i18n/index.ts`**

```ts
import { fr, type Dict } from './fr';
import { en } from './en';

export const LANGS = ['fr', 'en'] as const;
export type Lang = (typeof LANGS)[number];

const DICTS: Record<Lang, Dict> = { fr, en };

export function getDict(lang: Lang): Dict {
  return DICTS[lang];
}

export function otherLang(lang: Lang): Lang {
  return lang === 'fr' ? 'en' : 'fr';
}

export function langPaths() {
  return LANGS.map((lang) => ({ params: { lang } }));
}
```

- [ ] **Step 4 : Créer `src/styles/tokens.css`**

```css
/* Design tokens — edit here to restyle the whole site. */
:root {
  --color-bg: #fdf6ec;
  --color-surface: #fffaf3;
  --color-surface-raised: #ffffff;
  --color-text: #3a2e28;
  --color-text-muted: #6f5f54;
  --color-border: #ead9c6;
  --color-accent: #b04e33;
  --color-accent-soft: #e07a5f;
  --color-accent-contrast: #ffffff;
  --color-highlight: #f6d5c8;
  --color-highlight-off: #efe7dd;
  --color-warning-bg: #fff1d6;
  --color-warning-text: #6b4a00;

  --radius-sm: 8px;
  --radius-md: 14px;
  --radius-lg: 24px;
  --radius-pill: 999px;

  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-5: 24px;
  --space-6: 32px;
  --space-7: 48px;
  --space-8: 64px;

  --font-body: ui-rounded, 'SF Pro Rounded', 'Segoe UI', system-ui, -apple-system, sans-serif;
  --font-size-sm: 0.875rem;
  --font-size-md: 1rem;
  --font-size-lg: 1.25rem;
  --font-size-xl: 1.75rem;
  --font-size-2xl: clamp(2rem, 5vw, 2.75rem);

  --shadow-soft: 0 6px 24px rgb(58 46 40 / 0.08);
  --max-width: 1080px;
}

@media (prefers-color-scheme: dark) {
  :root {
    --color-bg: #231b17;
    --color-surface: #2e2520;
    --color-surface-raised: #382d27;
    --color-text: #f5ebe1;
    --color-text-muted: #c9b8a8;
    --color-border: #4a3c33;
    --color-accent: #f0957a;
    --color-accent-soft: #c2593c;
    --color-accent-contrast: #231b17;
    --color-highlight: #6e3b2c;
    --color-highlight-off: #3a302a;
    --color-warning-bg: #3d3016;
    --color-warning-text: #f3d9a4;
    --shadow-soft: 0 6px 24px rgb(0 0 0 / 0.3);
  }
}
```

- [ ] **Step 5 : Créer `src/styles/global.css`**

```css
*,
*::before,
*::after {
  box-sizing: border-box;
}

html {
  color-scheme: light dark;
}

body {
  margin: 0;
  background: var(--color-bg);
  color: var(--color-text);
  font-family: var(--font-body);
  font-size: var(--font-size-md);
  line-height: 1.6;
}

h1,
h2,
h3 {
  line-height: 1.25;
  margin: 0 0 var(--space-3);
}

h1 {
  font-size: var(--font-size-2xl);
}

h2 {
  font-size: var(--font-size-xl);
}

h3 {
  font-size: var(--font-size-lg);
}

p {
  margin: 0 0 var(--space-3);
}

a {
  color: var(--color-accent);
}

:focus-visible {
  outline: 3px solid var(--color-accent);
  outline-offset: 2px;
}

.container {
  width: min(100% - 2 * var(--space-4), var(--max-width));
  margin-inline: auto;
}

.lead {
  font-size: var(--font-size-lg);
  color: var(--color-text-muted);
  max-width: 60ch;
}

.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  padding: var(--space-3) var(--space-5);
  border: 2px solid var(--color-accent);
  border-radius: var(--radius-pill);
  background: var(--color-accent);
  color: var(--color-accent-contrast);
  font: inherit;
  font-weight: 600;
  text-decoration: none;
  cursor: pointer;
  transition: transform 120ms ease;
}

.btn:hover {
  transform: translateY(-1px);
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none;
}

.btn-secondary {
  background: transparent;
  color: var(--color-accent);
}

.btn-ghost {
  background: transparent;
  border-color: transparent;
  color: var(--color-text-muted);
}

.skip-link {
  position: absolute;
  left: -9999px;
}

.skip-link:focus {
  left: var(--space-4);
  top: var(--space-4);
  z-index: 10;
  padding: var(--space-2) var(--space-4);
  border-radius: var(--radius-sm);
  background: var(--color-surface-raised);
}

.site-header {
  padding: var(--space-4) 0;
}

.header-inner {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-4);
}

.logo {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  color: var(--color-text);
  font-size: var(--font-size-lg);
  text-decoration: none;
}

.logo strong {
  color: var(--color-accent);
}

.logo-mark {
  display: inline-grid;
  place-items: center;
  width: 2rem;
  height: 2rem;
  border-radius: 50%;
  background: var(--color-accent-soft);
  color: #fff8f2;
}

.site-header nav {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-4);
}

.site-header nav a {
  color: var(--color-text);
  font-weight: 500;
  text-decoration: none;
}

.site-header nav a:hover {
  color: var(--color-accent);
}

main {
  padding: var(--space-6) 0 var(--space-8);
}

.site-footer {
  border-top: 1px solid var(--color-border);
  padding: var(--space-5) 0;
  color: var(--color-text-muted);
  font-size: var(--font-size-sm);
}

@media (prefers-reduced-motion: reduce) {
  .btn {
    transition: none;
  }

  .btn:hover {
    transform: none;
  }
}
```

- [ ] **Step 6 : Créer `src/layouts/BaseLayout.astro`**

```astro
---
import '../styles/tokens.css';
import '../styles/global.css';
import { getDict, otherLang, type Lang } from '../i18n';

interface Props {
  lang: Lang;
  title?: string;
}

const { lang, title } = Astro.props;
const t = getDict(lang);
const alt = otherLang(lang);
const altPath = Astro.url.pathname.replace(/^\/(fr|en)(?=\/|$)/, `/${alt}`);
// 'unsafe-inline' is required by Astro's island bootstrap script; connect-src 'self' is what blocks data leaving the site.
const csp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self'",
  "connect-src 'self'",
  "worker-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'none'",
].join('; ');
---

<!doctype html>
<html lang={lang}>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta http-equiv="Content-Security-Policy" content={csp} />
    <meta name="referrer" content="no-referrer" />
    <title>{title ? `${title} — I Love My P.D.F.` : t.meta.title}</title>
    <meta name="description" content={t.meta.description} />
    <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
  </head>
  <body>
    <a class="skip-link" href="#main">{t.nav.skip}</a>
    <header class="site-header">
      <div class="container header-inner">
        <a class="logo" href={`/${lang}/`}>
          <span class="logo-mark" aria-hidden="true">♥</span>
          <span>I Love My <strong>P.D.F.</strong></span>
        </a>
        <nav aria-label={t.nav.label}>
          <a href={`/${lang}/filter/`}>{t.nav.filter}</a>
          <a href={`/${lang}/how-it-works/`}>{t.nav.howItWorks}</a>
          <a href={altPath} hreflang={alt} lang={alt}>{t.nav.switchLang}</a>
        </nav>
      </div>
    </header>
    <main id="main" class="container">
      <slot />
    </main>
    <footer class="site-footer">
      <div class="container">
        <p>{t.footer.license} {t.footer.noTracking}</p>
      </div>
    </footer>
  </body>
</html>
```

- [ ] **Step 7 : Vérifier les types**

Run: `npm run check`
Expected : `0 errors`.

- [ ] **Step 8 : Commit**

```
git add src/i18n src/styles src/layouts
git commit -m "feat(site): add FR/EN texts, warm design tokens and base layout with CSP"
```

---

### Task 13 : Pages Accueil et Comment ça marche

**Files:**
- Modify: `src/pages/index.astro`
- Create: `src/pages/[lang]/index.astro`, `src/pages/[lang]/how-it-works.astro`

- [ ] **Step 1 : Remplacer `src/pages/index.astro`**

```astro
---
return Astro.redirect('/fr/');
---
```

- [ ] **Step 2 : Créer `src/pages/[lang]/index.astro`**

```astro
---
import BaseLayout from '../../layouts/BaseLayout.astro';
import { getDict, langPaths, type Lang } from '../../i18n';

export function getStaticPaths() {
  return langPaths();
}

const lang = Astro.params.lang as Lang;
const t = getDict(lang);
const tools = [
  { key: 'filter', href: `/${lang}/filter/` },
  { key: 'merge', href: null },
  { key: 'split', href: null },
  { key: 'pdfToWord', href: null },
  { key: 'wordToPdf', href: null },
] as const;
---

<BaseLayout lang={lang}>
  <section class="hero">
    <h1>{t.home.title}</h1>
    <p class="lead">{t.home.subtitle}</p>
    <div class="hero-actions">
      <a class="btn" href={`/${lang}/filter/`}>{t.home.cta}</a>
      <a class="btn btn-secondary" href={`/${lang}/how-it-works/`}>{t.home.ctaSecondary}</a>
    </div>
  </section>

  <section aria-labelledby="tools-title">
    <h2 id="tools-title">{t.home.toolsTitle}</h2>
    <ul class="tools">
      {
        tools.map((tool) => (
          <li class:list={['tool-card', { 'is-soon': !tool.href }]}>
            <h3>{tool.href ? <a href={tool.href}>{t.home.tools[tool.key].name}</a> : t.home.tools[tool.key].name}</h3>
            <p>{t.home.tools[tool.key].desc}</p>
            {!tool.href && <span class="badge">{t.home.soon}</span>}
          </li>
        ))
      }
    </ul>
  </section>

  <section aria-labelledby="proofs-title" class="proofs">
    <h2 id="proofs-title">{t.home.proofsTitle}</h2>
    <ul>
      {
        t.home.proofs.map((proof) => (
          <li>
            <h3>{proof.title}</h3>
            <p>{proof.text}</p>
          </li>
        ))
      }
    </ul>
  </section>
</BaseLayout>

<style>
  .hero {
    padding: var(--space-6) 0 var(--space-7);
  }

  .hero-actions {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-3);
    margin-top: var(--space-5);
  }

  .tools,
  .proofs ul {
    list-style: none;
    padding: 0;
    margin: 0 0 var(--space-7);
    display: grid;
    gap: var(--space-4);
    grid-template-columns: repeat(auto-fit, minmax(min(100%, 15rem), 1fr));
  }

  .tool-card {
    position: relative;
    padding: var(--space-5);
    border-radius: var(--radius-lg);
    background: var(--color-surface);
    box-shadow: var(--shadow-soft);
  }

  .tool-card a {
    color: var(--color-text);
    text-decoration: none;
  }

  .tool-card a::after {
    content: '';
    position: absolute;
    inset: 0;
    border-radius: inherit;
  }

  .tool-card:not(.is-soon):hover {
    outline: 2px solid var(--color-accent-soft);
  }

  .tool-card p {
    color: var(--color-text-muted);
    margin: 0;
  }

  .is-soon {
    opacity: 0.7;
  }

  .badge {
    position: absolute;
    top: var(--space-4);
    right: var(--space-4);
    padding: var(--space-1) var(--space-3);
    border-radius: var(--radius-pill);
    background: var(--color-highlight-off);
    color: var(--color-text-muted);
    font-size: var(--font-size-sm);
  }

  .proofs li {
    padding: var(--space-5);
    border-radius: var(--radius-lg);
    border: 2px solid var(--color-border);
  }

  .proofs li p {
    margin: 0;
    color: var(--color-text-muted);
  }
</style>
```

- [ ] **Step 3 : Créer `src/pages/[lang]/how-it-works.astro`**

```astro
---
import BaseLayout from '../../layouts/BaseLayout.astro';
import { getDict, langPaths, type Lang } from '../../i18n';

export function getStaticPaths() {
  return langPaths();
}

const lang = Astro.params.lang as Lang;
const t = getDict(lang);
---

<BaseLayout lang={lang} title={t.how.title}>
  <h1>{t.how.title}</h1>
  <p class="lead">{t.how.intro}</p>
  <div class="sections">
    {
      t.how.sections.map((section) => (
        <section>
          <h2>{section.title}</h2>
          <p>{section.text}</p>
        </section>
      ))
    }
  </div>
  <p class="acronym">{t.how.acronym}</p>
</BaseLayout>

<style>
  .sections {
    display: grid;
    gap: var(--space-4);
    margin: var(--space-6) 0;
  }

  .sections section {
    padding: var(--space-5);
    border-radius: var(--radius-lg);
    background: var(--color-surface);
    box-shadow: var(--shadow-soft);
  }

  .sections h2 {
    font-size: var(--font-size-lg);
  }

  .sections p {
    margin: 0;
  }

  .acronym {
    padding: var(--space-4) var(--space-5);
    border-radius: var(--radius-pill);
    background: var(--color-highlight);
    font-weight: 600;
    text-align: center;
  }
</style>
```

- [ ] **Step 4 : Construire et vérifier les pages générées**

Run: `npm run build`
Expected : succès, et `dist/fr/index.html`, `dist/en/index.html`, `dist/fr/how-it-works/index.html`, `dist/en/how-it-works/index.html` existent (vérifier avec `Get-ChildItem dist -Recurse -Filter index.html`).

- [ ] **Step 5 : Commit**

```
git add src/pages
git commit -m "feat(site): add bilingual home and how-it-works pages"
```

---

### Task 14 : Composants d'interface partagés

**Files:**
- Create: `src/components/ui/ui.css`, `src/components/ui/DropZone.tsx`, `src/components/ui/Notice.tsx`, `src/components/ui/download.ts`

- [ ] **Step 1 : Créer `src/components/ui/ui.css`**

```css
.dropzone {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-5);
  border: 2px dashed var(--color-border);
  border-radius: var(--radius-lg);
  background: var(--color-surface);
  text-align: center;
  transition: border-color 120ms ease, background-color 120ms ease;
}

.dropzone.is-dragging {
  border-color: var(--color-accent);
  background: var(--color-highlight-off);
}

.dropzone p {
  margin: 0;
  color: var(--color-text-muted);
}

.notice {
  margin: 0;
  padding: var(--space-3) var(--space-4);
  border-radius: var(--radius-md);
}

.notice-warning {
  background: var(--color-warning-bg);
  color: var(--color-warning-text);
}

.notice-info {
  border: 1px solid var(--color-border);
  background: var(--color-surface);
  color: var(--color-text);
}
```

- [ ] **Step 2 : Créer `src/components/ui/DropZone.tsx`**

```tsx
import { useId, useRef, useState, type DragEvent } from 'react';
import './ui.css';

interface DropZoneProps {
  accept: string;
  label: string;
  buttonLabel: string;
  multiple?: boolean;
  onFiles: (files: File[]) => void;
}

export function DropZone({ accept, label, buttonLabel, multiple = false, onFiles }: DropZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const labelId = useId();

  const emit = (files: File[]) => {
    if (files.length > 0) onFiles(multiple ? files : files.slice(0, 1));
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragging(false);
    emit(Array.from(event.dataTransfer.files));
  };

  return (
    <div
      className={dragging ? 'dropzone is-dragging' : 'dropzone'}
      onDragOver={(event) => {
        event.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
    >
      <p id={labelId}>{label}</p>
      <button
        type="button"
        className="btn btn-secondary"
        aria-describedby={labelId}
        onClick={() => inputRef.current?.click()}
      >
        {buttonLabel}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        hidden
        data-testid="file-input"
        onChange={(event) => {
          emit(Array.from(event.target.files ?? []));
          event.target.value = '';
        }}
      />
    </div>
  );
}
```

- [ ] **Step 3 : Créer `src/components/ui/Notice.tsx`**

```tsx
import type { ReactNode } from 'react';
import './ui.css';

interface NoticeProps {
  tone?: 'warning' | 'info';
  children: ReactNode;
}

export function Notice({ tone = 'warning', children }: NoticeProps) {
  return (
    <p className={`notice notice-${tone}`} role="note">
      {children}
    </p>
  );
}
```

- [ ] **Step 4 : Créer `src/components/ui/download.ts`**

```ts
export function downloadText(content: string, fileName: string): void {
  const url = URL.createObjectURL(new Blob([content], { type: 'text/plain;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
```

- [ ] **Step 5 : Vérifier les types**

Run: `npm run check`
Expected : `0 errors`.

- [ ] **Step 6 : Commit**

```
git add src/components/ui
git commit -m "feat(ui): add drop zone, notice and local download helper"
```

---

### Task 15 : Îlot « Filtrer » et sa page

**Files:**
- Create: `src/components/tools/filter/selection.ts`, `src/components/tools/filter/HighlightedText.tsx`, `src/components/tools/filter/filter.css`, `src/components/tools/filter/FilterTool.tsx`, `src/pages/[lang]/filter.astro`

- [ ] **Step 1 : Créer `src/components/tools/filter/selection.ts`**

```ts
export interface TextRange {
  start: number;
  end: number;
}

/** Converts the browser selection into character offsets of the original text.
 *  Every child of `container` must carry `data-start` (its offset in the text). */
export function getSelectionOffsets(container: HTMLElement | null): TextRange | null {
  const selection = window.getSelection();
  if (!container || !selection || selection.rangeCount === 0 || selection.isCollapsed) return null;
  const range = selection.getRangeAt(0);
  if (!container.contains(range.startContainer) || !container.contains(range.endContainer)) return null;
  const start = toOffset(container, range.startContainer, range.startOffset);
  const end = toOffset(container, range.endContainer, range.endOffset);
  if (start === null || end === null || start === end) return null;
  return { start: Math.min(start, end), end: Math.max(start, end) };
}

function toOffset(container: HTMLElement, node: Node, offset: number): number | null {
  if (node === container) {
    const child = container.childNodes[offset] as HTMLElement | undefined;
    return child ? Number(child.dataset.start) : (container.textContent ?? '').length;
  }
  const element = node.nodeType === Node.TEXT_NODE ? node.parentElement : (node as HTMLElement);
  const holder = element?.closest<HTMLElement>('[data-start]');
  if (!holder) return null;
  const base = Number(holder.dataset.start);
  if (node.nodeType === Node.TEXT_NODE) return base + offset;
  return offset === 0 ? base : base + (holder.textContent ?? '').length;
}
```

- [ ] **Step 2 : Créer `src/components/tools/filter/HighlightedText.tsx`**

```tsx
import type { ReactNode } from 'react';
import type { Detection, PiiType } from '../../../core/detect/types';

interface HighlightedTextProps {
  id: string;
  text: string;
  detections: Detection[];
  disabled: Set<string>;
  typeLabels: Record<PiiType, string>;
  onToggle: (id: string) => void;
}

export function HighlightedText({ id, text, detections, disabled, typeLabels, onToggle }: HighlightedTextProps) {
  const parts: ReactNode[] = [];
  let cursor = 0;
  for (const d of [...detections].sort((a, b) => a.start - b.start)) {
    if (d.start < cursor) continue;
    if (d.start > cursor) {
      parts.push(
        <span key={`t-${cursor}`} data-start={cursor}>
          {text.slice(cursor, d.start)}
        </span>,
      );
    }
    const off = disabled.has(d.id);
    parts.push(
      <mark
        key={d.id}
        data-start={d.start}
        data-label={typeLabels[d.type]}
        className={off ? 'pii pii-off' : 'pii'}
        role="button"
        tabIndex={0}
        aria-pressed={!off}
        aria-label={`${typeLabels[d.type]} : ${d.value}`}
        onClick={() => onToggle(d.id)}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            onToggle(d.id);
          }
        }}
      >
        {text.slice(d.start, d.end)}
      </mark>,
    );
    cursor = d.end;
  }
  if (cursor < text.length) {
    parts.push(
      <span key={`t-${cursor}`} data-start={cursor}>
        {text.slice(cursor)}
      </span>,
    );
  }
  return (
    <div id={id} className="filter-review">
      {parts}
    </div>
  );
}
```

- [ ] **Step 3 : Créer `src/components/tools/filter/filter.css`**

```css
.filter-tool {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.filter-input {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.filter-input > .btn {
  align-self: flex-start;
}

.filter-label {
  font-weight: 600;
}

.filter-input textarea {
  width: 100%;
  min-height: 14rem;
  padding: var(--space-4);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-surface-raised);
  color: var(--color-text);
  font: inherit;
  resize: vertical;
}

.filter-error {
  margin: 0;
  color: var(--color-accent);
  font-weight: 600;
}

.filter-review-layout {
  display: grid;
  gap: var(--space-5);
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 22rem), 1fr));
}

.filter-panel {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  padding: var(--space-5);
  border-radius: var(--radius-lg);
  background: var(--color-surface);
  box-shadow: var(--shadow-soft);
}

.filter-panel h2 {
  margin: 0;
  font-size: var(--font-size-lg);
}

.filter-help,
.filter-count {
  margin: 0;
  color: var(--color-text-muted);
}

.filter-review,
.filter-output {
  max-height: 28rem;
  margin: 0;
  padding: var(--space-4);
  overflow: auto;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-surface-raised);
  font: inherit;
  line-height: 1.8;
  white-space: pre-wrap;
  word-break: break-word;
}

.pii {
  padding: 0 var(--space-1);
  border-radius: var(--radius-sm);
  background: var(--color-highlight);
  color: var(--color-text);
  cursor: pointer;
}

.pii::after {
  content: attr(data-label);
  margin-left: var(--space-1);
  color: var(--color-accent);
  font-size: 0.7em;
  font-weight: 700;
  text-transform: uppercase;
}

.pii-off {
  background: var(--color-highlight-off);
  text-decoration: line-through;
}

.filter-actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-3);
}
```

- [ ] **Step 4 : Créer `src/components/tools/filter/FilterTool.tsx`**

```tsx
import { useEffect, useMemo, useState } from 'react';
import type { Detection } from '../../../core/detect/types';
import { addManual } from '../../../core/redact/redact';
import { filteredName } from '../../../core/files/names';
import type { Dict } from '../../../i18n/fr';
import { getFilterApi } from '../../../workers/filterClient';
import { DropZone } from '../../ui/DropZone';
import { Notice } from '../../ui/Notice';
import { downloadText } from '../../ui/download';
import { HighlightedText } from './HighlightedText';
import { getSelectionOffsets } from './selection';
import './filter.css';

const REVIEW_ID = 'filter-review';

interface FilterToolProps {
  t: Dict['filter'];
}

export default function FilterTool({ t }: FilterToolProps) {
  const [step, setStep] = useState<'input' | 'review'>('input');
  const [text, setText] = useState('');
  const [fileName, setFileName] = useState<string | null>(null);
  const [detections, setDetections] = useState<Detection[]>([]);
  const [disabled, setDisabled] = useState<Set<string>>(new Set());
  const [output, setOutput] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const active = useMemo(() => detections.filter((d) => !disabled.has(d.id)), [detections, disabled]);

  useEffect(() => {
    if (step !== 'review') return;
    let cancelled = false;
    getFilterApi()
      .redact(text, active)
      .then((result) => {
        if (!cancelled) setOutput(result);
      })
      .catch(() => setError(t.errorGeneric));
    return () => {
      cancelled = true;
    };
  }, [step, text, active, t.errorGeneric]);

  async function handleFiles(files: File[]) {
    const [file] = files;
    setError(null);
    if (!file.name.toLowerCase().endsWith('.txt')) {
      setError(t.errorFileType);
      return;
    }
    setText(await file.text());
    setFileName(file.name);
  }

  async function analyze() {
    setBusy(true);
    setError(null);
    try {
      setDetections(await getFilterApi().detect(text));
      setDisabled(new Set());
      setStep('review');
    } catch {
      setError(t.errorGeneric);
    } finally {
      setBusy(false);
    }
  }

  function toggle(id: string) {
    setDisabled((previous) => {
      const next = new Set(previous);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function maskSelection() {
    const range = getSelectionOffsets(document.getElementById(REVIEW_ID));
    if (!range) return;
    setDetections((previous) => addManual(previous, text, range.start, range.end));
    window.getSelection()?.removeAllRanges();
  }

  async function copy() {
    await navigator.clipboard.writeText(output);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function restart() {
    setStep('input');
    setText('');
    setFileName(null);
    setDetections([]);
    setDisabled(new Set());
    setOutput('');
    setError(null);
  }

  return (
    <section className="filter-tool">
      <Notice>{t.warning}</Notice>
      {error && (
        <p className="filter-error" role="alert">
          {error}
        </p>
      )}
      {step === 'input' ? (
        <div className="filter-input">
          <label htmlFor="filter-text" className="filter-label">
            {t.inputLabel}
          </label>
          <textarea
            id="filter-text"
            value={text}
            placeholder={t.inputPlaceholder}
            rows={12}
            onChange={(event) => {
              setText(event.target.value);
              setFileName(null);
            }}
          />
          <DropZone accept=".txt,text/plain" label={t.dropLabel} buttonLabel={t.dropButton} onFiles={handleFiles} />
          <button type="button" className="btn" onClick={analyze} disabled={busy || text.trim() === ''}>
            {busy ? t.analyzing : t.analyze}
          </button>
        </div>
      ) : (
        <div className="filter-review-layout">
          <div className="filter-panel">
            <h2>{t.reviewTitle}</h2>
            <p className="filter-help">{t.reviewHelp}</p>
            <p className="filter-count" aria-live="polite">
              {active.length === 0 ? t.noneFound : t.found.replace('{count}', String(active.length))}
            </p>
            <HighlightedText
              id={REVIEW_ID}
              text={text}
              detections={detections}
              disabled={disabled}
              typeLabels={t.types}
              onToggle={toggle}
            />
            <button
              type="button"
              className="btn btn-secondary"
              onMouseDown={(event) => event.preventDefault()}
              onClick={maskSelection}
            >
              {t.maskSelection}
            </button>
          </div>
          <div className="filter-panel">
            <h2>{t.resultTitle}</h2>
            <pre className="filter-output" data-testid="filter-output">
              {output}
            </pre>
            <div className="filter-actions">
              <button type="button" className="btn" onClick={copy}>
                {copied ? t.copied : t.copy}
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => downloadText(output, filteredName(fileName ?? t.defaultFileName))}
              >
                {t.download}
              </button>
              <button type="button" className="btn btn-ghost" onClick={restart}>
                {t.restart}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
```

- [ ] **Step 5 : Créer `src/pages/[lang]/filter.astro`**

```astro
---
import BaseLayout from '../../layouts/BaseLayout.astro';
import FilterTool from '../../components/tools/filter/FilterTool';
import { getDict, langPaths, type Lang } from '../../i18n';

export function getStaticPaths() {
  return langPaths();
}

const lang = Astro.params.lang as Lang;
const t = getDict(lang);
---

<BaseLayout lang={lang} title={t.filter.title}>
  <h1>{t.filter.title}</h1>
  <p class="lead">{t.filter.intro}</p>
  <FilterTool client:load t={t.filter} />
</BaseLayout>
```

- [ ] **Step 6 : Vérifier types, tests et construction**

Run: `npm run check`
Expected : `0 errors`.

Run: `npm test`
Expected: PASS (77 tests).

Run: `npm run build`
Expected : succès ; `dist/fr/filter/index.html` et `dist/en/filter/index.html` existent, et un fichier `filter.worker-*.js` apparaît dans `dist/_astro/`.

- [ ] **Step 7 : Commit**

```
git add src/components/tools src/pages
git commit -m "feat(filter): add the Filter tool island with review, manual masking, copy and download"
```

---

### Task 16 : Tests de bout en bout (Playwright)

**Files:**
- Create: `playwright.config.ts`, `e2e/site.spec.ts`, `e2e/filter.spec.ts`

- [ ] **Step 1 : Créer `playwright.config.ts`**

```ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  use: {
    baseURL: 'http://localhost:4321',
  },
  webServer: {
    command: 'npm run build && npm run preview',
    url: 'http://localhost:4321/fr/',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
```

- [ ] **Step 2 : Créer `e2e/site.spec.ts`**

```ts
import { expect, test } from '@playwright/test';

test('home is available in French and English', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveURL(/\/fr\/$/);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    'Vos documents ne quittent jamais votre navigateur.',
  );
  await page.getByRole('link', { name: 'English' }).click();
  await expect(page).toHaveURL(/\/en\/$/);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Your documents never leave your browser.');
});

test('how-it-works page explains the name', async ({ page }) => {
  await page.goto('/fr/how-it-works/');
  await expect(page.getByText('P.D.F. veut dire Private Data Filter')).toBeVisible();
});

test('declares a Content-Security-Policy that forbids other origins', async ({ page }) => {
  await page.goto('/fr/');
  const csp = await page.locator('meta[http-equiv="Content-Security-Policy"]').getAttribute('content');
  expect(csp).toContain("default-src 'self'");
  expect(csp).toContain("connect-src 'self'");
});
```

- [ ] **Step 3 : Créer `e2e/filter.spec.ts`**

```ts
import { readFile } from 'node:fs/promises';
import { expect, test, type Page } from '@playwright/test';

async function openFilter(page: Page, lang = 'fr') {
  await page.goto(`/${lang}/filter/`);
  await page.waitForSelector('astro-island:not([ssr])', { state: 'attached' });
}

test('filters pasted text and lets the user unmask a detection', async ({ page }) => {
  await openFilter(page);
  await page.getByLabel('Votre texte').fill('Contactez jean.dupont@exemple.fr ou le 06 12 34 56 78.');
  await page.getByRole('button', { name: 'Analyser' }).click();

  const output = page.getByTestId('filter-output');
  await expect(output).toHaveText('Contactez [EMAIL_1] ou le [TELEPHONE_1].');

  await page.getByRole('button', { name: /Téléphone/ }).click();
  await expect(output).toHaveText('Contactez [EMAIL_1] ou le 06 12 34 56 78.');
});

test('masks a passage selected by hand', async ({ page }) => {
  await openFilter(page);
  await page.getByLabel('Votre texte').fill('Rendez-vous avec Marie Curie demain.');
  await page.getByRole('button', { name: 'Analyser' }).click();
  await expect(page.getByText('Aucune donnée personnelle détectée')).toBeVisible();

  await page.evaluate(() => {
    const node = document.querySelector('#filter-review span')!.firstChild!;
    const start = node.textContent!.indexOf('Marie Curie');
    const range = document.createRange();
    range.setStart(node, start);
    range.setEnd(node, start + 'Marie Curie'.length);
    const selection = window.getSelection()!;
    selection.removeAllRanges();
    selection.addRange(range);
  });
  await page.getByRole('button', { name: 'Masquer la sélection' }).click();

  await expect(page.getByTestId('filter-output')).toHaveText('Rendez-vous avec [MASQUE_1] demain.');
});

test('filters an uploaded .txt file and downloads note_prv.txt', async ({ page }) => {
  await openFilter(page);
  await page.getByTestId('file-input').setInputFiles({
    name: 'note.txt',
    mimeType: 'text/plain',
    buffer: Buffer.from('IBAN : FR76 3000 6000 0112 3456 7890 189'),
  });
  await page.getByRole('button', { name: 'Analyser' }).click();
  await expect(page.getByTestId('filter-output')).toHaveText('IBAN : [IBAN_1]');

  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Télécharger le document filtré' }).click();
  const download = await downloadPromise;

  expect(download.suggestedFilename()).toBe('note_prv.txt');
  expect(await readFile(await download.path(), 'utf8')).toBe('IBAN : [IBAN_1]');
});

test('refuses unsupported file types with a clear message', async ({ page }) => {
  await openFilter(page);
  await page.getByTestId('file-input').setInputFiles({
    name: 'photo.png',
    mimeType: 'image/png',
    buffer: Buffer.from([0x89, 0x50, 0x4e, 0x47]),
  });
  await expect(page.getByRole('alert')).toHaveText(
    'Ce type de fichier n’est pas encore pris en charge. Utilisez un fichier .txt.',
  );
});

test('works in English', async ({ page }) => {
  await openFilter(page, 'en');
  await page.getByLabel('Your text').fill('Mail me at a@b.io');
  await page.getByRole('button', { name: 'Analyse' }).click();
  await expect(page.getByTestId('filter-output')).toHaveText('Mail me at [EMAIL_1]');
});

test('never contacts another origin while filtering', async ({ page, baseURL }) => {
  const siteOrigin = new URL(baseURL!).origin;
  const external: string[] = [];
  page.on('request', (request) => {
    const url = request.url();
    if (url.startsWith('data:')) return;
    if (new URL(url).origin !== siteOrigin) external.push(url);
  });

  await page.goto('/fr/');
  await openFilter(page);
  await page.getByLabel('Votre texte').fill('Écrivez à jean.dupont@exemple.fr, IBAN FR76 3000 6000 0112 3456 7890 189.');
  await page.getByRole('button', { name: 'Analyser' }).click();
  await expect(page.getByTestId('filter-output')).toContainText('[IBAN_1]');
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Télécharger le document filtré' }).click();
  await downloadPromise;

  expect(external).toEqual([]);
});
```

- [ ] **Step 4 : Lancer les tests de bout en bout**

Run: `npm run test:e2e`
Expected: PASS (9 tests). Le premier lancement construit le site, ce qui prend jusqu'à une minute.

- [ ] **Step 5 : Commit**

```
git add playwright.config.ts e2e
git commit -m "test(e2e): cover the site, the Filter tool and the zero-external-request guarantee"
```

---

### Task 17 : Aperçu local et vérification finale

**Files:**
- Create: `.claude/launch.json`

- [ ] **Step 1 : Créer `.claude/launch.json`** (permet d'ouvrir le site dans le panneau navigateur de Claude)

```json
{
  "version": "0.0.1",
  "configurations": [
    {
      "name": "i-love-my-pdf",
      "runtimeExecutable": "npm",
      "runtimeArgs": ["run", "dev"],
      "port": 4321
    }
  ]
}
```

- [ ] **Step 2 : Lancer toute la vérification**

Run: `npm run check`
Expected : `0 errors`.

Run: `npm test`
Expected: PASS (77 tests).

Run: `npm run test:e2e`
Expected: PASS (9 tests).

- [ ] **Step 3 : Vérification manuelle dans le navigateur**

Lancer `npm run dev`, ouvrir `http://localhost:4321/`, puis vérifier :
- l'accueil s'affiche en crème et terracotta, la bascule FR/EN fonctionne ;
- sur « Filtrer », coller le corpus de la Task 8 : les 11 données sont surlignées avec leur étiquette ;
- cliquer une détection la barre et la fait réapparaître en clair dans le texte filtré ;
- « Copier le texte filtré » place le texte dans le presse-papiers ;
- l'affichage reste lisible sur une largeur de téléphone (outils de développement, mode mobile) ;
- avec le système en mode sombre, le site passe en thème sombre ;
- onglet Réseau des outils de développement : aucune requête vers un autre domaine.

- [ ] **Step 4 : Commit**

```
git add .claude/launch.json
git commit -m "chore: add local preview configuration"
```
