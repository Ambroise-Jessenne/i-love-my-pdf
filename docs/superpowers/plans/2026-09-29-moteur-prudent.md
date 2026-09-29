# Moteur de détection prudent — plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** repérer noms, lieux et identifiants dans des documents français, avec un mode strict par défaut, et mesurer la fiabilité sur un jeu de documents fictifs.

**Architecture:** couches de détection pures dans `src/core/detect/context/`, fondées sur un découpage en mots (`tokens.ts`) et des listes chargées par le worker (`lexicon.ts`) ; `detect(text, { lexicon, strict })` fusionne règles et couches. Conception : `docs/superpowers/specs/2026-09-29-moteur-prudent-design.md`.

**Tech Stack:** TypeScript, Vitest, Comlink, Astro/React.

**Note d'exécution :** le porteur du projet a demandé d'enchaîner sans relecture intermédiaire ; le code complet est dans les commits de la branche `feat/moteur-prudent`.

## Tâches

### Task 1 : Listes et lexique
- [ ] `public/lexicon/*.txt` + `SOURCES.md` (fait lors de la conception).
- [ ] `lexicon.ts` : `Lexicon`, `LEXICON_FILES`, `normalizeKey`, `parseLexicon`, `isCommonWord` ; test.
- [ ] `tokens.ts` : `tokenize(text)` → mots avec position, majuscule, tout-majuscules, début de phrase ; test.

### Task 2 : Identifiants
- [ ] `context/identifiers.ts` : `labelledIdentifiers(text)` et `strictIdentifiers(text)` ; tests (« Id. National : 1710026022 C », « N° Etudiant : 22111434 », « n°AB12345 », montants et années non masqués).

### Task 3 : Personnes et lieux
- [ ] `context/people.ts` : civilités, prénoms, groupes de noms, valeurs après intitulé ; `context/places.ts` : formules de lieu, communes, territoires, parenthèses de département ; tests.

### Task 4 : Mode strict et assemblage
- [ ] `context/strict.ts` : `NOM_PROPRE` ; `detect(text, options)` ; nouvelles étiquettes dans `types.ts` ; tests pathologiques avec lexique.

### Task 5 : Jeu de documents fictifs
- [ ] `src/core/detect/documents.test.ts` + `src/core/detect/testing/` (chargement des vraies listes, annotations `⟦…⟧`) ; rappel 100 % exigé, masquage en trop plafonné.

### Task 6 : Worker et interface
- [ ] Worker : chargement unique des listes, `detectText(text, strict)`.
- [ ] `FilterTool` : case « Mode strict », relance de l'analyse ; textes FR/EN ; avertissement ; `docs/detection.md` mis à jour.
- [ ] `npm run check`, `npm test`, `npm run build`, e2e ciblés ; commit ; mise en ligne ; vérification sur le site.
