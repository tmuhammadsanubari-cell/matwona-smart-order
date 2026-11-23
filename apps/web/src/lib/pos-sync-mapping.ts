import {
  POS_PRODUCT_FIELD_LABEL,
  POS_REQUIRED_PRODUCT_FIELDS,
  type PosColumnMapping,
  type PosProductField,
} from 'shared';

/** Satu baris tabel pemetaan: kolom di file CSV → field Smart Order ("" = diabaikan). */
export interface MappingRow {
  header: string;
  field: PosProductField | '';
}

const normalize = (header: string) => header.trim().toLowerCase();

/** Pisahkan satu baris CSV dengan pemisah koma; tanda kutip ganda boleh membungkus koma. */
function splitCsvLine(line: string): string[] {
  const cells: string[] = [];
  let current = '';
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (quoted && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        quoted = !quoted;
      }
    } else if (ch === ',' && !quoted) {
      cells.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  cells.push(current);
  return cells;
}

/**
 * Judul kolom dari baris pertama file CSV (FR-013). Membuang BOM, kolom kosong, dan judul ganda
 * (server juga hanya membaca satu nilai per judul).
 */
export function readCsvHeaders(text: string): string[] {
  const firstLine = text.replace(/^﻿/, '').split(/\r?\n/).find((line) => line.trim() !== '');
  if (!firstLine) return [];
  const seen = new Set<string>();
  const headers: string[] = [];
  for (const cell of splitCsvLine(firstLine)) {
    const header = cell.trim();
    if (!header || seen.has(normalize(header))) continue;
    seen.add(normalize(header));
    headers.push(header);
  }
  return headers;
}

/** Isi awal pemetaan dari mapping tersimpan (pencocokan judul kolom tanpa beda huruf besar/kecil). */
export function buildMappingRows(headers: string[], saved: Record<string, string>): MappingRow[] {
  const byKey = new Map(Object.entries(saved).map(([key, field]) => [normalize(key), field]));
  return headers.map((header) => {
    const field = byKey.get(normalize(header));
    return { header, field: field && field in POS_PRODUCT_FIELD_LABEL ? (field as PosProductField) : '' };
  });
}

/** Pesan kesalahan pemetaan; kosong berarti siap dipratinjau. */
export function validateMappingRows(rows: MappingRow[]): string[] {
  const problems: string[] = [];
  const used = new Map<PosProductField, string[]>();
  for (const row of rows) {
    if (!row.field) continue;
    used.set(row.field, [...(used.get(row.field) ?? []), row.header]);
  }
  for (const field of POS_REQUIRED_PRODUCT_FIELDS) {
    if (!used.has(field)) problems.push(`Pilih kolom untuk field "${POS_PRODUCT_FIELD_LABEL[field]}".`);
  }
  for (const [field, headers] of used) {
    if (headers.length > 1) {
      problems.push(`Field "${POS_PRODUCT_FIELD_LABEL[field]}" dipakai lebih dari satu kolom: ${headers.join(', ')}.`);
    }
  }
  return problems;
}

/**
 * Mapping yang dikirim & disimpan: entri tersimpan untuk kolom lain tetap dipertahankan (agar file
 * dengan judul berbeda tetap terpetakan), entri untuk kolom file ini diganti pilihan admin.
 */
export function mergeMapping(saved: Record<string, string>, rows: MappingRow[]): PosColumnMapping {
  const current = new Set(rows.map((row) => normalize(row.header)));
  const merged: PosColumnMapping = {};
  for (const [key, field] of Object.entries(saved)) {
    if (current.has(normalize(key))) continue;
    if (field === '' || field in POS_PRODUCT_FIELD_LABEL) merged[key] = field as PosProductField | '';
  }
  for (const row of rows) merged[row.header] = row.field;
  return merged;
}
