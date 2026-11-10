import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useStore } from "../store/StoreContext.jsx";
import CardImage from "../components/CardImage.jsx";
import { shuffle } from "../lib/text.js";

function Face({ card, side, dir }) {
  const showTerm = (side === "front") === (dir === "td");
  const text = showTerm ? card.term : card.def;
  return (
    <div className={`face ${side}${showTerm ? " is-term" : ""}${text.length > 140 ? " long" : ""}`}>
      <span className="side-label">{showTerm ? "Terim" : "Tanım"}</span>
      {card.known && <span className="known-tag">Öğrenildi</span>}
      <div className="face-content">
        {/* Resim tanım tarafında durur; terimi görürken cevabı ele vermesin. */}
        {!showTerm && <CardImage card={card} size="lg" showCredit />}
        <div className="face-text">{text}</div>
      </div>
    </div>
  );
}

export default function Flashcards({ set, dir }) {
  const { updateCard } = useStore();
  const navigate = useNavigate();
  const [order, setOrder] = useState(() => set.cards.map((c) => c.id));
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [shuffled, setShuffled] = useState(false);
  const [finished, setFinished] = useState(false);

  const byId = useMemo(() => new Map(set.cards.map((c) => [c.id, c])), [set.cards]);
  const ids = useMemo(() => order.filter((id) => byId.has(id)), [order, byId]);
  const i = Math.min(index, Math.max(ids.length - 1, 0));
  const card = byId.get(ids[i]);

  function move(step) {
    const n = i + step;
    if (n < 0) return;
    if (n >= ids.length) {
      setFinished(true);
      return;
    }
    setFlipped(false);
    setIndex(n);
  }

  function mark(known) {
    if (card.known !== known) updateCard(set.id, card.id, { known });
    move(1);
  }

  function restart(onlyUnknown) {
    let next = set.cards.filter((c) => !onlyUnknown || !c.known).map((c) => c.id);
    if (shuffled) next = shuffle(next);
    setOrder(next);
    setIndex(0);
    setFlipped(false);
    setFinished(false);
  }

  function toggleShuffle() {
    const s = !shuffled;
    const all = set.cards.map((c) => c.id);
    setShuffled(s);
    setOrder(s ? shuffle(all) : all);
    setIndex(0);
    setFlipped(false);
  }

  // Klavye: boşluk çevirir, oklar gezdirir.
  const api = useRef(null);
  api.current = { move, flip: () => setFlipped((f) => !f), finished };
  useEffect(() => {
    function onKey(e) {
      const t = e.target;
      if (t.closest?.("input, textarea, select")) return;
      if ((e.key === " " || e.key === "Enter") && t.closest?.("button, [role='button'], a")) return;
      if (api.current.finished) return;
      if (e.key === " ") {
        e.preventDefault();
        api.current.flip();
      } else if (e.key === "ArrowRight") api.current.move(1);
      else if (e.key === "ArrowLeft") api.current.move(-1);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  if (finished || !card) {
    const known = set.cards.filter((c) => c.known).length;
    const rest = set.cards.length - known;
    return (
      <div className="q-card center">
        <h2 className="q-title">Destenin sonuna geldin</h2>
        <p>{rest ? `${known} kartı biliyorsun, ${rest} kart üzerinde çalışmaya devam.` : "Bu setteki bütün kartları biliyorsun."}</p>
        <div className="row-actions center">
          {rest > 0 && (
            <button className="btn primary" type="button" onClick={() => restart(true)}>
              Öğrenilmemiş {rest} kartı çalış
            </button>
          )}
          <button className={rest ? "btn" : "btn primary"} type="button" onClick={() => restart(false)}>
            Baştan başla
          </button>
          <button className="btn" type="button" onClick={() => navigate(`/set/${set.id}/ogren`)}>
            Öğren moduna geç
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div
        key={card.id}
        className={"flash" + (flipped ? " flipped" : "")}
        role="button"
        tabIndex={0}
        aria-pressed={flipped}
        aria-label="Kartı çevir"
        onClick={() => setFlipped((f) => !f)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setFlipped((f) => !f);
          }
        }}
      >
        <div className="flash-inner">
          <Face card={card} side="front" dir={dir} />
          <Face card={card} side="back" dir={dir} />
        </div>
      </div>

      <div className="fc-controls">
        <button className="btn round" type="button" aria-label="Önceki kart" disabled={i === 0} onClick={() => move(-1)}>
          ‹
        </button>
        <span className="counter" aria-live="polite">
          {i + 1} / {ids.length}
        </span>
        <button className="btn round" type="button" aria-label="Sonraki kart" onClick={() => move(1)}>
          ›
        </button>
      </div>
      <div className="fc-sub">
        <button className="btn" type="button" onClick={() => mark(false)}>
          Hâlâ öğreniyorum
        </button>
        <button className="btn primary" type="button" onClick={() => mark(true)}>
          Biliyorum
        </button>
        <button className="btn ghost" type="button" aria-pressed={shuffled} onClick={toggleShuffle}>
          {shuffled ? "Sırayı düzelt" : "Karıştır"}
        </button>
      </div>
      <p className="kbd-hint">Boşluk tuşu kartı çevirir, sağ ve sol ok tuşları kartlar arasında gezdirir.</p>
    </div>
  );
}
