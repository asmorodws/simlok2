// Helpers to convert Date/ISO strings to Indonesia (Asia/Jakarta) timezone representation
// Returns machine-friendly ISO-like string with explicit +07:00 offset: YYYY-MM-DDTHH:mm:ss+07:00

function pad(n: number) {
  return n < 10 ? `0${n}` : `${n}`;
}

export function toJakartaISOString(input: Date | string | null | undefined): string | null {
  if (!input) return null;
  const date = typeof input === 'string' ? new Date(input) : input;
  if (Number.isNaN(date.getTime())) return null;

  // Use Intl to get the parts in Asia/Jakarta timezone
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  }).formatToParts(date);

  const map: Record<string, string> = {};
  for (const p of parts) {
    if (p.type && p.value) map[p.type] = p.value;
  }

  const y = map.year || String(date.getFullYear());
  const m = map.month || pad(date.getMonth() + 1);
  const d = map.day || pad(date.getDate());
  const hh = map.hour || pad(date.getHours());
  const mm = map.minute || pad(date.getMinutes());
  const ss = map.second || pad(date.getSeconds());

  // Jakarta is always +07:00 (no DST)
  return `${y}-${m}-${d}T${hh}:${mm}:${ss}+07:00`;
}

// Convert known date fields inside a submission object (shallow + known nested arrays)
export function formatSubmissionDates(submission: any) {
  if (!submission) return submission;

  const out = { ...submission } as any;

  const dateFields = [
    'created_at', 'updated_at', 'simlok_date', 'simja_date', 'sika_date',
    'reviewed_at', 'approved_at', 'implementation_start_date', 'implementation_end_date'
  ];

  for (const f of dateFields) {
    if (f in out) out[f] = toJakartaISOString(out[f]) || out[f];
  }

  // Support documents
  if (Array.isArray(out.support_documents)) {
    out.support_documents = out.support_documents.map((doc: any) => ({
      ...doc,
      document_date: toJakartaISOString(doc?.document_date) || doc?.document_date,
      uploaded_at: toJakartaISOString(doc?.uploaded_at) || doc?.uploaded_at,
    }));
  }

  // Worker list
  if (Array.isArray(out.worker_list)) {
    out.worker_list = out.worker_list.map((w: any) => ({
      ...w,
      hsse_pass_valid_thru: toJakartaISOString(w?.hsse_pass_valid_thru) || w?.hsse_pass_valid_thru,
      uploaded_at: toJakartaISOString(w?.uploaded_at) || w?.uploaded_at,
    }));
  }

  return out;
}

// Convert array of scans (qrScan) to Jakarta timezone
export function formatScansDates(scans: any[]) {
  if (!Array.isArray(scans)) return scans;
  return scans.map(s => ({
    ...s,
    scanned_at: toJakartaISOString(s?.scanned_at) || s?.scanned_at
  }));
}
