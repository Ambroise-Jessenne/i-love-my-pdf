export type PiiType =
  | 'EMAIL'
  | 'TELEPHONE'
  | 'IBAN'
  | 'NIR'
  | 'CARTE_BANCAIRE'
  | 'DATE'
  | 'ADRESSE'
  | 'IP'
  | 'URL'
  | 'IDENTIFIANT'
  | 'PERSONNE'
  | 'LIEU'
  | 'NOM_PROPRE'
  | 'MASQUE';

export interface Detection {
  id: string;
  type: PiiType;
  start: number;
  end: number;
  value: string;
}

export interface Rule {
  type: PiiType;
  /** Must carry the `g` flag. */
  pattern: RegExp;
  /** Breaks ties between detections of identical length. */
  priority: number;
  validate?: (match: string) => boolean;
}
