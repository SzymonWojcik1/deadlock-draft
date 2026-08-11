/* ============================================================
   Hero lookup.

   Loads data/heroes.json once, then resolves a StatLocker
   heroId into a display name and any art asset you ask for.

   To add or rename a hero, edit data/heroes.json — nothing in
   this file needs to change.
   ============================================================ */

import { HEROES_DATA_URL, ASSETS, PICK_ASSET, fromRoot } from "./config.js";

/** id -> { id, name, slug } */
let byId = new Map();
let loaded = false;

/**
 * Load the hero table. Call once at startup, before rendering.
 * @returns {Promise<number>} how many heroes were loaded
 */
export async function loadHeroes(){
  const res = await fetch(HEROES_DATA_URL);
  if (!res.ok){
    throw new Error(`Could not load data/heroes.json (HTTP ${res.status})`);
  }

  const data = await res.json();
  byId = new Map(data.heroes.map(h => [h.id, h]));
  loaded = true;

  return byId.size;
}

/**
 * Path to a hero's art.
 * @param {object} hero  entry from the hero table
 * @param {string} type  key of ASSETS: portrait, render, critical, gloat, name
 */
export function heroAsset(hero, type = PICK_ASSET){
  const spec = ASSETS[type];
  if (!spec || !hero) return null;

  const slug = spec.lowercase ? hero.slug.toLowerCase() : hero.slug;
  return fromRoot(`${spec.dir}/${slug}.${spec.ext}`);
}

const warned = new Set();

function warnUnknown(heroId){
  if (warned.has(heroId)) return;
  warned.add(heroId);
  console.warn(
    `[overlay] Unknown heroId ${heroId}. Add it to data/heroes.json:\n` +
    `  { "id": ${heroId}, "name": "Hero Name", "slug": "Filename" }`
  );
}

/**
 * Resolve a heroId into everything the UI needs.
 * Never throws — an unknown hero degrades to a readable label
 * rather than taking the overlay down mid-draft.
 *
 * @param {number} heroId
 * @param {string} [assetType] which art folder to use
 */
export function heroInfo(heroId, assetType = PICK_ASSET){
  if (!loaded){
    console.warn("[overlay] heroInfo() called before loadHeroes() finished.");
  }

  // A selection that hasn't been made yet has no heroId. Return a
  // blank entry rather than something like "Hero #undefined".
  if (heroId === null || heroId === undefined){
    return { id: null, name: "", image: null, known: false, pending: true };
  }

  const hero = byId.get(heroId);

  if (!hero){
    warnUnknown(heroId);
    return { id: heroId, name: `Hero #${heroId}`, image: null, known: false };
  }

  return {
    id: hero.id,
    name: hero.name,
    slug: hero.slug,
    image: heroAsset(hero, assetType),
    known: true
  };
}

/** Every hero in the table, sorted by name. Handy for tooling. */
export function allHeroes(){
  return [...byId.values()].sort((a, b) => a.name.localeCompare(b.name));
}