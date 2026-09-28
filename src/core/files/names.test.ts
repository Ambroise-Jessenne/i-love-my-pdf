import { describe, expect, it } from 'vitest';
import { filteredName } from './names';

describe('filteredName', () => {
  it.each([
    ['note.txt', 'note_prv.txt'],
    ['contrat.final.txt', 'contrat.final_prv.txt'],
    ['README', 'README_prv.txt'],
    ['.env', '.env_prv.txt'],
    ['', 'texte_prv.txt'],
  ])('%j → %j', (input, expected) => {
    expect(filteredName(input)).toBe(expected);
  });

  it.each([
    ['rapport.pdf', '.txt', 'rapport_prv.txt'],
    ['lettre.docx', '.docx', 'lettre_prv.docx'],
    ['', '.pdf', 'texte_prv.pdf'],
  ])('%j with extension %j → %j', (input, extension, expected) => {
    expect(filteredName(input, extension)).toBe(expected);
  });
});
