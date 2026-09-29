# Outils PDF (plans 2 et 3) — plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** livrer Fusionner, Diviser, PDF → Word et Word → PDF, 100 % dans le navigateur.

**Architecture:** fonctions pures dans `src/core/pdf/` et `src/core/convert/`, exposées par `src/workers/pdfTools.worker.ts` ; pdf.js dans la page pour les miniatures et la lecture du texte ; un îlot React par outil. Conception : `docs/superpowers/specs/2026-09-29-outils-pdf-design.md`.

**Tech Stack:** pdf-lib, pdfjs-dist, fflate, docx, mammoth, @pdf-lib/fontkit, React, Astro, Vitest, Playwright.

**Note d'exécution :** le porteur du projet a demandé d'enchaîner sans relecture intermédiaire ; le code complet est dans les commits de la branche `feat/outils-pdf`.

## Tâches

### Task 1 : Fusion et division (cœur)
- [ ] `core/pdf/merge.ts` (`mergePdfs`), `core/pdf/split.ts` (`extractPages`, `splitPdf`, `parseRanges`), `core/zip.ts` ; tests.

### Task 2 : PDF → Word (cœur)
- [ ] `core/convert/pdfLayout.ts` (lignes, paragraphes, titres, styles) et `core/convert/pdfToDocx.ts` ; tests (texte relu avec `docxText`).

### Task 3 : Word → PDF (cœur)
- [ ] `core/convert/html.ts` (HTML de mammoth → blocs), `core/convert/typeset.ts` (mise en page pdf-lib + fontkit), `core/convert/docxToPdf.ts` ; tests (texte relu avec pdf.js).

### Task 4 : Worker et navigateur
- [ ] `workers/pdfTools.worker.ts` + client ; `pdfBrowser.ts` : miniatures et texte stylé.

### Task 5 : Interfaces
- [ ] Composants partagés (`ProgressBar`, `ToolFileCard`, `OtherTools`), îlots `MergeTool`, `SplitTool`, `ConvertTool` (2 sens), pages Astro FR/EN, textes, liens de l'accueil.

### Task 6 : Bout en bout et mise en ligne
- [ ] `e2e/tools.spec.ts` ; vérifications complètes ; fusion dans `master`, mise en ligne, vérification sur le site.
