// src/lib/regions.js
//
// Country → regions/provinces used for curriculum alignment (Phase B).
// A country with `regions: null` means Numio doesn't ask for a
// region for it — same idea as the Morocco example in the master
// plan (country + grade is enough).
//
// GRADES is generic (Kindergarten, Grade 1-12) for v1. Some
// countries name grades differently (France: CP/CE1/CE2..., etc.) —
// worth localizing later, but a generic list is enough for the AI
// to reason about grade level for now since it also sees the photo.

export const COUNTRIES = [
  { code: 'ZA', name: 'South Africa', regions: ['Eastern Cape', 'Free State', 'Gauteng', 'KwaZulu-Natal', 'Limpopo', 'Mpumalanga', 'Northern Cape', 'North West', 'Western Cape'] },
  { code: 'CA', name: 'Canada', regions: ['Alberta', 'British Columbia', 'Manitoba', 'New Brunswick', 'Newfoundland and Labrador', 'Nova Scotia', 'Ontario', 'Prince Edward Island', 'Quebec', 'Saskatchewan'] },
  { code: 'US', name: 'United States', regions: ['Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California', 'Colorado', 'Connecticut', 'Delaware', 'Florida', 'Georgia', 'Hawaii', 'Idaho', 'Illinois', 'Indiana', 'Iowa', 'Kansas', 'Kentucky', 'Louisiana', 'Maine', 'Maryland', 'Massachusetts', 'Michigan', 'Minnesota', 'Mississippi', 'Missouri', 'Montana', 'Nebraska', 'Nevada', 'New Hampshire', 'New Jersey', 'New Mexico', 'New York', 'North Carolina', 'North Dakota', 'Ohio', 'Oklahoma', 'Oregon', 'Pennsylvania', 'Rhode Island', 'South Carolina', 'South Dakota', 'Tennessee', 'Texas', 'Utah', 'Vermont', 'Virginia', 'Washington', 'West Virginia', 'Wisconsin', 'Wyoming'] },
  { code: 'GB', name: 'United Kingdom', regions: ['England', 'Scotland', 'Wales', 'Northern Ireland'] },
  { code: 'AU', name: 'Australia', regions: ['New South Wales', 'Queensland', 'South Australia', 'Tasmania', 'Victoria', 'Western Australia', 'Australian Capital Territory', 'Northern Territory'] },
  { code: 'IN', name: 'India', regions: ['Andhra Pradesh', 'Bihar', 'Delhi', 'Gujarat', 'Karnataka', 'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Punjab', 'Rajasthan', 'Tamil Nadu', 'Uttar Pradesh', 'West Bengal'] },
  { code: 'NG', name: 'Nigeria', regions: ['Abuja (FCT)', 'Kano', 'Lagos', 'Rivers', 'Oyo', 'Kaduna', 'Enugu', 'Delta'] },
  { code: 'AE', name: 'United Arab Emirates', regions: ['Abu Dhabi', 'Dubai', 'Sharjah', 'Ajman', 'Ras Al Khaimah', 'Fujairah', 'Umm Al Quwain'] },
  { code: 'DE', name: 'Germany', regions: ['Baden-Württemberg', 'Bavaria', 'Berlin', 'Hamburg', 'Hesse', 'North Rhine-Westphalia', 'Saxony'] },
  { code: 'MA', name: 'Morocco', regions: null },
  { code: 'FR', name: 'France', regions: null },
  { code: 'BE', name: 'Belgium', regions: null },
  { code: 'CH', name: 'Switzerland', regions: null },
  { code: 'TN', name: 'Tunisia', regions: null },
  { code: 'DZ', name: 'Algeria', regions: null },
  { code: 'EG', name: 'Egypt', regions: null },
  { code: 'SA', name: 'Saudi Arabia', regions: null },
  { code: 'QA', name: 'Qatar', regions: null },
  { code: 'KW', name: 'Kuwait', regions: null },
  { code: 'LB', name: 'Lebanon', regions: null },
  { code: 'JO', name: 'Jordan', regions: null },
  { code: 'SN', name: 'Senegal', regions: null },
  { code: 'CI', name: "Côte d'Ivoire", regions: null },
  { code: 'CM', name: 'Cameroon', regions: null },
  { code: 'KE', name: 'Kenya', regions: null },
  { code: 'GH', name: 'Ghana', regions: null },
  { code: 'SG', name: 'Singapore', regions: null },
  { code: 'MY', name: 'Malaysia', regions: null },
  { code: 'PH', name: 'Philippines', regions: null },
  { code: 'PK', name: 'Pakistan', regions: null },
  { code: 'ES', name: 'Spain', regions: null },
  { code: 'PT', name: 'Portugal', regions: null },
  { code: 'IT', name: 'Italy', regions: null },
  { code: 'NL', name: 'Netherlands', regions: null },
  { code: 'IE', name: 'Ireland', regions: null },
  { code: 'NZ', name: 'New Zealand', regions: null },
  { code: 'BR', name: 'Brazil', regions: null },
  { code: 'MX', name: 'Mexico', regions: null },
]

export const GRADES = [
  'Pre-K', 'Kindergarten',
  'Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6',
  'Grade 7', 'Grade 8', 'Grade 9', 'Grade 10', 'Grade 11', 'Grade 12',
]

export function getRegionsForCountry(countryName) {
  const country = COUNTRIES.find(c => c.name === countryName)
  return country?.regions || null
}
