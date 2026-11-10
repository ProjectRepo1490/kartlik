import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { loadLocal, saveLocal, NO_SYNC } from "../lib/storage/local.js";
import { supabase, fetchSets, upsertSets, deleteSetRemote } from "../lib/storage/supabase.js";
import { PACKS, packToSet } from "../data/library.js";

const StoreContext = createContext(null);

function initialData() {
  const saved = loadLocal();
  if (saved) return saved;
  // İlk açılışta kütüphaneden ilk paketi ekle ki boş bir ekranla karşılaşılmasın.
  // starter: hiç dokunulmamış hazır set; bulutta zaten veri varsa girişte yüklenmez (her yeni cihaz kopya oluşturmasın).
  return { sets: [{ ...packToSet(PACKS[0]), starter: true }], dir: "td", learnMode: "mix", synced: NO_SYNC };
}

/**
 * sync durumları:
 *  local      Supabase ayarlı değil, her şey tarayıcıda.
 *  signedOut  Supabase ayarlı ama giriş yapılmamış.
 *  syncing    Bulutla eşitleniyor.
 *  synced     Eşitlendi.
 *  error      Son eşitleme başarısız; veriler tarayıcıda duruyor.
 */
export function StoreProvider({ children }) {
  const [initial] = useState(initialData);
  const [sets, setSets] = useState(initial.sets);
  const [dir, setDirState] = useState(initial.dir);
  // Öğren modu: "mix" önce çoktan seçmeli sonra yazılı, "write" yalnızca yazılı, "mc" yalnızca çoktan seçmeli.
  const [learnMode, setLearnModeState] = useState(initial.learnMode);
  const [session, setSession] = useState(null);
  const [sync, setSync] = useState(supabase ? "signedOut" : "local");
  // Buluta yüklendiği bilinen setler: bulutta artık yoksa başka cihazda silinmiş demektir, geri yüklenmez.
  const [synced, setSynced] = useState(initial.synced);

  const setsRef = useRef(sets);
  const sessionRef = useRef(session);
  sessionRef.current = session;
  const syncedRef = useRef(synced);
  const timers = useRef({});

  // Her değişiklik tarayıcıya da yazılır; Supabase kullanılsa bile çevrimdışı yedek olur.
  useEffect(() => {
    if (!saveLocal({ sets, dir, learnMode, synced })) console.warn("Kartlık: tarayıcı depolamasına yazılamadı.");
  }, [sets, dir, learnMode, synced]);

  const markSynced = useCallback((uid, add = [], remove = []) => {
    const ids = new Set(syncedRef.current.userId === uid ? syncedRef.current.ids : []);
    add.forEach((id) => ids.add(id));
    remove.forEach((id) => ids.delete(id));
    syncedRef.current = { userId: uid, ids: [...ids] };
    setSynced(syncedRef.current);
  }, []);

  // Oturum takibi
  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = supabase.auth.onAuthStateChange((_event, s) => setSession(s));
    return () => data.subscription.unsubscribe();
  }, []);

  const userId = session?.user?.id ?? null;

  // Giriş yapılınca: bulut ve tarayıcıdaki setleri birleştir, yeni olan kazanır.
  useEffect(() => {
    if (!supabase) return;
    if (!userId) {
      setSync("signedOut");
      return;
    }
    let cancelled = false;
    setSync("syncing");
    (async () => {
      try {
        const remote = await fetchSets();
        if (cancelled) return;
        const known = new Set(syncedRef.current.userId === userId ? syncedRef.current.ids : []);
        const merged = new Map(remote.map((s) => [s.id, s]));
        const toUpload = [];
        for (const s of setsRef.current) {
          const r = merged.get(s.id);
          if (r) {
            if ((s.updated || 0) > (r.updated || 0)) {
              merged.set(s.id, s);
              toUpload.push(s);
            }
            continue;
          }
          // Bulutta yok: daha önce yüklendiyse başka cihazda silinmiştir; dokunulmamış hazır set de bulutta veri varsa gereksizdir.
          if (known.has(s.id) || (s.starter && remote.length > 0)) continue;
          merged.set(s.id, s);
          toUpload.push(s);
        }
        commit([...merged.values()]);
        markSynced(userId, remote.map((s) => s.id));
        await upsertSets(toUpload, userId);
        markSynced(userId, toUpload.map((s) => s.id));
        if (!cancelled) setSync("synced");
      } catch (e) {
        console.error(e);
        if (!cancelled) setSync("error");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [userId, markSynced]);

  function commit(next) {
    setsRef.current = next;
    setSets(next);
  }

  // Aynı sete art arda gelen değişiklikleri tek yazmada toplar.
  const pushRemote = useCallback((set) => {
    const uidNow = sessionRef.current?.user?.id;
    if (!supabase || !uidNow) return;
    clearTimeout(timers.current[set.id]);
    timers.current[set.id] = setTimeout(() => {
      delete timers.current[set.id];
      upsertSets([setsRef.current.find((s) => s.id === set.id) ?? set], uidNow)
        .then(() => {
          markSynced(uidNow, [set.id]);
          setSync("synced");
        })
        .catch((e) => {
          console.error(e);
          setSync("error");
        });
    }, 600);
  }, [markSynced]);

  const saveSet = useCallback(
    (set) => {
      const next = { ...set, updated: Date.now() };
      delete next.starter; // dokunulan set artık hazır set sayılmaz
      const prev = setsRef.current;
      commit(prev.some((s) => s.id === next.id) ? prev.map((s) => (s.id === next.id ? next : s)) : [...prev, next]);
      pushRemote(next);
      return next;
    },
    [pushRemote]
  );

  const updateCard = useCallback(
    (setId, cardId, patch) => {
      const set = setsRef.current.find((s) => s.id === setId);
      if (!set) return;
      saveSet({ ...set, cards: set.cards.map((c) => (c.id === cardId ? { ...c, ...patch } : c)) });
    },
    [saveSet]
  );

  const deleteSet = useCallback((id) => {
    commit(setsRef.current.filter((s) => s.id !== id));
    clearTimeout(timers.current[id]);
    const uidNow = sessionRef.current?.user?.id;
    if (supabase && uidNow) {
      deleteSetRemote(id)
        .then(() => markSynced(uidNow, [], [id]))
        .catch((e) => {
          console.error(e);
          setSync("error");
        });
    }
  }, [markSynced]);

  const setDir = useCallback((d) => setDirState(d === "dt" ? "dt" : "td"), []);
  const setLearnMode = useCallback((m) => setLearnModeState(m === "write" || m === "mc" ? m : "mix"), []);

  const value = useMemo(
    () => ({
      sets,
      getSet: (id) => sets.find((s) => s.id === id) ?? null,
      saveSet,
      updateCard,
      deleteSet,
      dir,
      setDir,
      learnMode,
      setLearnMode,
      sync,
      session,
      cloudEnabled: !!supabase,
    }),
    [sets, saveSet, updateCard, deleteSet, dir, setDir, learnMode, setLearnMode, sync, session]
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore, StoreProvider içinde kullanılmalı");
  return ctx;
}
