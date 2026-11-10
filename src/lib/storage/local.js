const KEY = "kartlik:v2";

/** Buluta yüklendiği bilinen set kimlikleri (hangi kullanıcı için olduğuyla birlikte). */
export const NO_SYNC = { userId: null, ids: [] };

export function loadLocal() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (!data || !Array.isArray(data.sets)) return null;
    return {
      sets: data.sets,
      dir: data.dir === "dt" ? "dt" : "td",
      learnMode: data.learnMode === "write" || data.learnMode === "mc" ? data.learnMode : "mix",
      synced: typeof data.synced?.userId === "string" && Array.isArray(data.synced.ids) ? data.synced : NO_SYNC,
    };
  } catch {
    return null;
  }
}

export function saveLocal(data) {
  try {
    localStorage.setItem(KEY, JSON.stringify(data));
    return true;
  } catch {
    // Kota dolmuş ya da depolama kapalı olabilir.
    return false;
  }
}
