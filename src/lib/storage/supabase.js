import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

/** .env dosyasında değerler yoksa null: uygulama yalnızca tarayıcıda çalışır. */
export const supabase = url && key ? createClient(url, key) : null;

const toRow = (set, userId) => ({
  id: set.id,
  user_id: userId,
  title: set.title,
  source: set.source ?? null,
  cards: set.cards,
  best: set.best ?? null,
  updated_at: new Date(set.updated || Date.now()).toISOString(),
});

const fromRow = (row) => ({
  id: row.id,
  title: row.title,
  source: row.source,
  cards: Array.isArray(row.cards) ? row.cards : [],
  best: row.best,
  updated: Date.parse(row.updated_at) || Date.now(),
});

export async function fetchSets() {
  const { data, error } = await supabase
    .from("sets")
    .select("id,title,source,cards,best,updated_at");
  if (error) throw error;
  return data.map(fromRow);
}

export async function upsertSets(sets, userId) {
  if (!sets.length) return;
  const { error } = await supabase.from("sets").upsert(sets.map((s) => toRow(s, userId)));
  if (error) throw error;
}

export async function deleteSetRemote(id) {
  const { error } = await supabase.from("sets").delete().eq("id", id);
  if (error) throw error;
}
