import { strFromU8, strToU8, unzipSync, zipSync } from 'fflate';
import type { Detection } from '../detect/types';
import { planReplacements, type Replacement } from '../redact/labels';
import { acceptTrackedChanges, clearAuthors, rewritePart, scanPart, type ScannedPart } from './xml';

interface Part {
  name: string;
  xml: string;
  scanned: ScannedPart;
  /** Offset of this part's text in the whole document text. */
  offset: number;
}

// Parts whose text is shown to the reader, in reading order.
const PART_ORDER = [/^word\/document\.xml$/, /^word\/header\d*\.xml$/, /^word\/footer\d*\.xml$/, /^word\/footnotes\.xml$/, /^word\/endnotes\.xml$/, /^word\/comments\.xml$/];

function readParts(files: Record<string, Uint8Array>): { parts: Part[]; text: string } {
  const names = Object.keys(files).sort();
  const parts: Part[] = [];
  let text = '';
  for (const pattern of PART_ORDER) {
    for (const name of names.filter((n) => pattern.test(n))) {
      const xml = acceptTrackedChanges(strFromU8(files[name]));
      const scanned = scanPart(xml);
      parts.push({ name, xml, scanned, offset: text.length });
      text += scanned.text.endsWith('\n') || scanned.text === '' ? scanned.text : `${scanned.text}\n`;
    }
  }
  return { parts, text };
}

/** Text of a Word document: body, headers, footers, notes and comments; one line per paragraph. */
export function docxText(bytes: Uint8Array): string {
  return readParts(unzipSync(bytes)).text;
}

/** Word document where every detection (positions in `docxText`) is replaced by its label, formatting kept. */
export function docxRedact(bytes: Uint8Array, detections: Detection[]): Uint8Array {
  const files = unzipSync(bytes);
  const { parts } = readParts(files);
  const plan = planReplacements(detections);
  const emitted = new Set<Replacement>();

  for (const part of parts) {
    const texts = part.scanned.nodes.map((node) => {
      const start = part.offset + node.textStart;
      const end = start + node.text.length;
      const touching = plan.filter((r) => r.start < end && start < r.end);
      if (touching.length === 0) return null;
      let output = '';
      for (let i = 0; i < node.text.length; i++) {
        const replacement = touching.find((r) => r.start <= start + i && start + i < r.end);
        if (!replacement) {
          output += node.text[i];
        } else if (!emitted.has(replacement)) {
          // The label goes where the value starts; the rest of the value, even in later runs, is removed.
          output += replacement.label;
          emitted.add(replacement);
        }
      }
      return output;
    });
    files[part.name] = strToU8(clearAuthors(rewritePart(part.xml, part.scanned.nodes, texts)));
  }

  for (const name of Object.keys(files)) {
    if (/^word\/.*\.xml$/.test(name) && !parts.some((p) => p.name === name)) {
      files[name] = strToU8(clearAuthors(strFromU8(files[name])));
    }
  }
  if (files['docProps/core.xml']) {
    files['docProps/core.xml'] = strToU8(
      strFromU8(files['docProps/core.xml']).replace(
        /<(dc:creator|cp:lastModifiedBy|dc:title|dc:subject|dc:description|cp:keywords)(\s[^>]*)?>[\s\S]*?<\/\1>/g,
        '<$1$2></$1>',
      ),
    );
  }
  if (files['docProps/app.xml']) {
    files['docProps/app.xml'] = strToU8(
      strFromU8(files['docProps/app.xml']).replace(/<(Company|Manager)>[\s\S]*?<\/\1>/g, '<$1></$1>'),
    );
  }
  return zipSync(files);
}
