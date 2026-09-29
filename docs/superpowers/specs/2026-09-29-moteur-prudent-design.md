# Moteur de détection prudent — conception

Date : 2026-09-29
Statut : validé par le porteur du projet (approche A, mode strict par défaut)

## 1. Problème

Sur un vrai document (certificat de scolarité), le filtre laissait passer le nom et le prénom de l'élève, la signataire, la ville et le département de naissance, un identifiant national et un numéro d'étudiant. Les règles ne reconnaissaient que des formats prévisibles (email, téléphone, IBAN…).

## 2. Décisions

| Sujet | Décision | Raison |
|---|---|---|
| Base | Règles + listes officielles + indices de contexte, sans modèle d'IA | OpenAI Privacy Filter : ≈ 810 Mo, F1 ≈ 0,40 sur les noms de personnes et ≈ 0,62 en français (évaluation indépendante), téléchargement depuis un tiers. Un modèle pourra s'ajouter plus tard si le jeu de tests le justifie. |
| Mode strict | Activé par défaut, désactivable | Sur un site de protection des données, masquer trop vaut mieux que laisser passer ; la relecture permet de démasquer en un clic. |
| Garantie | Aucune garantie absolue affichée ; fiabilité mesurée par un jeu de documents fictifs annotés | Honnêteté envers l'utilisateur ; objectif vérifiable. |

## 3. Nouvelles étiquettes

`PERSONNE`, `LIEU`, `IDENTIFIANT`, `NOM_PROPRE` (mode strict : nom propre inconnu).

## 4. Couches de détection

1. **Règles existantes** (inchangées).
2. **Identifiants par intitulé** : valeur contenant au moins deux chiffres après « Id », « Identifiant », « N° », « Numéro », « Matricule », « INE », « Réf. », « Dossier », « Contrat », « Client », « Adhérent », « Compte », « Passeport », « Permis », « Carte », « Siret », « Siren », « TVA », « Allocataire », « Immatriculation », « Police », « Sinistre », « Facture », « Commande »… (avec ou sans deux-points).
3. **Personnes** : prénom connu (INSEE) ou civilité (M., Mme, Madame, Monsieur, Dr, Maître, Pr…) comme point de départ, étendu aux mots à majuscule voisins sur la même ligne (particules de, du, le, van… autorisées) ; valeur après « Nom : », « Prénom : », « Signataire : », « Élève : », « Patient : », « Titulaire : »…
4. **Lieux** : mot à majuscule après « né(e) à », « fait à », « domicilié(e) à », « demeurant à », « originaire de », « à », « en »… s'il s'agit d'une commune, d'un département ou d'une région, ou dans tous les cas après les formules de naissance et de domicile ; commune ou territoire à majuscule hors début de phrase s'il n'est pas un mot courant.
5. **Mode strict** : tout mot à majuscule (hors début de phrase) ou entièrement en majuscules qui n'est ni un mot courant (français ou anglais) ni un sigle usuel → `NOM_PROPRE` ; mot inconnu en début de phrase → `NOM_PROPRE` ; nombre de 5 chiffres ou plus (hors montants décimaux) et code mêlant lettres majuscules et chiffres (5 caractères ou plus) → `IDENTIFIANT`.

## 5. Données

Listes normalisées (minuscules, sans accents) servies par le site dans `public/lexicon/` et chargées une fois par le worker (≈ 2 Mo compressés) : prénoms et noms de famille (INSEE), communes, départements et régions (geo.api.gouv.fr), mots courants français et anglais (Loren Brichter, CC0). Sources et licences : `public/lexicon/SOURCES.md`.

## 6. Interface

- Case « Mode strict (recommandé) » cochée par défaut sous la zone de texte ; la changer relance l'analyse si une relecture est en cours.
- Avertissement mis à jour : le filtre repère désormais noms, lieux et identifiants, mais la relecture reste indispensable.
- Nouvelles étiquettes traduites (FR/EN).

## 7. Tests

- Unitaires par couche, avec un petit lexique en mémoire.
- Jeu de documents français fictifs annotés (`⟦…⟧` autour de chaque donnée à masquer) chargé avec les vraies listes : **échec si une seule donnée annotée n'est pas entièrement couverte en mode strict** ; le taux de masquage en trop est mesuré et plafonné.
- Textes pathologiques (200 000 caractères) : temps de détection borné.
