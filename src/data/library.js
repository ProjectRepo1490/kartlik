import RAW from "./words.txt?raw";
import { uid } from "../lib/text.js";

/**
 * words.txt biçimi:
 *   # Bölüm adı
 *   kelime|türkçe karşılığı|emoji (isteğe bağlı)
 */
function parse(raw) {
  const sections = [];
  for (const line of raw.split(/\r?\n/)) {
    if (!line.trim()) continue;
    if (line.startsWith("#")) {
      sections.push({ title: line.slice(1).trim(), words: [] });
      continue;
    }
    const [term, def, emoji] = line.split("|").map((s) => s?.trim());
    sections[sections.length - 1].words.push({ term, def, emoji: emoji || null });
  }
  return sections;
}

export const SECTIONS = parse(RAW);
export const WORD_COUNT = SECTIONS.reduce((n, s) => n + s.words.length, 0);

/** Her bölüm en fazla 50 kartlık, eşit boyutlu paketlere bölünür. */
const MAX_PACK = 50;
export const PACKS = SECTIONS.flatMap((section, si) => {
  const parts = Math.ceil(section.words.length / MAX_PACK);
  const size = Math.ceil(section.words.length / parts);
  return Array.from({ length: parts }, (_, p) => ({
    id: `common1000-${si + 1}-${p + 1}`,
    section: section.title,
    title: parts > 1 ? `${section.title} ${p + 1}` : section.title,
    words: section.words.slice(p * size, (p + 1) * size),
  }));
});

export function packToSet(pack) {
  return {
    id: uid(),
    title: pack.title,
    source: pack.id,
    cards: pack.words.map((w) => ({
      id: uid(),
      term: w.term,
      def: w.def,
      emoji: w.emoji,
      image: null,
      known: false,
    })),
    best: null,
    updated: Date.now(),
  };
}
