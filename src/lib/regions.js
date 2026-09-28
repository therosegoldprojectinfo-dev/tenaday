// src/lib/regions.js
//
// Country → regions + accurate grade labels for ages 5–11.
// Grade lists are trimmed to Numio's target age range (5–11 years old).
// Each country uses its real local grade names, not generic "Grade 1–6".
//
// Flag emoji is derived from ISO 3166-1 alpha-2 code via Unicode
// Regional Indicator letters — no external CDN needed.
//
// getGradesForCountryRegion(countryCode, region?) returns the grade
// list for that country (and optionally region, e.g. Quebec vs Ontario).

// ── Flag emoji helper ────────────────────────────────────────────────
// Converts "CA" → "🇨🇦" by mapping each letter to its Regional Indicator.
export function getFlagEmoji(code) {
  if (!code || code.length !== 2) return ''
  return String.fromCodePoint(
    ...code.toUpperCase().split('').map(c => 0x1F1E6 + c.charCodeAt(0) - 65)
  )
}

// ── Countries ────────────────────────────────────────────────────────
export const COUNTRIES = [
  // ── North America ──────────────────────────────────────────────
  {
    code: 'CA', name: 'Canada',
    regions: ['Alberta', 'British Columbia', 'Manitoba', 'New Brunswick',
      'Newfoundland and Labrador', 'Nova Scotia', 'Ontario',
      'Prince Edward Island', 'Quebec', 'Saskatchewan'],
  },
  {
    code: 'US', name: 'United States',
    regions: ['Alabama','Alaska','Arizona','Arkansas','California','Colorado',
      'Connecticut','Delaware','Florida','Georgia','Hawaii','Idaho','Illinois',
      'Indiana','Iowa','Kansas','Kentucky','Louisiana','Maine','Maryland',
      'Massachusetts','Michigan','Minnesota','Mississippi','Missouri','Montana',
      'Nebraska','Nevada','New Hampshire','New Jersey','New Mexico','New York',
      'North Carolina','North Dakota','Ohio','Oklahoma','Oregon','Pennsylvania',
      'Rhode Island','South Carolina','South Dakota','Tennessee','Texas','Utah',
      'Vermont','Virginia','Washington','West Virginia','Wisconsin','Wyoming'],
  },
  {
    code: 'MX', name: 'Mexico', regions: null,
  },
  {
    code: 'BR', name: 'Brazil', regions: null,
  },

  // ── Europe ─────────────────────────────────────────────────────
  {
    code: 'GB', name: 'United Kingdom',
    regions: ['England', 'Scotland', 'Wales', 'Northern Ireland'],
  },
  { code: 'FR', name: 'France',       regions: null },
  { code: 'BE', name: 'Belgium',      regions: null },
  { code: 'CH', name: 'Switzerland',  regions: null },
  { code: 'DE', name: 'Germany',
    regions: ['Baden-Württemberg','Bavaria','Berlin','Hamburg',
      'Hesse','North Rhine-Westphalia','Saxony'],
  },
  { code: 'ES', name: 'Spain',        regions: null },
  { code: 'PT', name: 'Portugal',     regions: null },
  { code: 'IT', name: 'Italy',        regions: null },
  { code: 'NL', name: 'Netherlands',  regions: null },
  { code: 'IE', name: 'Ireland',      regions: null },

  // ── Oceania ────────────────────────────────────────────────────
  {
    code: 'AU', name: 'Australia',
    regions: ['New South Wales','Queensland','South Australia',
      'Tasmania','Victoria','Western Australia',
      'Australian Capital Territory','Northern Territory'],
  },
  { code: 'NZ', name: 'New Zealand',  regions: null },

  // ── Africa ─────────────────────────────────────────────────────
  {
    code: 'ZA', name: 'South Africa',
    regions: ['Eastern Cape','Free State','Gauteng','KwaZulu-Natal',
      'Limpopo','Mpumalanga','Northern Cape','North West','Western Cape'],
  },
  { code: 'MA', name: 'Morocco',      regions: null },
  { code: 'TN', name: 'Tunisia',      regions: null },
  { code: 'DZ', name: 'Algeria',      regions: null },
  { code: 'EG', name: 'Egypt',        regions: null },
  { code: 'NG', name: 'Nigeria',
    regions: ['Abuja (FCT)','Kano','Lagos','Rivers','Oyo','Kaduna','Enugu','Delta'],
  },
  { code: 'KE', name: 'Kenya',        regions: null },
  { code: 'GH', name: 'Ghana',        regions: null },
  { code: 'SN', name: 'Senegal',      regions: null },
  { code: 'CI', name: "Côte d'Ivoire", regions: null },
  { code: 'CM', name: 'Cameroon',     regions: null },

  // ── Middle East ────────────────────────────────────────────────
  { code: 'AE', name: 'United Arab Emirates',
    regions: ['Abu Dhabi','Dubai','Sharjah','Ajman','Ras Al Khaimah','Fujairah','Umm Al Quwain'],
  },
  { code: 'SA', name: 'Saudi Arabia', regions: null },
  { code: 'QA', name: 'Qatar',        regions: null },
  { code: 'KW', name: 'Kuwait',       regions: null },
  { code: 'LB', name: 'Lebanon',      regions: null },
  { code: 'JO', name: 'Jordan',       regions: null },

  // ── Asia ───────────────────────────────────────────────────────
  {
    code: 'IN', name: 'India',
    regions: ['Andhra Pradesh','Bihar','Delhi','Gujarat','Karnataka',
      'Kerala','Madhya Pradesh','Maharashtra','Punjab','Rajasthan',
      'Tamil Nadu','Uttar Pradesh','West Bengal'],
  },
  { code: 'SG', name: 'Singapore',   regions: null },
  { code: 'MY', name: 'Malaysia',    regions: null },
  { code: 'PH', name: 'Philippines', regions: null },
  { code: 'PK', name: 'Pakistan',    regions: null },
]

