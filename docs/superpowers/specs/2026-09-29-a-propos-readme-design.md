# Page « À propos », README et guide des contributeurs — conception

Date : 2026-09-29
Statut : validé par le porteur du projet (auteur nommé, lien GitHub dès maintenant, pas de mention d'Alicia PDF, pas de page « Soutenir »)

## Livrables

1. **`LICENSE`** : licence MIT, © 2026 Ambroise Jessenne (le fichier manquait alors que le site se dit sous licence MIT).
2. **Page « À propos »** `/fr/about/` et `/en/about/`, liée dans le menu et le pied de page :
   - pourquoi ce site ; nos engagements (100 % navigateur, ni compte, ni publicité, ni traceur, ni stockage, lien vers « Comment ça marche ») ;
   - qui : projet indépendant créé par Ambroise Jessenne ;
   - logiciel libre : licence MIT, code sur GitHub (https://github.com/Ambroise-Jessenne/i-love-my-pdf), contributions bienvenues ;
   - crédits : bibliothèques et licences (Astro, React, pdf.js, pdf-lib, fontkit, fflate, docx, mammoth, Comlink), données (INSEE et geo.api.gouv.fr sous Licence Ouverte — mention de la source obligatoire ; listes de mots de Loren Brichter, CC0), police Liberation Sans (Red Hat, GPL v2 avec exception d’incorporation dans les documents), illustration du filtre d'après René Magritte, *Le Fils de l'homme* (1964).
3. **`README.md`** (français) et **`README.en.md`** (anglais), liés l'un à l'autre : présentation, outils, confidentialité et comment la vérifier, démarrage, commandes, architecture, limites, licence, crédits.
4. **`CONTRIBUTING.md`** : installation, règles du projet (aucune requête vers une autre origine, travail lourd dans un worker, FR/EN, accessibilité, tests), données de test **toujours fictives**, pas-à-pas « Ajouter un outil », déroulement d'une contribution (fusion par le mainteneur), résumé en anglais.
5. **Correction** : le texte de l'accueil « Le code source est public » devient « sera public » tant que le dépôt est privé.

## Tests

Bout en bout : la page « À propos » existe en FR et EN, elle est liée dans le menu, elle cite l'INSEE (Licence Ouverte) et renvoie vers le dépôt GitHub.
