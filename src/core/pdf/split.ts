import { PDFDocument } from 'pdf-lib';
import { APP_NAME } from './merge';

/** A new PDF with the given pages (0-based indices), in the given order. */
export async function extractPages(bytes: Uint8Array, pages: number[]): Promise<Uint8Array> {
  return (await splitPdf(bytes, [pages]))[0];
}

/** One new PDF per group of pages (0-based indices). The source is read only once. */
export async function splitPdf(bytes: Uint8Array, groups: number[][]): Promise<Uint8Array[]> {
  const source = await PDFDocument.load(bytes);
  const outputs: Uint8Array[] = [];
  for (const group of groups) {
    const output = await PDFDocument.create();
    for (const page of await output.copyPages(source, group)) output.addPage(page);
    output.setCreator(APP_NAME);
    output.setProducer(APP_NAME);
    outputs.push(await output.save());
  }
  return outputs;
}

export type RangesResult = { groups: number[][] } | { error: 'empty' | 'syntax' | 'bounds' };

/** Reads « 1-3, 4-6, 7 » (1-based, inclusive) into groups of 0-based page indices. */
export function parseRanges(input: string, pageCount: number): RangesResult {
  const parts = input
    .split(/[,;]/)
    .map((part) => part.trim())
    .filter(Boolean);
  if (parts.length === 0) return { error: 'empty' };
  const groups: number[][] = [];
  for (const part of parts) {
    const match = /^(\d+)(?:\s*[-–]\s*(\d+))?$/.exec(part);
    if (!match) return { error: 'syntax' };
    const from = Number(match[1]);
    const to = match[2] ? Number(match[2]) : from;
    if (from < 1 || to > pageCount || from > to) return { error: 'bounds' };
    groups.push(Array.from({ length: to - from + 1 }, (_, i) => from - 1 + i));
  }
  return { groups };
}

/** « 1-3 » for a run of pages, « p4 » for a single page — used in file names. */
export function groupLabel(group: number[]): string {
  const first = group[0] + 1;
  const last = group[group.length - 1] + 1;
  return group.length === 1 ? `p${first}` : `${first}-${last}`;
}