// ── Grade systems — trimmed to ages 5–11 ────────────────────────────
//
// Lookup key: `${countryCode}` or `${countryCode}:${region}` for
// regions that use a different system (e.g. Quebec vs rest of Canada).

const GRADE_SYSTEMS = {
  // ── Canada: Quebec uses Maternelle + Primaire 1–6 ──────────────
  'CA:Quebec': [
    'Maternelle (5 ans)',
    'Primaire 1 (6 ans)',
    'Primaire 2 (7 ans)',
    'Primaire 3 (8 ans)',
    'Primaire 4 (9 ans)',
    'Primaire 5 (10 ans)',
    'Primaire 6 (11 ans)',
  ],
  // Other Canadian provinces: Kindergarten + Grade 1–6
  'CA': [
    'Kindergarten (age 5)',
    'Grade 1 (age 6)',
    'Grade 2 (age 7)',
    'Grade 3 (age 8)',
    'Grade 4 (age 9)',
    'Grade 5 (age 10)',
    'Grade 6 (age 11)',
  ],

  // ── United States: Kindergarten + Grade 1–5/6 ──────────────────
  'US': [
    'Kindergarten (age 5)',
    '1st Grade (age 6)',
    '2nd Grade (age 7)',
    '3rd Grade (age 8)',
    '4th Grade (age 9)',
    '5th Grade (age 10)',
    '6th Grade (age 11)',
  ],

  // ── United Kingdom ─────────────────────────────────────────────
  // England & Wales: Reception → Year 1–6
  'GB:England': [
    'Reception (age 4–5)',
    'Year 1 (age 5–6)',
    'Year 2 (age 6–7)',
    'Year 3 (age 7–8)',
    'Year 4 (age 8–9)',
    'Year 5 (age 9–10)',
    'Year 6 (age 10–11)',
  ],
  'GB:Wales': [
    'Reception (age 4–5)',
    'Year 1 (age 5–6)',
    'Year 2 (age 6–7)',
    'Year 3 (age 7–8)',
    'Year 4 (age 8–9)',
    'Year 5 (age 9–10)',
    'Year 6 (age 10–11)',
  ],
  // Scotland: Primary 1–7
  'GB:Scotland': [
    'Primary 1 (age 5–6)',
    'Primary 2 (age 6–7)',
    'Primary 3 (age 7–8)',
    'Primary 4 (age 8–9)',
    'Primary 5 (age 9–10)',
    'Primary 6 (age 10–11)',
    'Primary 7 (age 11–12)',
  ],
  // Northern Ireland: Primary 1–7
  'GB:Northern Ireland': [
    'Primary 1 (age 4–5)',
    'Primary 2 (age 5–6)',
    'Primary 3 (age 6–7)',
    'Primary 4 (age 7–8)',
    'Primary 5 (age 8–9)',
    'Primary 6 (age 9–10)',
    'Primary 7 (age 10–11)',
  ],
  // Default UK (fallback)
  'GB': [
    'Reception (age 4–5)',
    'Year 1 (age 5–6)',
    'Year 2 (age 6–7)',
    'Year 3 (age 7–8)',
    'Year 4 (age 8–9)',
    'Year 5 (age 9–10)',
    'Year 6 (age 10–11)',
  ],

  // ── France: Maternelle GS + CP → CM2 ───────────────────────────
  'FR': [
    'GS – Grande Section (5 ans)',
    'CP – Cours Préparatoire (6 ans)',
    'CE1 – Cours Élémentaire 1 (7 ans)',
    'CE2 – Cours Élémentaire 2 (8 ans)',
    'CM1 – Cours Moyen 1 (9 ans)',
    'CM2 – Cours Moyen 2 (10 ans)',
  ],

  // ── Belgium: French system (same names as France) ───────────────
  'BE': [
    'Maternelle 3e année (5 ans)',
    '1re primaire (6 ans)',
    '2e primaire (7 ans)',
    '3e primaire (8 ans)',
    '4e primaire (9 ans)',
    '5e primaire (10 ans)',
    '6e primaire (11 ans)',
  ],

  // ── Switzerland: French cantons similar to France ───────────────
  'CH': [
    'Harmos 1 (5–6 ans)',
    'Harmos 2 (6–7 ans)',
    'Harmos 3 (7–8 ans)',
    'Harmos 4 (8–9 ans)',
    'Harmos 5 (9–10 ans)',
    'Harmos 6 (10–11 ans)',
  ],

  // ── Germany: Klasse 1–4 (Grundschule) ──────────────────────────
  'DE': [
    'Vorschule (5–6 Jahre)',
    'Klasse 1 (6–7 Jahre)',
    'Klasse 2 (7–8 Jahre)',
    'Klasse 3 (8–9 Jahre)',
    'Klasse 4 (9–10 Jahre)',
    'Klasse 5 (10–11 Jahre)',
  ],

  // ── Spain ───────────────────────────────────────────────────────
  'ES': [
    'Educación Infantil 3 (5 años)',
    '1º de Primaria (6 años)',
    '2º de Primaria (7 años)',
    '3º de Primaria (8 años)',
    '4º de Primaria (9 años)',
    '5º de Primaria (10 años)',
    '6º de Primaria (11 años)',
  ],

  // ── Portugal ────────────────────────────────────────────────────
  'PT': [
    'Pré-escolar (5 anos)',
    '1º ano (6 anos)',
    '2º ano (7 anos)',
    '3º ano (8 anos)',
    '4º ano (9 anos)',
    '5º ano (10 anos)',
    '6º ano (11 anos)',
  ],

  // ── Italy ───────────────────────────────────────────────────────
  'IT': [
    'Scuola dell\'infanzia (5 anni)',
    'Classe 1ª Primaria (6 anni)',
    'Classe 2ª Primaria (7 anni)',
    'Classe 3ª Primaria (8 anni)',
    'Classe 4ª Primaria (9 anni)',
    'Classe 5ª Primaria (10 anni)',
  ],

  // ── Netherlands ─────────────────────────────────────────────────
  'NL': [
    'Groep 2 (5 jaar)',
    'Groep 3 (6 jaar)',
    'Groep 4 (7 jaar)',
    'Groep 5 (8 jaar)',
    'Groep 6 (9 jaar)',
    'Groep 7 (10 jaar)',
    'Groep 8 (11 jaar)',
  ],

  // ── Ireland ─────────────────────────────────────────────────────
  'IE': [
    'Junior Infants (age 4–5)',
    'Senior Infants (age 5–6)',
    '1st Class (age 6–7)',
    '2nd Class (age 7–8)',
    '3rd Class (age 8–9)',
    '4th Class (age 9–10)',
    '5th Class (age 10–11)',
    '6th Class (age 11–12)',
  ],

  // ── Australia: Prep/Kindergarten + Year 1–6 (varies by state) ──
  // NSW, VIC, SA, WA, TAS, ACT use Kindergarten or Prep
  'AU:New South Wales': [
    'Kindergarten (age 5–6)',
    'Year 1 (age 6–7)',
    'Year 2 (age 7–8)',
    'Year 3 (age 8–9)',
    'Year 4 (age 9–10)',
    'Year 5 (age 10–11)',
    'Year 6 (age 11–12)',
  ],
  'AU:Victoria': [
    'Prep (age 5–6)',
    'Year 1 (age 6–7)',
    'Year 2 (age 7–8)',
    'Year 3 (age 8–9)',
    'Year 4 (age 9–10)',
    'Year 5 (age 10–11)',
    'Year 6 (age 11–12)',
  ],
  'AU:Queensland': [
    'Prep Year (age 5–6)',
    'Year 1 (age 6–7)',
    'Year 2 (age 7–8)',
    'Year 3 (age 8–9)',
    'Year 4 (age 9–10)',
    'Year 5 (age 10–11)',
    'Year 6 (age 11–12)',
  ],
  'AU': [
    'Kindergarten / Prep (age 5–6)',
    'Year 1 (age 6–7)',
    'Year 2 (age 7–8)',
    'Year 3 (age 8–9)',
    'Year 4 (age 9–10)',
    'Year 5 (age 10–11)',
    'Year 6 (age 11–12)',
  ],

  // ── New Zealand ─────────────────────────────────────────────────
  'NZ': [
    'Year 1 (age 5–6)',
    'Year 2 (age 6–7)',
    'Year 3 (age 7–8)',
    'Year 4 (age 8–9)',
    'Year 5 (age 9–10)',
    'Year 6 (age 10–11)',
    'Year 7 (age 11–12)',
  ],

  // ── South Africa: Grade R (Kindergarten) + Grade 1–6 ───────────
  'ZA': [
    'Grade R (age 5–6)',
    'Grade 1 (age 6–7)',
    'Grade 2 (age 7–8)',
    'Grade 3 (age 8–9)',
    'Grade 4 (age 9–10)',
    'Grade 5 (age 10–11)',
    'Grade 6 (age 11–12)',
  ],

  // ── Morocco / North Africa / Middle East: Arabic system ─────────
  'MA': [
    'التحضيري (5 سنوات)',
    'السنة الأولى ابتدائي (6 سنوات)',
    'السنة الثانية ابتدائي (7 سنوات)',
    'السنة الثالثة ابتدائي (8 سنوات)',
    'السنة الرابعة ابتدائي (9 سنوات)',
    'السنة الخامسة ابتدائي (10 سنوات)',
    'السنة السادسة ابتدائي (11 سنوات)',
  ],
  'TN': [
    'Préparatoire (5 ans)',
    '1ère année de base (6 ans)',
    '2ème année de base (7 ans)',
    '3ème année de base (8 ans)',
    '4ème année de base (9 ans)',
    '5ème année de base (10 ans)',
    '6ème année de base (11 ans)',
  ],
  'DZ': [
    'التحضيري (5 سنوات)',
    'السنة الأولى ابتدائي (6 سنوات)',
    'السنة الثانية ابتدائي (7 سنوات)',
    'السنة الثالثة ابتدائي (8 سنوات)',
    'السنة الرابعة ابتدائي (9 سنوات)',
    'السنة الخامسة ابتدائي (10 سنوات)',
  ],
  'EG': [
    'رياض الأطفال (5 سنوات)',
    'الصف الأول الابتدائي (6 سنوات)',
    'الصف الثاني الابتدائي (7 سنوات)',
    'الصف الثالث الابتدائي (8 سنوات)',
    'الصف الرابع الابتدائي (9 سنوات)',
    'الصف الخامس الابتدائي (10 سنوات)',
    'الصف السادس الابتدائي (11 سنوات)',
  ],
  'SA': [
    'رياض الأطفال (5 سنوات)',
    'الصف الأول الابتدائي (6 سنوات)',
    'الصف الثاني الابتدائي (7 سنوات)',
    'الصف الثالث الابتدائي (8 سنوات)',
    'الصف الرابع الابتدائي (9 سنوات)',
    'الصف الخامس الابتدائي (10 سنوات)',
    'الصف السادس الابتدائي (11 سنوات)',
  ],
  'AE': [
    'KG1 – Kindergarten 1 (age 4–5)',
    'KG2 – Kindergarten 2 (age 5–6)',
    'Grade 1 (age 6–7)',
    'Grade 2 (age 7–8)',
    'Grade 3 (age 8–9)',
    'Grade 4 (age 9–10)',
    'Grade 5 (age 10–11)',
  ],
  'QA': [
    'KG1 (age 4–5)',
    'KG2 (age 5–6)',
    'Grade 1 (age 6–7)',
    'Grade 2 (age 7–8)',
    'Grade 3 (age 8–9)',
    'Grade 4 (age 9–10)',
    'Grade 5 (age 10–11)',
  ],
  'KW': [
    'KG1 (age 4–5)',
    'KG2 (age 5–6)',
    'Grade 1 (age 6–7)',
    'Grade 2 (age 7–8)',
    'Grade 3 (age 8–9)',
    'Grade 4 (age 9–10)',
    'Grade 5 (age 10–11)',
  ],
  'LB': [
    'Maternelle (5 ans)',
    'Classe 1 (6 ans)',
    'Classe 2 (7 ans)',
    'Classe 3 (8 ans)',
    'Classe 4 (9 ans)',
    'Classe 5 (10 ans)',
    'Classe 6 (11 ans)',
  ],
  'JO': [
    'رياض الأطفال (5 سنوات)',
    'الصف الأول (6 سنوات)',
    'الصف الثاني (7 سنوات)',
    'الصف الثالث (8 سنوات)',
    'الصف الرابع (9 سنوات)',
    'الصف الخامس (10 سنوات)',
    'الصف السادس (11 سنوات)',
  ],

  // ── Sub-Saharan Africa ──────────────────────────────────────────
  'NG': [
    'Nursery 2 (age 4–5)',
    'Primary 1 (age 6–7)',
    'Primary 2 (age 7–8)',
    'Primary 3 (age 8–9)',
    'Primary 4 (age 9–10)',
    'Primary 5 (age 10–11)',
    'Primary 6 (age 11–12)',
  ],
  'KE': [
    'Pre-Primary 2 (age 5–6)',
    'Grade 1 (age 6–7)',
    'Grade 2 (age 7–8)',
    'Grade 3 (age 8–9)',
    'Grade 4 (age 9–10)',
    'Grade 5 (age 10–11)',
    'Grade 6 (age 11–12)',
  ],
  'GH': [
    'Kindergarten 2 (age 5–6)',
    'Primary 1 (age 6–7)',
    'Primary 2 (age 7–8)',
    'Primary 3 (age 8–9)',
    'Primary 4 (age 9–10)',
    'Primary 5 (age 10–11)',
    'Primary 6 (age 11–12)',
  ],
  'SN': [
    'Préscolaire (5 ans)',
    'CI – Cours d\'initiation (6 ans)',
    'CP – Cours préparatoire (7 ans)',
    'CE1 (8 ans)',
    'CE2 (9 ans)',
    'CM1 (10 ans)',
    'CM2 (11 ans)',
  ],
  'CI': [
    'Préscolaire (5 ans)',
    'CI (6 ans)',
    'CP (7 ans)',
    'CE1 (8 ans)',
    'CE2 (9 ans)',
    'CM1 (10 ans)',
    'CM2 (11 ans)',
  ],
  'CM': [
    'SIL – Section d\'Initiation à la Lecture (5–6 ans)',
    'CP (6–7 ans)',
    'CE1 (7–8 ans)',
    'CE2 (8–9 ans)',
    'CM1 (9–10 ans)',
    'CM2 (10–11 ans)',
  ],

  // ── Asia ────────────────────────────────────────────────────────
  'IN': [
    'Pre-Primary / Nursery (age 3–5)',
    'Kindergarten (age 5–6)',
    'Class 1 (age 6–7)',
    'Class 2 (age 7–8)',
    'Class 3 (age 8–9)',
    'Class 4 (age 9–10)',
    'Class 5 (age 10–11)',
  ],
  'SG': [
    'Kindergarten 2 (age 5–6)',
    'Primary 1 (age 6–7)',
    'Primary 2 (age 7–8)',
    'Primary 3 (age 8–9)',
    'Primary 4 (age 9–10)',
    'Primary 5 (age 10–11)',
    'Primary 6 (age 11–12)',
  ],
  'MY': [
    'Prasekolah / Kindergarten (age 5–6)',
    'Tahun 1 (age 6–7)',
    'Tahun 2 (age 7–8)',
    'Tahun 3 (age 8–9)',
    'Tahun 4 (age 9–10)',
    'Tahun 5 (age 10–11)',
    'Tahun 6 (age 11–12)',
  ],
  'PH': [
    'Kindergarten (age 5–6)',
    'Grade 1 (age 6–7)',
    'Grade 2 (age 7–8)',
    'Grade 3 (age 8–9)',
    'Grade 4 (age 9–10)',
    'Grade 5 (age 10–11)',
    'Grade 6 (age 11–12)',
  ],
  'PK': [
    'Nursery / KG (age 4–5)',
    'Prep / Class 1 (age 5–6)',
    'Class 2 (age 6–7)',
    'Class 3 (age 7–8)',
    'Class 4 (age 8–9)',
    'Class 5 (age 9–10)',
    'Class 6 (age 10–11)',
  ],

  // ── Latin America ───────────────────────────────────────────────
  'MX': [
    'Preescolar 3 (5 años)',
    '1º de Primaria (6 años)',
    '2º de Primaria (7 años)',
    '3º de Primaria (8 años)',
    '4º de Primaria (9 años)',
    '5º de Primaria (10 años)',
    '6º de Primaria (11 años)',
  ],
  'BR': [
    'Pré-escola (5 anos)',
    '1º ano do Ensino Fundamental (6 anos)',
    '2º ano (7 anos)',
    '3º ano (8 anos)',
    '4º ano (9 anos)',
    '5º ano (10 anos)',
  ],
}

// ── Public API ───────────────────────────────────────────────────────

export function getRegionsForCountry(countryName) {
  const country = COUNTRIES.find(c => c.name === countryName)
  return country?.regions || null
}

export function getRegionsForCountryCode(code) {
  const country = COUNTRIES.find(c => c.code === code)
  return country?.regions || null
}

/** Returns the correct grade list for a country + optional region */
export function getGradesForCountryRegion(countryCode, region = null) {
  if (region) {
    const key = `${countryCode}:${region}`
    if (GRADE_SYSTEMS[key]) return GRADE_SYSTEMS[key]
  }
  return GRADE_SYSTEMS[countryCode] || GRADE_SYSTEMS['US']
}

// Legacy export — generic grades — kept so nothing else breaks
export const GRADES = [
  'Kindergarten (age 5)',
  'Grade 1 (age 6)',
  'Grade 2 (age 7)',
  'Grade 3 (age 8)',
  'Grade 4 (age 9)',
  'Grade 5 (age 10)',
  'Grade 6 (age 11)',
]
