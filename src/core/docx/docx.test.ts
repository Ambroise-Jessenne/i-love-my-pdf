import { strFromU8, strToU8, unzipSync, zipSync } from 'fflate';
import { describe, expect, it } from 'vitest';
import { detect } from '../detect/detect';
import { redact } from '../redact/redact';
import { docxRedact, docxText } from './docx';

const W = 'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"';
const bold = (text: string) => `<w:r><w:rPr><w:b/></w:rPr><w:t xml:space="preserve">${text}</w:t></w:r>`;
const plain = (text: string) => `<w:r><w:t>${text}</w:t></w:r>`;
const para = (...runs: string[]) =>
  `<w:p><w:pPr><w:tabs><w:tab w:val="left" w:pos="720"/></w:tabs></w:pPr>${runs.join('')}</w:p>`;

function makeDocx(body: string, extra: Record<string, string> = {}): Uint8Array {
  const files: Record<string, Uint8Array> = {
    '[Content_Types].xml': strToU8('<?xml version="1.0" encoding="UTF-8"?><Types/>'),
    'word/document.xml': strToU8(
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document ${W}><w:body>${body}</w:body></w:document>`,
    ),
  };
  for (const [name, content] of Object.entries(extra)) files[name] = strToU8(content);
  return zipSync(files);
}

const part = (bytes: Uint8Array, name: string) => strFromU8(unzipSync(bytes)[name]);

describe('docxText', () => {
  it('joins runs, turns tabs and paragraphs into characters and decodes entities', () => {
    const bytes = makeDocx(
      para(bold('Bonjour '), plain('jean.du'), plain('pont@x.fr')) +
        para('<w:r><w:t>a</w:t><w:tab/><w:t>b &amp; c</w:t><w:br/><w:t/></w:r>'),
    );
    expect(docxText(bytes)).toBe('Bonjour jean.dupont@x.fr\na\tb & c\n\n');
  });

  it('reads headers and footers after the body', () => {
    const bytes = makeDocx(para(plain('Corps')), {
      'word/footer1.xml': `<w:ftr ${W}>${para(plain('Pied'))}</w:ftr>`,
      'word/header1.xml': `<w:hdr ${W}>${para(plain('Entête'))}</w:hdr>`,
    });
    expect(docxText(bytes)).toBe('Corps\nEntête\nPied\n');
  });

  it('accepts tracked changes: deleted text is gone, inserted text stays', () => {
    const bytes = makeDocx(
      '<w:p><w:ins w:id="1" w:author="Alice"><w:r><w:t>nouveau</w:t></w:r></w:ins>' +
        '<w:del w:id="2" w:author="Bob"><w:r><w:delText>ancien@x.fr</w:delText></w:r></w:del></w:p>',
    );
    expect(docxText(bytes)).toBe('nouveau\n');
  });
});

describe('docxRedact', () => {
  it('replaces a value split across runs and keeps the formatting', () => {
    const bytes = makeDocx(para(bold('Mail : jean.du'), plain('pont@x.fr'), plain(' merci')));
    const text = docxText(bytes);
    const out = docxRedact(bytes, detect(text));
    const xml = part(out, 'word/document.xml');
    expect(xml).toContain('<w:rPr><w:b/></w:rPr><w:t xml:space="preserve">Mail : [EMAIL_1]</w:t>');
    expect(xml).not.toContain('jean.du');
    expect(xml).not.toContain('pont@x.fr');
    expect(docxText(out)).toBe(redact(text, detect(text)));
  });

  it('marks rewritten text nodes to preserve spaces', () => {
    const bytes = makeDocx(para(plain('a@b.io')));
    const xml = part(docxRedact(bytes, detect(docxText(bytes))), 'word/document.xml');
    expect(xml).toContain('<w:t xml:space="preserve">[EMAIL_1]</w:t>');
  });

  it('filters headers and footers with the same labels as the body', () => {
    const bytes = makeDocx(para(plain('a@b.io')), {
      'word/footer1.xml': `<w:ftr ${W}>${para(plain('Contact a@b.io'))}</w:ftr>`,
    });
    const out = docxRedact(bytes, detect(docxText(bytes)));
    expect(part(out, 'word/footer1.xml')).toContain('Contact [EMAIL_1]');
  });

  it('drops deleted text and clears the names of authors', () => {
    const bytes = makeDocx(
      '<w:p><w:ins w:id="1" w:author="Alice"><w:r><w:t>ok</w:t></w:r></w:ins>' +
        '<w:del w:id="2" w:author="Bob"><w:r><w:delText>ancien@x.fr</w:delText></w:r></w:del></w:p>',
      {
        'word/comments.xml': `<w:comments ${W}><w:comment w:id="0" w:author="Bob" w:initials="B">${para(plain('vu'))}</w:comment></w:comments>`,
        'docProps/core.xml':
          '<cp:coreProperties xmlns:cp="c" xmlns:dc="d"><dc:title>Dossier Dupont</dc:title><dc:creator>Jean Dupont</dc:creator><cp:lastModifiedBy>Bob</cp:lastModifiedBy></cp:coreProperties>',
        'docProps/app.xml': '<Properties><Company>ACME</Company><Pages>1</Pages></Properties>',
      },
    );
    const out = docxRedact(bytes, []);
    const all = Object.values(unzipSync(out)).map((file) => strFromU8(file)).join('');
    for (const secret of ['ancien@x.fr', 'Alice', 'Bob', 'Jean Dupont', 'Dossier Dupont', 'ACME']) {
      expect(all).not.toContain(secret);
    }
    expect(part(out, 'word/document.xml')).toContain('<w:t>ok</w:t>');
    expect(part(out, 'docProps/app.xml')).toContain('<Pages>1</Pages>');
  });

  it('escapes special characters when it rewrites a text node', () => {
    const bytes = makeDocx(para(plain('R&amp;D : a@b.io &lt;fin&gt;')));
    const xml = part(docxRedact(bytes, detect(docxText(bytes))), 'word/document.xml');
    expect(xml).toContain('R&amp;D : [EMAIL_1] &lt;fin&gt;');
  });
});
