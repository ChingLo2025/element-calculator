// Formula formatter per spec §3.6.
// Elements printed in fixed order [C,H,O,N,S,P], then remaining alphabetically.
// Count of 1 is omitted.
// Non-monoisotopic nuclides carry a bracket prefix, e.g. [13C], [15N], [37Cl].
//
// counts is keyed by ElementRow.id, so callers must supply the rows to look up
// which nuclide each id refers to.

import { DISPLAY_ORDER } from '../data/displayOrder.js';

// Build an intermediate structure { element -> array of { nuclide, count } }
// then emit in the required order.
function groupByElement(countsByRowId, rows) {
  const groups = {}; // element -> [{ nuclide, count, isMono }]
  for (const row of rows) {
    const n = countsByRowId[row.id] || 0;
    if (n <= 0) continue;
    const el = row.nuclide.element;
    if (!groups[el]) groups[el] = [];
    groups[el].push({ nuclide: row.nuclide, count: n });
  }
  return groups;
}

function symbolFor(nuclide) {
  if (nuclide.isMonoisotopic) return nuclide.element;
  return `[${nuclide.massNumber}${nuclide.element}]`;
}

function emitElement(entries) {
  // Sort within an element: monoisotope first, then isotopes by massNumber.
  const sorted = [...entries].sort((a, b) => {
    if (a.nuclide.isMonoisotopic !== b.nuclide.isMonoisotopic) {
      return a.nuclide.isMonoisotopic ? -1 : 1;
    }
    return a.nuclide.massNumber - b.nuclide.massNumber;
  });
  let out = '';
  for (const { nuclide, count } of sorted) {
    out += symbolFor(nuclide);
    if (count > 1) out += String(count);
  }
  return out;
}

export function formatFormula(countsByRowId, rows) {
  const groups = groupByElement(countsByRowId, rows);
  const seen = new Set();
  const parts = [];
  for (const sym of DISPLAY_ORDER) {
    if (groups[sym]) {
      parts.push(emitElement(groups[sym]));
      seen.add(sym);
    }
  }
  const remaining = Object.keys(groups).filter((sym) => !seen.has(sym)).sort();
  for (const sym of remaining) {
    parts.push(emitElement(groups[sym]));
  }
  return parts.join('');
}

// Same idea but from an { element -> count } object (used by Stage 3 ion display).
export function formatIonFormula(elementCounts) {
  const parts = [];
  const seen = new Set();
  for (const sym of DISPLAY_ORDER) {
    const n = elementCounts[sym];
    if (n && n > 0) {
      parts.push(sym + (n > 1 ? String(n) : ''));
      seen.add(sym);
    }
  }
  const remaining = Object.keys(elementCounts).filter((s) => !seen.has(s) && elementCounts[s] > 0).sort();
  for (const sym of remaining) {
    const n = elementCounts[sym];
    parts.push(sym + (n > 1 ? String(n) : ''));
  }
  return parts.join('');
}
