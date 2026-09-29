import { describe, expect, it } from 'vitest';
import { isCommonWord, makeLexicon, normalizeKey, parseLexicon } from './lexicon';
import { tokenize } from './tokens';

describe('normalizeKey', () => {
  it('lowercases and removes accents', () => {
    expect(normalizeKey('DRÔME')).toBe('drome');
    expect(normalizeKey('Scolarité')).toBe('scolarite');
    expect(normalizeKey('d’Orsay')).toBe("d'orsay");
  });
});

describe('parseLexicon', () => {
  it('reads one entry per line, with Windows or Unix line ends, and merges the word files', () => {
    const lexicon = parseLexicon({ 'prenoms.txt': 'alicia\r\nestelle\r\n', 'mots.txt': 'chat\n', 'mots-en.txt': 'cat\n' });
    expect([...lexicon.firstNames]).toEqual(['alicia', 'estelle']);
    expect([...lexicon.words]).toEqual(['chat', 'cat']);
  });
});

describe('isCommonWord', () => {
  const lexicon = makeLexicon({ words: ['peut', 'être', 'paris'] });
  it('accepts listed words and compounds of listed words', () => {
    expect(isCommonWord(lexicon, 'peut-etre')).toBe(true);
    expect(isCommonWord(lexicon, 'paris-saclay')).toBe(false);
  });
});

describe('tokenize', () => {
  it('splits words, keeps hyphenated names and marks capitals and sentence starts', () => {
    const tokens = tokenize('LOMBARD Alicia, née à Saint-Denis. Fait à d’Orsay\nEstelle IACONA');
    expect(tokens.map((t) => [t.text, t.capitalized, t.allCaps, t.sentenceStart])).toEqual([
      ['LOMBARD', true, true, true],
      ['Alicia', true, false, false],
      ['née', false, false, false],
      ['à', false, false, false],
      ['Saint-Denis', true, false, false],
      ['Fait', true, false, true],
      ['à', false, false, false],
      ['d', false, false, false],
      ['Orsay', true, false, false],
      ['Estelle', true, false, true],
      ['IACONA', true, true, false],
    ]);
  });

  it('treats a bullet or an opening quote at the start of a line as a sentence start', () => {
    const [first, second, third] = tokenize('• Bonjour « Marie »\n« Merci');
    expect(first.sentenceStart).toBe(true);
    expect(second.sentenceStart).toBe(false);
    expect(third.sentenceStart).toBe(true);
  });
});
