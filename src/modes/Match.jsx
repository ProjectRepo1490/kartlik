import { useEffect, useState } from "react";
import { useStore } from "../store/StoreContext.jsx";
import CardImage from "../components/CardImage.jsx";
import { formatSeconds, shuffle } from "../lib/text.js";

const PAIRS = 6;

export default function Match({ set }) {
  const { saveSet } = useStore();
  const [phase, setPhase] = useState("intro"); // intro | play | done
  const [tiles, setTiles] = useState([]);
  const [selected, setSelected] = useState(null);
  const [matched, setMatched] = useState(() => new Set());
  const [miss, setMiss] = useState({ keys: [], n: 0 });
  const [start, setStart] = useState(0);
  const [penalty, setPenalty] = useState(0);
  const [now, setNow] = useState(0);
  const [result, setResult] = useState(null);

  useEffect(() => {
    if (phase !== "play") return;
    const t = setInterval(() => setNow(performance.now()), 100);
    return () => clearInterval(t);
  }, [phase]);

  function play() {
    const cards = shuffle(set.cards).slice(0, PAIRS);
    setTiles(
      shuffle(
        cards.flatMap((c) => [
          { key: c.id + ":t", cid: c.id, kind: "term", text: c.term, card: c },
          { key: c.id + ":d", cid: c.id, kind: "def", text: c.def, card: c },
        ])
      )
    );
    setSelected(null);
    setMatched(new Set());
    setMiss({ keys: [], n: 0 });
    setPenalty(0);
    const t = performance.now();
    setStart(t);
    setNow(t);
    setPhase("play");
  }

  function pick(tile) {
    if (matched.has(tile.key)) return;
    if (!selected) {
      setSelected(tile);
      return;
    }
    if (selected.key === tile.key) {
      setSelected(null);
      return;
    }
    if (selected.cid === tile.cid) {
      const m = new Set(matched).add(selected.key).add(tile.key);
      setMatched(m);
      setSelected(null);
      if (m.size === tiles.length) finish();
    } else {
      setPenalty((p) => p + 1);
      setMiss((x) => ({ keys: [selected.key, tile.key], n: x.n + 1 }));
      setSelected(null);
    }
  }

  function finish() {
    const time = (performance.now() - start) / 1000 + penalty;
    const record = !set.best || time < set.best;
    if (record) saveSet({ ...set, best: time });
    setResult({ time, record });
    setPhase("done");
  }

  if (set.cards.length < 2) {
    return (
      <div className="q-card center">
        <p>Eşleştirme oyunu için sette en az iki kart olmalı.</p>
      </div>
    );
  }

  if (phase === "intro") {
    return (
      <div className="q-card center">
        <h2 className="q-title">Terimleri tanımlarıyla eşleştir</h2>
        <p>Bir kutuya, sonra onun eşine dokun. Yanlış eşleştirme süreye 1 saniye ekler.</p>
        {set.best ? <p className="best">En iyi süren: {formatSeconds(set.best)}</p> : null}
        <div className="row-actions center">
          <button className="btn primary" type="button" onClick={play}>
            Oyunu başlat
          </button>
        </div>
      </div>
    );
  }

  if (phase === "done") {
    return (
      <div className="q-card center">
        <h2 className="q-title">{result.record ? "Yeni rekor!" : "Hepsini eşleştirdin"}</h2>
        <p className="timer">{formatSeconds(result.time)}</p>
        {!result.record && <p className="best">En iyi süren: {formatSeconds(set.best)}</p>}
        <div className="row-actions center">
          <button className="btn primary" type="button" onClick={play}>
            Tekrar oyna
          </button>
        </div>
      </div>
    );
  }

  const elapsed = Math.max(0, (now - start) / 1000 + penalty);
  return (
    <div>
      <div className="match-top">
        <div className="timer">{formatSeconds(elapsed)}</div>
        <button className="btn ghost" type="button" onClick={() => setPhase("intro")}>
          Oyunu bırak
        </button>
      </div>
      <div className="match-grid">
        {tiles.map((t) => {
          const isMiss = miss.keys.includes(t.key);
          const cls =
            "tile" +
            (t.kind === "term" ? " is-term" : "") +
            (selected?.key === t.key ? " sel" : "") +
            (matched.has(t.key) ? " matched" : "") +
            (isMiss ? " miss" : "");
          return (
            <button
              key={isMiss ? `${t.key}-${miss.n}` : t.key}
              type="button"
              className={cls}
              aria-pressed={selected?.key === t.key}
              disabled={matched.has(t.key)}
              onClick={() => pick(t)}
            >
              {t.kind === "def" && <CardImage card={t.card} size="xs" />}
              <span>{t.text}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
