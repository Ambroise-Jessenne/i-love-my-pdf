# Contribuer à I Love My P.D.F.

*English summary at the end of this page.*

Merci de votre intérêt ! Ce guide explique comment installer le projet, les règles à respecter et le déroulement d'une contribution.

## Installer le projet

Prérequis : Node.js 22.12 ou plus récent.

```bash
npm install
npx playwright install chromium   # pour les tests de bout en bout
npm run dev                        # http://localhost:4321
```

Avant de proposer une modification, lancez :

```bash
npm run check      # types : 0 erreur attendue
npm test           # tests unitaires
npm run test:e2e   # tests de bout en bout (construit le site d'abord)
```

## Les règles du projet

Ces règles sont la promesse faite aux utilisateurs : une contribution qui en enfreint une ne peut pas être acceptée.

1. **Rien ne quitte l'appareil.** Aucun `fetch`, aucune image, police, script ou feuille de style chargés depuis une autre origine ; aucune statistique, aucun cookie, aucun traceur. Toute ressource nécessaire est servie par le site (`public/`). La Content-Security-Policy de `src/layouts/BaseLayout.astro` ne doit pas être assouplie.
2. **Le travail lourd tourne dans un worker.** Le code de `src/core/` est fait de fonctions pures, sans DOM ni React, testables seules ; les workers (`src/workers/`) les exposent avec Comlink ; les composants ne contiennent pas de logique de traitement.
3. **Deux langues.** Tout texte visible existe en français (`src/i18n/fr.ts`) et en anglais (`src/i18n/en.ts`). Pas de texte en dur dans les composants.
4. **Accessible.** Navigation au clavier complète, libellés explicites, contraste suffisant en mode clair et sombre, animations désactivées si l'utilisateur préfère moins de mouvement (`prefers-reduced-motion`).
5. **Testé.** Toute fonction du cœur a des tests unitaires ; tout outil a un parcours de bout en bout qui vérifie aussi l'absence de requête vers une autre origine.
6. **Données de test fictives, toujours.** N'ajoutez jamais de vrais documents, de vraies personnes ou de vraies coordonnées dans les tests, les exemples ou les captures d'écran. Inventez des données (« Clara Martin », « 06 12 34 56 78 »…).

### Modifier le moteur de détection

- Les règles sont dans `src/core/detect/` (formats dans `rules/`, personnes, lieux, identifiants et mode strict dans `context/`).
- `src/core/detect/documents.test.ts` contient des documents fictifs annotés : chaque donnée personnelle est entourée de `⟦…⟧`. Le test échoue si une seule n'est pas masquée en mode strict. Quand vous corrigez un oubli, **ajoutez d'abord le cas à ce fichier**, vérifiez qu'il échoue, puis corrigez.
- Mettez à jour [docs/detection.md](docs/detection.md) (données reconnues, limites, faux positifs connus).
- Les listes de `public/lexicon/` ont une source et une licence : si vous en modifiez une, mettez à jour `public/lexicon/SOURCES.md`.

## Ajouter un outil

1. **Le cœur** : écrivez les fonctions pures dans `src/core/<domaine>/` (entrées et sorties en `Uint8Array` pour les fichiers), avec leurs tests `*.test.ts`.
2. **Le worker** : exposez-les dans `src/workers/pdfTools.worker.ts` (ou un nouveau worker s'il s'agit d'une autre famille d'outils, avec son client comme `pdfToolsClient.ts`).
3. **Les textes** : ajoutez une entrée `tools.<outil>` dans `src/i18n/fr.ts` et `src/i18n/en.ts`, et la carte de l'outil dans `home.tools`.
4. **L'îlot** : créez `src/components/tools/<outil>/<Outil>Tool.tsx` en réutilisant `DropZone`, `ProgressBar`, `downloadBlob`, les utilitaires de `components/tools/common/files.ts` et les styles de `components/tools/common/tools.css`. pdf.js se charge à la demande via `components/pdf/pdfjs.ts`.
5. **La page** : créez `src/pages/[lang]/<outil>.astro` (titre, introduction, îlot, `OtherTools`), puis ajoutez l'outil à la liste `TOOLS` de `components/tools/common/OtherTools.astro` et au tableau `tools` de `src/pages/[lang]/index.astro`.
6. **Les tests de bout en bout** : un parcours complet dans `e2e/`, qui vérifie le fichier produit, les messages d'erreur et l'absence de requête vers une autre origine.

## Proposer une modification

1. Ouvrez d'abord un ticket (*issue*) pour discuter d'un changement important.
2. Créez une branche (`feat/…`, `fix/…`, `docs/…`) et des commits courts au format [Conventional Commits](https://www.conventionalcommits.org/) en anglais (`feat(filter): …`, `fix(split): …`).
3. Ouvrez une *pull request* qui explique le pourquoi, avec des captures d'écran pour tout changement visible (données fictives uniquement).
4. Les *pull requests* sont relues et fusionnées par le mainteneur du projet.

En contribuant, vous acceptez que votre contribution soit publiée sous la [licence MIT](LICENSE) du projet.

---

## English summary

- **Setup**: Node.js ≥ 22.12, `npm install`, `npx playwright install chromium`, `npm run dev`. Before a pull request: `npm run check`, `npm test`, `npm run test:e2e`.
- **Rules**: nothing may leave the device (no request to another origin, no analytics, no cookies; do not loosen the CSP); heavy work runs in workers, `src/core/` stays pure and tested; every visible text exists in French and English; keyboard and screen-reader accessible, reduced motion respected; **test data is always fictitious**.
- **Detection engine**: add any missed case to `src/core/detect/documents.test.ts` (personal data wrapped in `⟦…⟧`) before fixing it, and update `docs/detection.md`.
- **Adding a tool**: core functions and tests in `src/core/`, exposed by a worker; texts in `src/i18n/`; an island in `src/components/tools/<tool>/`; a page in `src/pages/[lang]/`; register it in `OtherTools.astro` and the home page; an end-to-end test including the no-external-request check.
- **Pull requests**: branch, Conventional Commits in English, explain the why, screenshots with fictitious data; merged by the maintainer. Contributions are published under the project's MIT licence.
