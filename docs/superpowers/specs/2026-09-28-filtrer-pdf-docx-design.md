# Filtrer des fichiers PDF et DOCX — conception

Date : 2026-09-28
Statut : validé par le porteur du projet (décisions ci-dessous)
Remplace, pour ce sujet, le « Plan 4 » du cahier des charges, avancé avant les plans 2 et 3. Lève aussi une exclusion de la v1 (§ 7 du cahier des charges) : le masquage visuel directement dans un PDF.

## 1. Objectif

L'outil « Filtrer » accepte, en plus du texte collé et des `.txt` :
- les **`.docx`** : le résultat est un `.docx` filtré qui garde sa mise en forme, les données étant remplacées par les mêmes étiquettes que le texte filtré (`[EMAIL_1]`…) ;
- les **`.pdf` avec couche texte** : le résultat est le texte filtré (copie ou `.txt`) **et**, en option, un **PDF caviardé** avec des encarts noirs unis posés sur les pages.

Tout reste traité dans le navigateur, sans aucune requête vers une autre origine.

## 2. Décisions

| Sujet | Décision | Raison |
|---|---|---|
| Méthode de caviardage PDF | Chaque page qui porte au moins un encart est **rendue en image** (encarts compris) ; les autres pages sont copiées telles quelles | Un rectangle posé sur le texte laisse le texte copiable dessous. Retirer le texte du flux PDF demanderait MuPDF (AGPL, incompatible MIT) ou un éditeur de flux fragile. |
| Aspect des encarts | Noir uni, sans étiquette | Choix du porteur du projet |
| Sortie DOCX | Étiquettes dans le texte, mise en forme conservée | Cohérent avec le texte filtré ; un `.docx` doit rester modifiable |
| Masquage manuel | La sélection dans la relecture (« Masquer la sélection ») produit aussi un encart dans le PDF et une étiquette `[MASQUE_n]` dans le DOCX | Seul moyen de masquer les noms, que les règles ne trouvent pas |
| PDF scannés, protégés par mot de passe | Refusés avec un message clair | Pas d'OCR en v1 |

## 3. Bibliothèques ajoutées

| Bibliothèque | Rôle | Licence | Chargement |
|---|---|---|---|
| `pdfjs-dist` | Lire le texte d'un PDF avec ses positions, rendre les pages en image | Apache-2.0 | Import dynamique au dépôt d'un PDF ; son worker, ses polices standard et ses CMaps sont servis par le site |
| `pdf-lib` | Assembler le PDF caviardé | MIT | Dans le worker de filtrage |
| `fflate` | Ouvrir et refermer l'archive `.docx` | MIT | Dans le worker de filtrage |

La CSP reste `connect-src 'self'` ; pdf.js est configuré sans `eval` (`isEvalSupported: false`).

## 4. Architecture

- `src/core/redact/labels.ts` — attribue les étiquettes (`[TYPE_n]`) à une liste de détections ; partagé par le texte, le DOCX et l'affichage, pour que les numéros concordent partout.
- `src/core/docx/` — fonctions pures (sans DOM, utilisables dans un worker) :
  - `docxText(bytes)` → texte du document (corps, en-têtes, pieds de page, notes, commentaires), paragraphes séparés par `\n` ;
  - `docxRedact(bytes, detections)` → `.docx` filtré. Les détections sont exprimées en positions dans le texte de `docxText`. Les modifications suivies sont acceptées (texte supprimé retiré), les auteurs et les métadonnées d'identité (`docProps`) vidés.
- `src/core/pdf/layout.ts` — fonctions pures : construire le texte d'un PDF à partir des morceaux de texte de pdf.js, et convertir des détections en rectangles par page (avec une marge de sécurité).
- `src/core/pdf/assemble.ts` — `assembleRedactedPdf(original, pagesAsImages)` : nouveau PDF avec pdf-lib, pages caviardées remplacées par leur image, autres pages copiées, métadonnées neutres.
- `src/components/tools/filter/pdfBrowser.ts` — colle navigateur autour de pdf.js : ouvrir un PDF, lire le texte avec positions, rendre une page en JPEG avec ses encarts.
- `src/workers/filter.worker.ts` — expose en plus `docxText`, `docxRedact`, `assembleRedactedPdf`.
- `FilterTool.tsx` — accepte `.txt`, `.docx`, `.pdf` ; propose les sorties adaptées au type d'entrée.

## 5. Flux

1. Dépôt d'un fichier → lecture en `ArrayBuffer`.
2. `.docx` → `docxText` dans le worker. `.pdf` → pdf.js extrait le texte et les positions ; `layout` construit le texte.
3. Détection, scanner Magritte, relecture : inchangés.
4. Sorties :
   - texte filtré (copier, `.txt`) : pour tous les types ;
   - `.docx` : « Télécharger le document filtré » → `docxRedact` → `nom_prv.docx` ;
   - `.pdf` : « Télécharger le PDF caviardé » → rectangles calculés, pages concernées rendues en JPEG avec les encarts (≈ 150 dpi), assemblage → `nom_prv.pdf`. « Télécharger le texte filtré » → `nom_prv.txt`.

## 6. Erreurs et limites affichées

- PDF sans texte (scanné) : « Ce PDF ne contient pas de texte (document scanné) : il n'est pas encore pris en charge. »
- PDF protégé : « Ce PDF est protégé par un mot de passe. »
- Fichier de plus de 100 Mo : avertissement (mémoire du navigateur).
- DOCX : les images, zones de dessin et objets incorporés ne sont pas filtrés (limite affichée dans l'aide).
- PDF caviardé : le texte des pages caviardées n'est plus sélectionnable ; les autres pages le restent. Les encarts ont une marge de sécurité et peuvent déborder légèrement sur les mots voisins.

## 7. Tests

- Unitaires : `docxText` / `docxRedact` sur des `.docx` construits en mémoire (runs découpés, tabulations, en-têtes, modifications suivies, métadonnées) ; `layout` (texte, rectangles, marge) ; `labels`.
- Bout en bout : filtrer un `.docx` et vérifier le texte du fichier téléchargé ; filtrer un PDF généré avec pdf-lib, télécharger le PDF caviardé et vérifier avec pdf.js que la page caviardée ne contient plus de texte ; PDF sans texte refusé ; aucune requête vers une autre origine.
