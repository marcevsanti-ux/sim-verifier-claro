const SIMS_DB = require('./simsDb');

// Secondary index by línea
const DB_BY_LINEA = {};
for (const [serie, data] of Object.entries(SIMS_DB)) {
  if (data.linea) DB_BY_LINEA[data.linea] = data;
}

// All unique 10-digit prefixes
const KNOWN_PREFIXES = [...new Set(Object.keys(SIMS_DB).map(s => s.slice(0, 10)).filter(p => /^\d{10}$/.test(p)))];

function lookupSIM(number) {
  const clean = String(number).replace(/\s/g, '');

  // 1. Direct match by full serie
  if (SIMS_DB[clean]) return { found: true, ...SIMS_DB[clean] };

  // 2. Match by línea
  if (DB_BY_LINEA[clean]) return { found: true, ...DB_BY_LINEA[clean] };

  // 3. Suffix logic: chip bottom number = suffix after 10-digit prefix
  if (/^\d{7,11}$/.test(clean)) {
    for (const prefix of KNOWN_PREFIXES) {
      const candidates = [
        prefix + clean,
        prefix + clean + '0',
        clean.startsWith('0') ? prefix + clean.slice(1) : null,
      ].filter(Boolean);
      for (const c of candidates) {
        if (SIMS_DB[c]) return { found: true, ...SIMS_DB[c] };
      }
    }
  }

  // 4. Suffix match — last 9 digits across all series
  if (clean.length >= 7) {
    const suffix = clean.slice(-9);
    for (const [serie, data] of Object.entries(SIMS_DB)) {
      if (serie.endsWith(suffix) || serie.endsWith(suffix + '0')) {
        return { found: true, ...data };
      }
    }
  }

  // 5. Línea sin cero inicial
  const noLeading = clean.replace(/^0+/, '');
  if (DB_BY_LINEA[noLeading]) return { found: true, ...DB_BY_LINEA[noLeading] };

  return { found: false, number: clean };
}

module.exports = { lookupSIM };
