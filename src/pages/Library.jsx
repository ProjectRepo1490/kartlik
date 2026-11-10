import { Link } from "react-router-dom";
import { useStore } from "../store/StoreContext.jsx";
import { useToast } from "../components/Toast.jsx";
import { PACKS, SECTIONS, WORD_COUNT, packToSet } from "../data/library.js";

export default function Library() {
  const { sets, saveSet } = useStore();
  const toast = useToast();
  const bySource = new Map(sets.filter((s) => s.source).map((s) => [s.source, s]));
  const missing = PACKS.filter((p) => !bySource.has(p.id));

  function addPack(pack) {
    saveSet(packToSet(pack));
    toast(`“${pack.title}” setlerine eklendi.`);
  }

  function addAll() {
    missing.forEach((p) => saveSet(packToSet(p)));
    toast(`${missing.length} paket setlerine eklendi.`);
  }

  return (
    <section>
      <div className="page-head">
        <div>
          <h1 className="title">Kelime kütüphanesi</h1>
          <p className="lede">
            Günlük İngilizcede en sık karşılaşılan {WORD_COUNT} kelime, Türkçe karşılıklarıyla birlikte {PACKS.length}{" "}
            pakete bölündü. Bir paketi eklediğinde senin setin olur; kelimeleri düzenleyebilir, resim ekleyebilirsin.
          </p>
        </div>
        {missing.length > 0 && (
          <button className="btn" type="button" onClick={addAll}>
            Eklenmemiş {missing.length} paketin hepsini ekle
          </button>
        )}
      </div>

      {SECTIONS.map((section) => {
        const packs = PACKS.filter((p) => p.section === section.title);
        return (
          <section key={section.title} className="lib-section">
            <h2 className="section-title">{section.title}</h2>
            <ul className="sets">
              {packs.map((p) => {
                const owned = bySource.get(p.id);
                const emojis = p.words.filter((w) => w.emoji).slice(0, 5).map((w) => w.emoji).join(" ");
                return (
                  <li className="set" key={p.id}>
                    <div className="head">
                      <h3>{p.title}</h3>
                      <div className="meta">{p.words.length} kelime</div>
                      {emojis && (
                        <div className="set-emojis" aria-hidden="true">
                          {emojis}
                        </div>
                      )}
                    </div>
                    <div className="body">
                      <p className="preview">
                        {p.words
                          .slice(0, 6)
                          .map((w) => w.term)
                          .join(", ")}
                        …
                      </p>
                      <div className="actions">
                        {owned ? (
                          <Link className="btn" to={`/set/${owned.id}/kartlar`}>
                            Eklendi, çalış
                          </Link>
                        ) : (
                          <button className="btn primary" type="button" onClick={() => addPack(p)}>
                            Setlerime ekle
                          </button>
                        )}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
    </section>
  );
}
