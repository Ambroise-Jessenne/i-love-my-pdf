# Listes utilisées par le moteur de détection

Toutes les entrées sont normalisées : minuscules, sans accents, une par ligne. Elles sont servies par le site lui-même et chargées une seule fois par le worker de filtrage ; aucune n'est récupérée ailleurs pendant l'utilisation.

| Fichier | Contenu | Source | Licence |
|---|---|---|---|
| `prenoms.txt` | Prénoms donnés en France depuis 1900 (hors prénoms rares regroupés par l'INSEE) | INSEE, *Fichier des prénoms*, édition 2023 (données 1900–2022) | Licence Ouverte / Open Licence 2.0 (Etalab) |
| `noms.txt` | Noms de famille portés par au moins 50 personnes nées en France entre 1891 et 2000 | INSEE, *Les noms de famille en France*, fichier `noms2008nat` | Licence Ouverte / Open Licence 2.0 (Etalab) |
| `communes.txt` | Noms des communes françaises | API Découpage administratif, geo.api.gouv.fr | Licence Ouverte / Open Licence 2.0 (Etalab) |
| `territoires.txt` | Noms des départements et régions | API Découpage administratif, geo.api.gouv.fr | Licence Ouverte / Open Licence 2.0 (Etalab) |
| `mots.txt` | Mots français courants (formes fléchies) | Loren Brichter, *Words* (`fr.txt`), github.com/lorenbrichter/Words | CC0 1.0 (domaine public) |
| `mots-en.txt` | Mots anglais courants, pour ne pas masquer les textes anglais | Loren Brichter, *Words* (`en.txt`), github.com/lorenbrichter/Words | CC0 1.0 (domaine public) |

Listes générées le 29/09/2026.
