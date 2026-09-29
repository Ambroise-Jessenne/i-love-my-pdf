// Reliability check on realistic, entirely fictitious French and English documents.
// Every ⟦…⟧ span is personal data: in strict mode, each one must be masked in full.
import { beforeAll, describe, expect, it } from 'vitest';
import { detect } from './detect';
import type { Lexicon } from './lexicon';
import { annotated, realLexicon } from './testing/realLexicon';

const DOCUMENTS: Record<string, string> = {
  'certificat de scolarité': `Université Paris-Saclay Life sciences and Health
CERTIFICAT DE SCOLARITE
La Présidente de l'Université PARIS-SACLAY certifie que
⟦MARTIN CLARA⟧
Id. National : ⟦2310045078 K⟧
N° Etudiant : ⟦23104455⟧
Née le ⟦04/07/2001⟧
à ⟦VALENCE ( DROME )⟧
est régulièrement inscrite pour l'année universitaire 2025/2026
Année : DU Optométrie avancée
Régime d'inscription : Formation en apprentissage
Fait à ⟦Orsay⟧, le ⟦15/09/2025⟧
⟦Sophie DELCOURT⟧`,

  'attestation employeur': `ATTESTATION D'EMPLOI
Je soussigné, ⟦Marc Lefebvre⟧, directeur des ressources humaines de la société Boulangeries Réunies, atteste que Mme ⟦Julie Garnier⟧ est employée en CDI depuis le ⟦1er mars 2019⟧ en qualité de vendeuse.
Matricule : ⟦RH-00871⟧
Domiciliée ⟦14 avenue Jean Jaurès, 69007 Lyon⟧.
Fait à ⟦Villeurbanne⟧ le ⟦3 octobre 2025⟧.`,

  courriel: `Bonjour ⟦Thomas⟧,
Suite à notre échange, je vous transmets le dossier de ⟦Léa Moreau⟧. Vous pouvez la joindre au ⟦07 81 22 45 90⟧ ou par mail : ⟦lea.moreau@exemple.fr⟧.
Son numéro de client est le ⟦CL-448812⟧.
Bien cordialement,
⟦Antoine Roux⟧`,

  ordonnance: `Dr ⟦Hélène Petit⟧
Médecin généraliste
⟦8 rue des Lilas, 35000 Rennes⟧
Patient : ⟦Karim Benali⟧, né le ⟦22/11/1978⟧
N° de sécurité sociale : ⟦1 85 05 78 006 084 91⟧
Amoxicilline 1 g : 1 comprimé matin et soir pendant 6 jours.
⟦Rennes⟧, le ⟦5 janvier 2026⟧`,

  'quittance de loyer': `QUITTANCE DE LOYER
Bailleur : ⟦Georges Lambert⟧
Locataire : ⟦Inès Fournier⟧
Logement : ⟦3 place du Marché, 44000 Nantes⟧
Reçu la somme de 650,00 € pour le loyer d'octobre 2025.
IBAN du bailleur : ⟦FR76 3000 6000 0112 3456 7890 189⟧`,

  facture: `Facture n° ⟦F2025-10-0457⟧
Client : ⟦Nathalie Girard⟧
Adresse de livraison : ⟦27 boulevard Victor Hugo, 06000 Nice⟧
Téléphone : ⟦+33 6 45 78 12 09⟧
Total TTC : 149,90 €`,

  'courriel en anglais': `Hello ⟦Sarah⟧,
Please find attached the contract for ⟦John Smith⟧. He was born in ⟦Manchester⟧ on ⟦March 12, 1985⟧.
You can reach him at ⟦john.smith@example.com⟧.
Kind regards,
⟦Emily Clarke⟧`,

  'récit libre': `Hier, j'ai rencontré M. ⟦Kowalczyk⟧ à ⟦Besançon⟧ pour parler du projet.
Il m'a présenté sa collègue ⟦Aurélie⟧, qui vit à ⟦Montbéliard⟧ depuis 2015.`,

  'pièce d’identité': `Passeport n° ⟦19AB12345⟧ délivré le ⟦12/05/2020⟧ à ⟦Marseille⟧.
Nom : ⟦Nguyen⟧
Prénom : ⟦Minh Anh⟧
Signature : ⟦Paul Durand⟧`,

  'signature seule': `Merci pour votre retour rapide.
⟦Camille Rousseau⟧
Chargée de clientèle`,

  // Second batch, written after the rules without adjusting them to it.
  cv: `⟦Yasmine El Amrani⟧
⟦12 impasse des Érables, 31200 Toulouse⟧
⟦06 11 22 33 44⟧ – ⟦yasmine.elamrani@mail.fr⟧
Née le ⟦9 août 1996⟧ à ⟦Casablanca (Maroc)⟧
EXPÉRIENCE
2021-2025 : Chargée de projet chez Airbus, Blagnac`,

  'compte rendu médical': `Compte rendu de consultation du ⟦14 février 2025⟧
Mme ⟦Bernadette Chauvin⟧, 67 ans, adressée par le Dr ⟦Olivier Masson⟧ pour douleurs thoraciques.
Antécédents : diabète de type 2. Vit seule à ⟦Quimper⟧, sa fille ⟦Élodie⟧ passe chaque semaine.
Examen : TA 13/8, pouls 72.`,

  'message informel': `Salut ⟦Kevin⟧ ! Tu peux passer chez ⟦Mathilde⟧ ce soir ? Son code d'entrée c'est ⟦4589B⟧, 3e étage.
Sinon appelle ⟦Jérôme⟧ au ⟦06.52.87.41.10⟧.`,

  'contrat de travail': `ENTRE LES SOUSSIGNÉS :
La société TECHNOVA SAS, immatriculée au RCS de Lyon sous le numéro ⟦512 345 678⟧, représentée par M. ⟦Frédéric Brunet⟧, en sa qualité de Président,
ET
Monsieur ⟦Samuel Ortega⟧, né le ⟦2 juin 1990⟧ à ⟦Perpignan⟧, demeurant ⟦5 allée des Pins, 66000 Perpignan⟧, de nationalité espagnole,`,

  'lettre en anglais': `Dear Mr ⟦Anderson⟧,
Our client, ⟦Maria Gonzalez⟧, currently residing in ⟦Leeds⟧, has asked us to contact you regarding account number ⟦GB29 NWBK 6016 1331 9268 19⟧.
Yours sincerely,
⟦Oliver Bennett⟧`,

  'attestation CAF': `Allocataire n° ⟦4521789⟧
M. et Mme ⟦Dubois-Laurent⟧
Enfants à charge : ⟦Lucas⟧ et ⟦Chloé⟧
Montant versé en septembre : 312,45 €`,
};

