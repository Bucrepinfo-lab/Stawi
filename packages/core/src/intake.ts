/**
 * Note intake — turn already-written minutes into structured, editable data.
 *
 * Two entry points feed this: a photo of handwritten/printed notes (OCR → text)
 * or an uploaded file (text extracted). Either way we get raw text; this module
 * makes a best-effort structured guess (attendance, agenda titles, resolutions,
 * money) that pre-fills the minutes form. The official always reviews before the
 * paraphraser (`minutes-prose.ts`) formalises it. Pure, deterministic, testable.
 */

export interface AttachmentMeta {
  /** Original file name, e.g. "june-minutes.jpg". */
  name: string;
  /** MIME type, e.g. "image/jpeg", "application/pdf". */
  mime: string;
  /** Size in bytes. */
  size: number;
  /** 'photo' (a captured/scanned image) or 'file' (a document). */
  kind: 'photo' | 'file';
}

export const ACCEPTED_IMAGE = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'];
export const ACCEPTED_DOC = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain'];
export const MAX_UPLOAD_BYTES = 15 * 1024 * 1024; // 15 MB

export function classifyUpload(mime: string): 'photo' | 'file' | null {
  if (ACCEPTED_IMAGE.includes(mime)) return 'photo';
  if (ACCEPTED_DOC.includes(mime)) return 'file';
  return null;
}

export function validateUpload(input: { mime: string; size: number }): { ok: boolean; error?: string; kind?: 'photo' | 'file' } {
  const kind = classifyUpload(input.mime);
  if (!kind) return { ok: false, error: 'Unsupported file. Use a photo (JPG/PNG) or a PDF/Word/text document.' };
  if (input.size > MAX_UPLOAD_BYTES) return { ok: false, error: 'File is too large (max 15 MB). Try a smaller photo.' };
  if (input.size <= 0) return { ok: false, error: 'That file looks empty.' };
  return { ok: true, kind };
}

export interface ParsedNotes {
  present: string[];
  absent: string[];
  apology: string[];
  agendas: { title: string; resolution: string }[];
  /** KES amounts detected, in cents, in the order they appear. */
  amountsCents: number[];
  /** ISO date if one was recognised. */
  date?: string;
  /** The cleaned raw text, always returned so the official can read/edit it. */
  rawText: string;
  /** How much structure we recovered: 'high' | 'some' | 'none'. */
  confidence: 'high' | 'some' | 'none';
}

function namesFrom(line: string): string[] {
  return line
    .replace(/^[^:]*:/, '')
    .split(/[,;]|\band\b|\d+\.|•|-\s/gi)
    .map((s) => s.trim())
    .filter((s) => s.length >= 2 && /[a-z]/i.test(s))
    .map((s) => s.replace(/\s+/g, ' '));
}

function parseAmountToCents(token: string): number | null {
  const m = token.replace(/,/g, '').match(/(?:kes|ksh|kshs|sh)?\s*([\d]+(?:\.\d{1,2})?)/i);
  if (!m) return null;
  const v = parseFloat(m[1]!);
  return isNaN(v) ? null : Math.round(v * 100);
}

/**
 * Best-effort extraction. Recognises common minute conventions:
 *   "Present: A, B, C"  ·  "Absent:"  ·  "Apologies:"
 *   "Agenda 1: …" / "AOB: …"  ·  "Resolved that …" / "Agreed: …"
 *   "KES 1,200" / "Ksh 500"  ·  a date line.
 * Nothing is assumed — unknown text is preserved in `rawText`.
 */
export function parseImportedNotes(raw: string): ParsedNotes {
  const text = (raw || '').replace(/\r/g, '').replace(/[ \t]+/g, ' ').trim();
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);

  const out: ParsedNotes = { present: [], absent: [], apology: [], agendas: [], amountsCents: [], rawText: text, confidence: 'none' };
  let hits = 0;

  for (const line of lines) {
    const low = line.toLowerCase();
    if (/^present\b|^members present\b/.test(low)) { out.present = namesFrom(line); hits++; continue; }
    if (/^absent\b/.test(low)) { out.absent = namesFrom(line); hits++; continue; }
    if (/^apolog/.test(low)) { out.apology = namesFrom(line); hits++; continue; }

    if (/^(agenda\s*\d*|aob)\b/i.test(line)) {
      const title = line.replace(/^(agenda\s*\d*[:.)-]*|aob[:.)-]*)/i, '').trim();
      out.agendas.push({ title: title || 'Agenda item', resolution: '' });
      hits++;
      continue;
    }
    if (/^(resolved|agreed|resolution)\b/i.test(line)) {
      const res = line.replace(/^(resolved that|resolved|agreed that|agreed|resolution[:-]?)/i, '').trim();
      if (out.agendas.length) out.agendas[out.agendas.length - 1]!.resolution = res;
      else out.agendas.push({ title: 'Resolution', resolution: res });
      hits++;
      continue;
    }
    if (!out.date) {
      const d = line.match(/\b(20\d{2})[-/.](\d{1,2})[-/.](\d{1,2})\b/) || line.match(/\b(\d{1,2})[-/.](\d{1,2})[-/.](20\d{2})\b/);
      if (d) {
        const iso = d[1]!.length === 4 ? `${d[1]}-${String(d[2]).padStart(2, '0')}-${String(d[3]).padStart(2, '0')}` : `${d[3]}-${String(d[2]).padStart(2, '0')}-${String(d[1]).padStart(2, '0')}`;
        out.date = iso; hits++;
      }
    }
    for (const tok of line.match(/(?:kes|ksh|kshs|sh)\s*[\d,]+(?:\.\d{1,2})?/gi) ?? []) {
      const c = parseAmountToCents(tok); if (c != null) { out.amountsCents.push(c); hits++; }
    }
  }

  out.confidence = hits >= 4 ? 'high' : hits >= 1 ? 'some' : 'none';
  return out;
}
