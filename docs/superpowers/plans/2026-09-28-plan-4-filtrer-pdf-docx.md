# Plan 4 — Filtrer des fichiers PDF et DOCX : plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** l'outil « Filtrer » accepte `.docx` et `.pdf` (avec couche texte), produit un `.docx` filtré et, pour un PDF, un PDF caviardé par encarts noirs sûrs.

**Architecture:** fonctions pures dans `src/core/` (étiquettes, DOCX, mise en page PDF, assemblage PDF), exposées par le worker de filtrage ; pdf.js (chargé à la demande) lit le texte et rend les pages caviardées en image dans le navigateur. Conception : `docs/superpowers/specs/2026-09-28-filtrer-pdf-docx-design.md`.

**Tech Stack:** Astro 7, React 19, TypeScript, Comlink, pdfjs-dist 6.3.289 (Apache-2.0), pdf-lib 1.17.1 (MIT), fflate 0.8.3 (MIT), Vitest, Playwright.

**Note d'exécution :** le porteur du projet a demandé d'enchaîner sans relecture intermédiaire. Ce plan fixe les interfaces, les cas de test et les commandes ; le code complet de chaque tâche est dans le commit correspondant (branche `feat/plan-4-filtrer-pdf-docx`).

---

## Structure des fichiers

| Fichier | Responsabilité |
|---|---|
| `src/core/redact/labels.ts` | `planReplacements(detections)` → `{start, end, label}[]`, sans chevauchement, étiquettes cohérentes |
| `src/core/redact/redact.ts` | `redact()` réécrit au-dessus de `planReplacements` (comportement inchangé) |
| `src/core/docx/xml.ts` | lecture/écriture des nœuds texte WordprocessingML sans DOM (`scanPart`, `rewritePart`, entités XML) |
| `src/core/docx/docx.ts` | `docxText(bytes)`, `docxRedact(bytes, detections)` : parties lues, modifications suivies acceptées, métadonnées d'identité vidées |
| `src/core/pdf/layout.ts` | `buildPdfText(pages)` → `{text, spans}` ; `boxesFor(ranges, pages, spans, measure)` → rectangles par page avec marge |
| `src/core/pdf/assemble.ts` | `assembleRedactedPdf(original, images)` → PDF avec pages caviardées en image, métadonnées neutres |
| `src/components/tools/filter/pdfBrowser.ts` | pdf.js : `openPdf(bytes)`, `renderRedactedPages(pdf, boxes)` |
| `src/components/ui/download.ts` | `downloadBlob(data, type, name)` + `downloadText` |
| `src/core/files/names.ts` | `filteredName(name, ext?)` : extension de sortie optionnelle |
| `scripts/copy-pdfjs-assets.mjs` | copie CMaps, polices standard, wasm, ICC de pdf.js dans `public/pdfjs/` (ignoré par git) avant `dev`/`build` |
| `src/components/tools/filter/FilterTool.tsx` | entrées `.txt/.docx/.pdf`, fiche du fichier chargé, sorties selon le type |
| `src/i18n/fr.ts`, `en.ts` | nouveaux textes |

## Interfaces communes

```ts
// src/core/redact/labels.ts
export interface Replacement { start: number; end: number; label: string }
export function planReplacements(detections: Detection[]): Replacement[];

// src/core/pdf/layout.ts — coordonnées de page à l'échelle 1, origine en haut à gauche (points PDF)
export interface PdfTextItem { str: string; left: number; top: number; width: number; height: number; hasEOL: boolean; horizontal: boolean }
export interface PdfPageText { width: number; height: number; items: PdfTextItem[] }
export interface PdfSpan { page: number; item: number; start: number; end: number }
export interface PdfBox { page: number; x: number; y: number; width: number; height: number }
export function buildPdfText(pages: PdfPageText[]): { text: string; spans: PdfSpan[] };
export function boxesFor(ranges: { start: number; end: number }[], pages: PdfPageText[], spans: PdfSpan[], measure: (s: string) => number): PdfBox[];

// src/core/pdf/assemble.ts
export interface RedactedPageImage { page: number; jpeg: Uint8Array; width: number; height: number }
export function assembleRedactedPdf(original: Uint8Array, images: RedactedPageImage[]): Promise<Uint8Array>;

// src/core/docx/docx.ts
export function docxText(bytes: Uint8Array): string;
export function docxRedact(bytes: Uint8Array, detections: Detection[]): Uint8Array;
```

