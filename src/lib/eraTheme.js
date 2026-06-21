// ── Era theme lookup ─────────────────────────────────────────────────────
// Single source of truth mapping each math operation to its era identity
// (spec §9). Screens pull from here instead of hardcoding "stoneage"
// anywhere, so adding/adjusting an era never means hunting through JSX.
//
// Color values match the era token groups in tailwind.config.js
// (stoneage / medieval / industrial / futuristic). Buttons do NOT use
// these — primary actions always use the fixed Duolingo green (see
// index.css .btn-duo) regardless of era, per current design direction.

export const ERA_THEME = {
  addition: {
    era: 'Stone Age',
    operationLabel: 'Addition',
    symbol: '+',
    tw: 'stoneage',
    colors: {
      primary: '#FF9600',
      dark: '#CC7700',
      accent: '#FFB700',
    },
  },
  subtraction: {
    era: 'Medieval',
    operationLabel: 'Subtraction',
    symbol: '−',
    tw: 'medieval',
    colors: {
      primary: '#9B59B6',
      dark: '#7D3C98',
      accent: '#F1C40F',
    },
  },
  multiplication: {
    era: 'Industrial Age',
    operationLabel: 'Multiplication',
    symbol: '×',
    tw: 'industrial',
    colors: {
      primary: '#E74C3C',
      dark: '#C0392B',
      accent: '#F39C12',
    },
  },
  division: {
    era: 'Futuristic City',
    operationLabel: 'Division',
    symbol: '÷',
    tw: 'futuristic',
    colors: {
      primary: '#00B4D8',
      dark: '#0088A8',
      accent: '#7B2FBE',
    },
  },
}

export function themeFor(operation) {
  return ERA_THEME[operation] ?? ERA_THEME.addition
}
