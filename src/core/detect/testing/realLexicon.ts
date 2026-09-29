// Test helper: the real word lists, read from public/lexicon/ (Node only).
import { readFileSync } from 'node:fs';
import { LEXICON_FILES, parseLexicon, type Lexicon } from '../lexicon';

let cached: Lexicon | undefined;

export function realLexicon(): Lexicon {
  cached ??= parseLexicon(
    Object.fromEntries(
      Object.values(LEXICON_FILES)
        .flat()
        .map((file) => [file, readFileSync(`${process.cwd()}/public/lexicon/${file}`, 'utf8')]),
    ),
  );
  return cached;
}

/** Turns « Née à ⟦Valence⟧ » into its plain text and the spans that must be masked. */
export function annotated(source: string): { text: string; secrets: { start: number; end: number; value: string }[] } {
  let text = '';
  const secrets: { start: number; end: number; value: string }[] = [];
  let open = -1;
  for (const char of source) {
    if (char === '⟦') open = text.length;
    else if (char === '⟧') {
      secrets.push({ start: open, end: text.length, value: text.slice(open) });
      open = -1;
    } else text += char;
  }
  return { text, secrets };
}