## Tâches

### Task 1 : Étiquettes partagées
- [ ] Tests `labels.test.ts` : même valeur → même étiquette ; numérotation par type ; détection chevauchante absorbée par la précédente (fin étendue) ; ordre indépendant de l'entrée.
- [ ] `planReplacements` ; `redact()` réécrit dessus ; `npm test` : les tests existants de `redact` passent inchangés.
- [ ] Commit `refactor(redact): share label planning between outputs`.

### Task 2 : DOCX sans DOM
- [ ] Tests `docx.test.ts` sur des `.docx` construits en mémoire avec fflate : texte d'un run découpé en plusieurs `<w:t>` ; `<w:tab/>` → `\t` ; paragraphes → `\n` ; entités (`&amp;`) ; en-tête et pied de page lus après le corps ; texte supprimé (`<w:del>`) absent et insertion (`<w:ins>`) conservée ; `docxRedact` remplace un email coupé sur deux runs par `[EMAIL_1]` dans le premier run et vide le reste ; `xml:space="preserve"` posé ; `dc:creator`, `cp:lastModifiedBy`, `w:author` vidés ; le texte relu du DOCX filtré égale `redact(text, detections)`.
- [ ] `xml.ts` + `docx.ts`.
- [ ] Commit `feat(docx): read and filter Word documents without a DOM`.

### Task 3 : Mise en page PDF
- [ ] Tests `layout.test.ts` : texte = morceaux concaténés, `\n` après `hasEOL` et entre pages ; spans exacts ; rectangle d'une détection au milieu d'un morceau horizontal (mesure proportionnelle) avec marge ; détection à cheval sur deux morceaux → deux rectangles ; morceau non horizontal → rectangle englobant entier.
- [ ] `layout.ts`.
- [ ] Commit `feat(pdf): map detections to page rectangles`.

### Task 4 : Assemblage du PDF caviardé
- [ ] Test `assemble.test.ts` : PDF de 2 pages généré avec pdf-lib ; page 1 remplacée par une image JPEG ; résultat : 2 pages, tailles conservées, pdf.js (build legacy, Node) ne trouve plus aucun texte en page 1 et retrouve celui de la page 2 ; auteur et titre vides.
- [ ] `assemble.ts` ; worker : expose `docxText`, `docxRedact`, `assembleRedactedPdf`.
- [ ] Commit `feat(pdf): assemble redacted PDFs with pages rendered as images`.

### Task 5 : pdf.js dans le navigateur
- [ ] `scripts/copy-pdfjs-assets.mjs`, scripts `predev`/`prebuild`, `public/pdfjs/` ignoré.
- [ ] `pdfBrowser.ts` : `getDocument` avec URLs locales (`/pdfjs/...`), `useWasm: false` (la CSP n'autorise pas la compilation WebAssembly) ; erreurs `password` / `invalid` / `empty` ; rendu à l'échelle 2 sur fond blanc, encarts `#000`, JPEG qualité 0,9.
- [ ] `npm run check` : 0 erreur. Commit `feat(pdf): read and render PDFs locally with pdf.js`.

### Task 6 : Outil « Filtrer »
- [ ] Textes FR/EN ; `filteredName(name, ext?)` (+ test) ; `downloadBlob`.
- [ ] `FilterTool` : `.docx`/`.pdf` acceptés ; fiche du fichier (nom, pages, « Retirer le fichier ») et zone de texte en lecture seule ; lecture avec indicateur ; avertissement > 100 Mo ; sorties : DOCX filtré ; PDF caviardé (+ indicateur « Caviardage en cours… ») et texte filtré `.txt` ; notes de limites.
- [ ] `npm run check`, `npm test`, `npm run build`. Commit `feat(filter): filter .docx and .pdf files, with black-box PDF redaction`.

### Task 7 : Bout en bout et déploiement
- [ ] `e2e/files.spec.ts` : DOCX filtré téléchargé (XML sans l'email, avec `[EMAIL_1]`) ; PDF : texte filtré, puis PDF caviardé dont la page caviardée n'a plus de texte (pdf.js Node) ; PDF sans texte refusé ; aucune requête vers une autre origine. Message d'erreur de type mis à jour dans `filter.spec.ts`.
- [ ] Pousser la branche, fusionner dans `master` après CI verte, vérifier le site en ligne.
