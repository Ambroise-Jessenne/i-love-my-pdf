import { describe, expect, it } from 'vitest';
import { labelledIdentifiers, strictIdentifiers } from './identifiers';

const values = (found: { value: string }[]) => found.map((d) => d.value);

describe('labelledIdentifiers', () => {
  it('masks the value after an identifier label, with or without a colon', () => {
    const text = [
      'Id. National : 1710026022 C',
      'N° Etudiant : 22111434',
      'Dossier n°AB-2024-0042 en cours',
      'Numéro de contrat: 77 123 456',
      'Matricule 008421',
      'Réf. client : CLI 00457 du 3 mars',
    ].join('\n');
    expect(values(labelledIdentifiers(text))).toEqual([
      '1710026022 C',
      '22111434',
      'AB-2024-0042',
      '77 123 456',
      '008421',
      'CLI 00457',
    ]);
  });

  it('ignores labels followed by words rather than a code', () => {
    expect(labelledIdentifiers('Votre dossier : complet. Le client : satisfait. Carte grise à jour.')).toEqual([]);
  });

  it('labels its detections IDENTIFIANT', () => {
    expect(labelledIdentifiers('INE : 1234567890A')[0]).toMatchObject({ type: 'IDENTIFIANT', value: '1234567890A' });
  });
});

describe('strictIdentifiers', () => {
  it('masks long numbers and codes mixing capitals and digits', () => {
    expect(values(strictIdentifiers('Élève 22111434, plaque AB-123-CD, code X7G2P9, lot 2025.'))).toEqual([
      '22111434',
      'AB-123-CD',
      'X7G2P9',
    ]);
  });

  it('leaves years, amounts and short numbers alone', () => {
    expect(strictIdentifiers('Année 2025/2026, total 12345,50 €, 15000 €, 250 pièces, 4 %')).toEqual([]);
  });

  it('masks grouped digits that form a long number', () => {
    expect(values(strictIdentifiers('SIREN 732 829 320 enregistré'))).toEqual(['732 829 320']);
  });
});
