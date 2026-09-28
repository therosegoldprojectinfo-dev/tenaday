// src/lib/openmojiAssets.js
//
// Real OpenMoji SVG registry for "visual_count" questions. Keys here
// MUST exactly match OPENMOJI_ASSETS in
// supabase/functions/generate-practice/index.ts — add/remove in
// both places together, or the AI will reference an asset the
// frontend can't render.
//
// SVGs live in /public/assets/openmoji/<name>.svg — downloaded
// straight from the official OpenMoji library (CC BY-SA 4.0,
// https://openmoji.org). Keep the LICENSE.txt file alongside them.

export const ASSET_PATHS = {
  bird:   '/assets/openmoji/bird.svg',
  cow:    '/assets/openmoji/cow.svg',
  cat:    '/assets/openmoji/cat.svg',
  dog:    '/assets/openmoji/dog.svg',
  fish:   '/assets/openmoji/fish.svg',
  apple:  '/assets/openmoji/apple.svg',
  banana: '/assets/openmoji/banana.svg',
  star:   '/assets/openmoji/star.svg',
  ball:   '/assets/openmoji/ball.svg',
  tree:   '/assets/openmoji/tree.svg',
  book:   '/assets/openmoji/book.svg',
  pencil: '/assets/openmoji/pencil.svg',
  car:    '/assets/openmoji/car.svg',
  bus:    '/assets/openmoji/bus.svg',
  flower: '/assets/openmoji/flower.svg',
}

export function getAssetPath(name) {
  return ASSET_PATHS[name] || null
}
