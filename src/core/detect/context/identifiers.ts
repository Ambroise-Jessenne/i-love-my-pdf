import type { Candidate } from '../resolve';

// Words that announce an identifier: « Id. National : … », « N° Etudiant : … », « Matricule 0042 »…
const LABEL =
  /(?<![\p{L}\d])(?:n°|n[oº]\.?(?=\s*[:\d])|(?:id(?:entifiant)?s?|num(?:é|e)ros?|num\.?|matricule|ine|r[ée]f(?:[ée]rence)?s?\.?|dossier|contrat|client|adh[ée]rent|compte|passeport|permis|carte|badge|licence|siret|siren|tva|allocataire|s[ée]curit[ée] sociale|immatriculation|police|sinistre|facture|commande|ticket|code)(?![\p{L}]))/giu;

// After the label: a few words and a colon (« Id. National : »), or the value right away (« n°AB12 », « Matricule 0042 »).
const WITH_COLON = /^[^:\n]{0,40}?:[ \t ]*/;
const DIRECT = /^[ \t °]*/;
const CHUNK = /^[A-Za-z0-9][A-Za-z0-9./_-]*/;

export const LABELLED_PRIORITY = 28; // below structured rules: « N° de téléphone : 06… » stays a TELEPHONE
export const STRICT_PRIORITY = 15;

function identifier(text: string, start: number, end: number, priority: number): Candidate {
  return { id: `IDENTIFIANT-${start}-${end}`, type: 'IDENTIFIANT', start, end, value: text.slice(start, end), priority };
}

/** Reads a code starting at `from`: chunks separated by single spaces, each holding a digit or being a short
 *  capital suffix (« 1710026022 C », « CLI 00457 »). Returns its end, or -1 if it holds fewer than two digits. */
function readCode(text: string, from: number): number {
  let position = from;
  let end = -1;
  let digits = 0;
  while (position < text.length) {
    const chunk = CHUNK.exec(text.slice(position, position + 64))?.[0];
    if (!chunk) break;
    const hasDigit = /\d/.test(chunk);
    const shortCapitals = /^[A-Z]{1,3}$/.test(chunk);
    if (!hasDigit && !shortCapitals) break;
    digits += chunk.replace(/\D/g, '').length;
    position += chunk.length;
    if (hasDigit || digits > 0) end = position;
    if (text[position] !== ' ' || !/[A-Za-z0-9]/.test(text[position + 1] ?? '')) break;
    position += 1;
  }
  return digits >= 2 ? end : -1;
}

export function labelledIdentifiers(text: string): Candidate[] {
  const found = new Map<string, Candidate>(); // « Numéro de contrat : … » holds two labels for one value
  for (const match of text.matchAll(LABEL)) {
    const after = match.index + match[0].length;
    const rest = text.slice(after, after + 80);
    const lead = WITH_COLON.exec(rest) ?? DIRECT.exec(rest);
    if (!lead) continue;
    const start = after + lead[0].length;
    const end = readCode(text, start);
    if (end > start) found.set(`${start}-${end}`, identifier(text, start, end, LABELLED_PRIORITY));
  }
  return [...found.values()];
}

const LONG_NUMBER = /(?<![\p{L}\d,.])\d{5,}(?![\p{L}\d]|[.,]\d|\s?(?:€|%|eur\b|euros?\b))/giu;
const GROUPED_NUMBER = /(?<![\p{L}\d,.])\d{2,4}(?:[ .]\d{2,4}){2,}(?![\p{L}\d]|[.,]\d|\s?(?:€|%|eur\b|euros?\b))/giu;
const MIXED_CODE = /(?<![\p{L}\d])(?=[A-Z0-9-]*\d)(?=[A-Z0-9-]*[A-Z])[A-Z0-9](?:[A-Z0-9-]*[A-Z0-9]){4,}(?![\p{L}\d])/gu;

/** Strict mode: long numbers and codes mixing capitals and digits, whatever precedes them. */
export function strictIdentifiers(text: string): Candidate[] {
  const found: Candidate[] = [];
  for (const pattern of [LONG_NUMBER, GROUPED_NUMBER, MIXED_CODE]) {
    for (const match of text.matchAll(pattern)) {
      if (pattern === GROUPED_NUMBER && match[0].replace(/\D/g, '').length < 7) continue;
      found.push(identifier(text, match.index, match.index + match[0].length, STRICT_PRIORITY));
    }
  }
  return found;
}
