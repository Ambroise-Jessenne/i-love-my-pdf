import { expose } from 'comlink';
import { detect } from '../core/detect/detect';
import { LEXICON_FILES, parseLexicon, type Lexicon } from '../core/detect/lexicon';
import { docxRedact, docxText } from '../core/docx/docx';
import { assembleRedactedPdf } from '../core/pdf/assemble';
import { redact } from '../core/redact/redact';

let lexicon: Promise<Lexicon> | undefined;

/** Loads the word lists once, from the site itself. */
function loadLexicon(): Promise<Lexicon> {
  lexicon ??= Promise.all(
    Object.values(LEXICON_FILES)
      .flat()
      .map(async (file) => {
        const response = await fetch(`/lexicon/${file}`);
        if (!response.ok) throw new Error(`lexicon ${file}`);
        return [file, await response.text()] as const;
      }),
  ).then((entries) => parseLexicon(Object.fromEntries(entries)));
  lexicon.catch(() => {
    lexicon = undefined; // try again on the next analysis
  });
  return lexicon;
}

const api = {
  /** Starts loading the word lists ahead of the first analysis. */
  async prepare(): Promise<void> {
    await loadLexicon();
  },
  async detect(text: string, strict: boolean) {
    return detect(text, { lexicon: await loadLexicon(), strict });
  },
  redact,
  docxText,
  docxRedact,
  assembleRedactedPdf,
};

export type FilterApi = typeof api;

expose(api);
