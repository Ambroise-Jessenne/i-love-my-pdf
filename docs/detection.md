# Moteur de détection — fonctionnement et limites

Le filtre repère les données personnelles en quatre couches : des règles de format, des intitulés d'identifiants, des listes officielles de prénoms, de noms et de lieux, et un mode strict. Il ne comprend pas le sens du texte : c'est pourquoi le mode strict préfère masquer trop que pas assez, et pourquoi la relecture reste indispensable.

## 1. Règles de format

| Étiquette | Exemples | Contrôle supplémentaire |
|---|---|---|
| EMAIL | jean.dupont@exemple.fr | — |
| TELEPHONE | 06 12 34 56 78, +33 6 12 34 56 78, +44 20 7946 0958 | — |
| IBAN | FR76 3000 6000 0112 3456 7890 189 (majuscules ou minuscules) | clé modulo 97 |
| NIR | 1 85 05 78 006 084 91 | clé de contrôle |
| CARTE_BANCAIRE | 4111 1111 1111 1111 | algorithme de Luhn |
| DATE | 12/03/1985, 1985-03-12, 12 mars 1985, March 12, 1985 | — |
| ADRESSE | 12 rue de la Paix, 75002 Paris — 12 RUE DE LA PAIX, 75002 PARIS | — |
| IP | 192.168.1.42 | — |
| URL | https://exemple.fr/contact, www.site.com (majuscules acceptées) | — |

## 2. Identifiants (`IDENTIFIANT`)

La valeur (au moins deux chiffres) qui suit un intitulé : « Id. National : 1710026022 C », « N° Etudiant : 22111434 », « Dossier n°AB-2024-0042 », « Matricule 008421 », « Réf. client : CLI 00457 »… Intitulés reconnus : Id, Identifiant, N°, Numéro, Matricule, INE, Réf., Dossier, Contrat, Client, Adhérent, Compte, Passeport, Permis, Carte, Badge, Licence, Siret, Siren, TVA, Allocataire, Sécurité sociale, Immatriculation, Police, Sinistre, Facture, Commande, Ticket, Code.

## 3. Personnes et lieux (`PERSONNE`, `LIEU`)

Listes utilisées (voir `public/lexicon/SOURCES.md`) : prénoms et noms de famille de l'INSEE, communes, départements et régions (geo.api.gouv.fr), mots courants français et anglais.

- **Personnes** : un prénom connu ou une civilité (M., Mme, Madame, Monsieur, Dr, Maître, Pr, Mr, Mrs…) déclenche le masquage, étendu aux mots à majuscule voisins sur la même ligne (« LOMBARD ALICIA », « Estelle IACONA », « Charles de Gaulle »). La civilité reste visible. La valeur qui suit « Nom : », « Prénom : », « Signataire : », « Élève : », « Patient : », « Titulaire : », « Locataire : »… est aussi masquée.
- **Lieux** : ce qui suit « né(e) à », « fait à », « domicilié(e) à », « demeurant à », « originaire de », « born in », « residing in »… ; une commune, un département ou une région après « à », « en », « au », « in », « at »… ; un nom de commune qui n'est pas un mot courant ; la ville d'une formule « Rennes, le 5 janvier 2026 ». Une parenthèse qui suit (« VALENCE ( DROME ) ») est incluse.

## 4. Mode strict (activé par défaut)

- Tout mot à majuscule qui n'est ni un mot courant (français ou anglais) ni un sigle usuel (PDF, TVA, CDI, SNCF…) devient `NOM_PROPRE`, y compris en début de phrase.
- Tout nombre de 5 chiffres ou plus (hors montants et décimales), toute suite de chiffres groupés d'au moins 7 chiffres, et tout code mêlant majuscules et chiffres (5 caractères ou plus) devient `IDENTIFIANT`.

Les détections qui se chevauchent sont fusionnées : aucune partie d'une détection n'est laissée visible.

## Fiabilité mesurée

`src/core/detect/documents.test.ts` vérifie 16 documents français et anglais entièrement fictifs (certificat de scolarité, attestation employeur, courriels, ordonnance, compte rendu médical, quittance, facture, CV, contrat de travail, pièce d'identité, message informel, attestation CAF…). Chaque donnée personnelle y est annotée ; **le test échoue si une seule n'est pas entièrement masquée en mode strict**, et le masquage en trop du texte ordinaire est plafonné à 12 %. Six de ces documents ont été écrits après les règles, sans les ajuster, pour vérifier que le moteur ne se contente pas de reconnaître ses propres exemples.

## Ce que le filtre ne trouve pas

- Les noms écrits entièrement en minuscules (« rdv avec paul demain »), sauf après un intitulé comme « Nom : ».
- En mode équilibré (strict désactivé) : les noms de famille seuls qui ne suivent ni un prénom connu ni une civilité, et les lieux étrangers hors formules (« né à », « born in »…).
- Les noms de personnes qui sont aussi des mots courants, en début de phrase et sans prénom ni civilité (« Blanc a signé »).
- Les informations indirectes : âge, profession, description physique, événements permettant de reconnaître quelqu'un.
- Le texte contenu dans les images des documents Word et dans les PDF scannés.
- Les identifiants sans intitulé de moins de 5 chiffres, et les numéros de téléphone écrits dans un format inhabituel (« 06-1234-5678 »).

## Faux positifs connus

- Mode strict : noms d'entreprises, de produits, d'établissements et mots rares ou étrangers à majuscule (« Université Paris-Saclay », « Airbus »).
- Toutes les dates sont masquées, pas seulement les dates de naissance.
- Une commune qui est aussi un nom d'entreprise, après « à » ou « en » (« en Orange »).
- Un numéro de version à quatre parties (« 1.2.3.4 ») est pris pour une adresse IP.
- Une suite de 13 à 19 chiffres qui respecte l'algorithme de Luhn est prise pour une carte bancaire.

L'utilisateur peut démasquer un faux positif d'un clic ou masquer un oubli à la main avant d'exporter.
