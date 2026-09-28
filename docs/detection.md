# Moteur de détection — fonctionnement et limites

Le filtre repère les données personnelles avec des règles (expressions régulières et clés de contrôle). Il ne comprend pas le sens du texte.

## Données reconnues

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

## Ce que le filtre ne trouve pas

- Les noms et prénoms de personnes.
- Les noms d'entreprises, de lieux ou de villes cités seuls.
- Les adresses sans numéro ni type de voie reconnu (« lieu-dit Les Pins »).
- Les numéros de téléphone écrits dans un format inhabituel (« 06-1234-5678 »).
- Les identifiants étrangers autres que les IBAN (numéros fiscaux, passeports, etc.).
- Les adresses IP écrites avec des zéros en tête (« 192.168.001.042 »).

## Détections partielles connues

- Un lien qui se termine par une parenthèse (« …/Foo_(bar) ») est masqué sans sa dernière parenthèse.
- Une adresse email dont la partie avant « @ » dépasse 64 caractères n'est masquée que sur ses 64 derniers caractères avant « @ ».
- Une adresse email dont l'extension de domaine dépasse 24 caractères n'est pas reconnue.

## Faux positifs connus

- Toutes les dates sont masquées, pas seulement les dates de naissance.
- Un numéro de version à quatre parties (« 1.2.3.4 ») est pris pour une adresse IP.
- Une suite de 13 à 19 chiffres qui respecte l'algorithme de Luhn est prise pour une carte bancaire.
- Un numéro international court (« +1 23 45 ») est pris pour un numéro de téléphone.
- L'adresse « sans code postal » peut englober jusqu'à quatre mots après le type de voie (« 3 rue Victor Hugo et »).

L'utilisateur peut démasquer un faux positif ou masquer un oubli à la main avant d'exporter.
