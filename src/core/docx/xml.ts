// Minimal WordprocessingML text handling with regular expressions, so it runs in a Web Worker (no DOMParser).

export interface TextNode {
  /** Position of the whole `<w:t …>…</w:t>` element in the XML. */
  start: number;
  end: number;
  openTag: string;
  /** Decoded text of the node. */
  text: string;
  /** Offset of `text` in the part's text. */
  textStart: number;
}

export interface ScannedPart {
  text: string;
  nodes: TextNode[];
}

// Text nodes, empty text nodes, tab characters (`<w:tab/>` without attributes; tab stops carry attributes),
// line breaks and paragraph ends — in document order.
const TOKEN = /<w:t(\s[^>]*)?>([^<]*)<\/w:t>|<w:t(\s[^>]*)?\/>|<w:tab\/>|<w:(?:br|cr)(?:\s[^>]*)?\/>|<\/w:p>/g;

export function scanPart(xml: string): ScannedPart {
  let text = '';
  const nodes: TextNode[] = [];
  for (const match of xml.matchAll(TOKEN)) {
    const token = match[0];
    if (match[2] !== undefined) {
      const decoded = decodeXml(match[2]);
      nodes.push({
        start: match.index,
        end: match.index + token.length,
        openTag: token.slice(0, token.indexOf('>') + 1),
        text: decoded,
        textStart: text.length,
      });
      text += decoded;
    } else if (token === '<w:tab/>') {
      text += '\t';
    } else if (!token.startsWith('<w:t')) {
      text += '\n';
    }
  }
  return { text, nodes };
}

/** Replaces the text of the nodes whose entry in `texts` is not null. */
export function rewritePart(xml: string, nodes: TextNode[], texts: (string | null)[]): string {
  let output = '';
  let cursor = 0;
  nodes.forEach((node, index) => {
    const text = texts[index];
    if (text === null) return;
    const openTag = /xml:space=/.test(node.openTag) ? node.openTag : node.openTag.replace('<w:t', '<w:t xml:space="preserve"');
    output += xml.slice(cursor, node.start) + `${openTag}${encodeXml(text)}</w:t>`;
    cursor = node.end;
  });
  return output + xml.slice(cursor);
}

/** Accepts tracked changes: deleted and moved-away content is dropped, insertions are kept as plain content. */
export function acceptTrackedChanges(xml: string): string {
  return xml
    .replace(/<w:(?:del|ins|moveFrom|moveTo)\b[^>]*\/>/g, '')
    .replace(/<w:del\b[^>]*>[\s\S]*?<\/w:del>/g, '')
    .replace(/<w:moveFrom\b[^>]*>[\s\S]*?<\/w:moveFrom>/g, '')
    .replace(/<\/?w:(?:ins|moveTo)\b[^>]*>/g, '');
}

/** Empties author names and initials (comments, tracked changes, people list). */
export function clearAuthors(xml: string): string {
  return xml.replace(/\b(w\d*:author|w:initials)="[^"]*"/g, '$1=""');
}

const ENTITIES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" };

export function decodeXml(value: string): string {
  return value.replace(/&(#x[0-9a-f]+|#\d+|amp|lt|gt|quot|apos);/gi, (whole, name: string) => {
    if (name[0] !== '#') return ENTITIES[name.toLowerCase()] ?? whole;
    const code = name[1].toLowerCase() === 'x' ? parseInt(name.slice(2), 16) : parseInt(name.slice(1), 10);
    return String.fromCodePoint(code);
  });
}

export function encodeXml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
