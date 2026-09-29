// Turns the simple HTML produced by mammoth from a Word document into blocks ready to lay out, without a DOM
// (it runs in a Web Worker).

export interface TextInline {
  text: string;
  bold: boolean;
  italic: boolean;
}
export interface ImageInline {
  image: { type: 'png' | 'jpg'; data: Uint8Array };
}
export interface BreakInline {
  lineBreak: true;
}
export type Inline = TextInline | ImageInline | BreakInline;

export type DocBlock =
  | { kind: 'heading'; level: number; inlines: Inline[] }
  | { kind: 'paragraph'; inlines: Inline[] }
  | { kind: 'listItem'; ordered: boolean; level: number; number: number; inlines: Inline[] }
  | { kind: 'table'; rows: Inline[][][] };

const TOKEN = /<(\/?)([a-z0-9]+)([^>]*?)(\/?)>|([^<]+)/gi;
const ENTITIES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };

function decode(text: string): string {
  return text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (whole, name: string) => {
    if (name[0] !== '#') return ENTITIES[name.toLowerCase()] ?? whole;
    return String.fromCodePoint(name[1].toLowerCase() === 'x' ? parseInt(name.slice(2), 16) : parseInt(name.slice(1), 10));
  });
}

function dataImage(attributes: string): ImageInline | null {
  const match = /src="data:image\/(png|jpeg|jpg);base64,([^"]+)"/i.exec(attributes);
  if (!match) return null; // only PNG and JPEG can be embedded in a PDF by pdf-lib
  const binary = atob(match[2]);
  const data = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) data[i] = binary.charCodeAt(i);
  return { image: { type: match[1].toLowerCase() === 'png' ? 'png' : 'jpg', data } };
}

export function parseMammothHtml(html: string): DocBlock[] {
  const blocks: DocBlock[] = [];
  let bold = 0;
  let italic = 0;
  let buffer: Inline[] | null = null; // inline content being collected
  let blockTag: { kind: 'heading' | 'paragraph'; level: number } | null = null;
  const lists: { ordered: boolean; count: number; item: { inlines: Inline[]; number: number } | null }[] = [];
  let table: { rows: Inline[][][]; row: Inline[][] | null; cell: Inline[] | null } | null = null;

  const target = (): Inline[] => {
    if (table?.cell) return table.cell;
    const list = lists[lists.length - 1];
    if (list?.item) return list.item.inlines;
    buffer ??= [];
    return buffer;
  };
  const addBreakIfNotEmpty = (inlines: Inline[]) => {
    if (inlines.length > 0) inlines.push({ lineBreak: true });
  };
  const flushListItem = () => {
    const list = lists[lists.length - 1];
    if (list?.item && list.item.inlines.length > 0) {
      blocks.push({ kind: 'listItem', ordered: list.ordered, level: lists.length - 1, number: list.item.number, inlines: list.item.inlines });
    }
    if (list) list.item = null;
  };

  for (const match of html.matchAll(TOKEN)) {
    const [, closing, rawName, attributes, , text] = match;
    if (text !== undefined) {
      const value = decode(text);
      if (!value.trim() && !buffer && !table?.cell && !lists[lists.length - 1]?.item) continue;
      target().push({ text: value, bold: bold > 0, italic: italic > 0 });
      continue;
    }
    const name = rawName.toLowerCase();
    const open = closing !== '/';
    switch (name) {
      case 'strong':
      case 'b':
        bold += open ? 1 : -1;
        break;
      case 'em':
      case 'i':
        italic += open ? 1 : -1;
        break;
      case 'br':
        target().push({ lineBreak: true });
        break;
      case 'img': {
        const image = dataImage(attributes);
        if (image) target().push(image);
        break;
      }
      case 'p':
      case 'h1':
      case 'h2':
      case 'h3':
      case 'h4':
      case 'h5':
      case 'h6':
        if (table?.cell || lists[lists.length - 1]?.item) {
          if (open) addBreakIfNotEmpty(target()); // several paragraphs in a cell or an item
        } else if (open) {
          buffer = [];
          blockTag = name === 'p' ? { kind: 'paragraph', level: 0 } : { kind: 'heading', level: Number(name[1]) };
        } else if (buffer && blockTag) {
          if (buffer.length > 0) {
            blocks.push(blockTag.kind === 'heading' ? { kind: 'heading', level: blockTag.level, inlines: buffer } : { kind: 'paragraph', inlines: buffer });
          }
          buffer = null;
          blockTag = null;
        }
        break;
      case 'ul':
      case 'ol':
        if (open) {
          flushListItem(); // the parent item's own text comes before its sub-items
          lists.push({ ordered: name === 'ol', count: 0, item: null });
        } else {
          flushListItem();
          lists.pop();
        }
        break;
      case 'li': {
        const list = lists[lists.length - 1];
        if (!list) break;
        if (open) {
          list.count += 1;
          list.item = { inlines: [], number: list.count };
        } else flushListItem();
        break;
      }
      case 'table':
        if (open) table = { rows: [], row: null, cell: null };
        else if (table) {
          if (table.rows.length > 0) blocks.push({ kind: 'table', rows: table.rows });
          table = null;
        }
        break;
      case 'tr':
        if (!table) break;
        if (open) table.row = [];
        else if (table.row) {
          table.rows.push(table.row);
          table.row = null;
        }
        break;
      case 'td':
      case 'th':
        if (!table?.row) break;
        if (open) {
          table.cell = [];
          if (name === 'th') bold += 1;
        } else if (table.cell) {
          table.row.push(table.cell);
          table.cell = null;
          if (name === 'th') bold -= 1;
        }
        break;
      default:
        break; // links, underline, superscript…: their text is kept as plain text
    }
  }
  return blocks;
}