let lexicon: Lexicon;
beforeAll(() => {
  lexicon = realLexicon();
});

function masked(text: string, strict: boolean): boolean[] {
  const covered = new Array<boolean>(text.length).fill(false);
  for (const d of detect(text, { lexicon, strict })) for (let i = d.start; i < d.end; i++) covered[i] = true;
  return covered;
}

describe('strict mode on fictitious documents', () => {
  for (const [name, source] of Object.entries(DOCUMENTS)) {
    it(`masks every piece of personal data: ${name}`, () => {
      const { text, secrets } = annotated(source);
      const covered = masked(text, true);
      const leaks = secrets.filter((s) => !covered.slice(s.start, s.end).every((c, i) => c || /\s/.test(s.value[i])));
      expect(leaks.map((s) => s.value)).toEqual([]);
    });
  }

  it('keeps most of the ordinary text readable', () => {
    let ordinary = 0;
    let overMasked = 0;
    for (const source of Object.values(DOCUMENTS)) {
      const { text, secrets } = annotated(source);
      const covered = masked(text, true);
      const secret = new Array<boolean>(text.length).fill(false);
      for (const s of secrets) for (let i = s.start; i < s.end; i++) secret[i] = true;
      for (let i = 0; i < text.length; i++) {
        if (secret[i] || /\s/.test(text[i])) continue;
        ordinary++;
        if (covered[i]) overMasked++;
      }
    }
    expect(overMasked / ordinary).toBeLessThan(0.12);
  });
});

describe('usual acronyms that are also first names', () => {
  it('never takes IBAN, BIC or TVA at the start of a line for a person', () => {
    const text = ['IBAN : FR76 3000 6000 0112 3456 7890 189', 'BIC : AGRIFRPP', 'TVA : 20 %'].join(String.fromCharCode(10));
    const types = detect(text, { lexicon, strict: true }).map((d) => d.type);
    expect(types).not.toContain('PERSONNE');
  });
});

describe('strict mode on pathological inputs', () => {
  const inputs: Array<[string, string]> = [
    ['capitalised words', 'Jean Dupont '.repeat(16_000)],
    ['capitals', 'ABCD EFGH '.repeat(20_000)],
    ['place formulas', 'née à Paris, '.repeat(15_000)],
    ['labels', 'N° : 12 '.repeat(25_000)],
    ['civilities', 'M. Mme Dr '.repeat(20_000)],
  ];
  for (const [name, text] of inputs) {
    it(`handles 200 000 characters of ${name} quickly`, () => {
      const started = performance.now();
      detect(text, { lexicon, strict: true });
      expect(performance.now() - started).toBeLessThan(4000);
    });
  }
});

describe('balanced mode on fictitious documents', () => {
  it('still masks the names, places and identifiers of the school certificate', () => {
    const { text, secrets } = annotated(DOCUMENTS['certificat de scolarité']);
    const covered = masked(text, false);
    const leaks = secrets.filter((s) => !covered.slice(s.start, s.end).every((c, i) => c || /\s/.test(s.value[i])));
    expect(leaks.map((s) => s.value)).toEqual([]);
  });
});
