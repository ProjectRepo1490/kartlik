import { useMemo } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useStore } from "../store/StoreContext.jsx";
import Flashcards from "../modes/Flashcards.jsx";
import Learn from "../modes/Learn.jsx";
import TestMode from "../modes/TestMode.jsx";
import Match from "../modes/Match.jsx";
import NotFound from "./NotFound.jsx";

const MODES = [
  { slug: "kartlar", label: "Kartlar", Component: Flashcards },
  { slug: "ogren", label: "Öğren", Component: Learn },
  { slug: "test", label: "Test", Component: TestMode },
  { slug: "eslestir", label: "Eşleştir", Component: Match },
];

export default function Study() {
  const { id, mode } = useParams();
  const { getSet, dir, setDir, learnMode, setLearnMode } = useStore();
  const navigate = useNavigate();
  const set = getSet(id);

  // Soru yönü: "td" terimi gösterip tanımı sorar, "dt" tersini yapar.
  const { Q, A } = useMemo(
    () => ({
      Q: (c) => (dir === "td" ? c.term : c.def),
      A: (c) => (dir === "td" ? c.def : c.term),
    }),
    [dir]
  );

  if (!set) return <NotFound />;
  const current = MODES.find((m) => m.slug === mode) ?? MODES[0];
  const { Component } = current;

  return (
    <section>
      <div className="study-head">
        <Link className="btn ghost" to="/">
          Setlere dön
        </Link>
        <Link className="btn ghost" to={`/set/${set.id}/duzenle`}>
          Seti düzenle
        </Link>
      </div>
      <h1 className="title">{set.title}</h1>
      <div className="mode-bar">
        <div className="tabs" role="tablist" aria-label="Çalışma modu">
          {MODES.map((m) => (
            <button
              key={m.slug}
              type="button"
              role="tab"
              className="tab"
              aria-selected={m.slug === current.slug}
              onClick={() => navigate(`/set/${set.id}/${m.slug}`)}
            >
              <span>{m.label}</span>
            </button>
          ))}
        </div>
        {current.slug !== "eslestir" && (
          <div className="mode-opts">
            {current.slug === "ogren" && (
              <select className="select" value={learnMode} onChange={(e) => setLearnMode(e.target.value)} aria-label="Öğrenme şekli">
                <option value="mix">Önce seçmeli, sonra yazılı</option>
                <option value="write">Sadece yazarak</option>
                <option value="mc">Sadece çoktan seçmeli</option>
              </select>
            )}
            <select className="select" value={dir} onChange={(e) => setDir(e.target.value)} aria-label="Soru yönü">
              <option value="td">Terimi gör, tanımı bul</option>
              <option value="dt">Tanımı gör, terimi bul</option>
            </select>
          </div>
        )}
      </div>
      {set.cards.length === 0 ? (
        <div className="q-card center">
          <p>Bu sette henüz kart yok.</p>
          <Link className="btn primary" to={`/set/${set.id}/duzenle`}>
            Kart ekle
          </Link>
        </div>
      ) : (
        <Component key={`${set.id}-${current.slug}-${dir}`} set={set} dir={dir} Q={Q} A={A} />
      )}
    </section>
  );
}
