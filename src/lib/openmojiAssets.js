// src/lib/openmojiAssets.js
//
// Interim asset registry for "visual_count" questions. Keys here
// MUST exactly match OPENMOJI_ASSETS in
// supabase/functions/generate-practice/index.ts — add/remove in
// both places together, or the AI will reference an asset the
// frontend can't render.
//
// Using plain emoji as a placeholder for now (zero asset pipeline
// needed to ship). Swap ASSET_EMOJI values for real OpenMoji SVGs
// under /public/assets/openmoji/<name>.svg later — VisualCount in
// Quiz.jsx is the only place that needs to change when you do.

export const ASSET_EMOJI = {
  bird: '🐦',
  cow: '🐄',
  cat: '🐱',
  dog: '🐶',
  fish: '🐟',
  apple: '🍎',
  banana: '🍌',
  star: '⭐',
  ball: '⚽',
  tree: '🌳',
  book: '📖',
  pencil: '✏️',
  car: '🚗',
  bus: '🚌',
  flower: '🌸',
}

export function getAssetEmoji(name) {
  return ASSET_EMOJI[name] || '❓'
}
