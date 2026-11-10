import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useStore } from "../store/StoreContext.jsx";
import { useToast } from "../components/Toast.jsx";
import ConfirmButton from "../components/ConfirmButton.jsx";
import { uid } from "../lib/text.js";

export default function Home() {
  const { sets, deleteSet } = useStore();
  const navigate = useNavigate();
  const toast = useToast();
  const sorted = sets.slice().sort((a, b) => (b.updated || 0) - (a.updated || 0));

  return (
    <section>
      <div className="page-head">
        <div>
          <h1 className="title">Setlerin</h1>
          <p className="lede">Kartlarını oluştur ya da kütüphaneden hazır paket ekle, sonra dört farklı yolla çalış.</p>
        </div>
        <div className="row-actions">
          <Link className="btn" to="/kutuphane">
            Hazır paket ekle
          </Link>
          <Link className="btn primary" to="/set/yeni">
            Yeni set oluştur
          </Link>
        </div>
      </div>

      {sorted.length ? (
        <ul className="sets">
          {sorted.map((s) => {
            const n = s.cards.length;
            const known = s.cards.filter((c) => c.known).length;
            const preview = s.cards.filter((c) => c.emoji).slice(0, 4).map((c) => c.emoji).join(" ");
            return (
              <li className="set" key={s.id}>
                <div className="head">
                  <h2>{s.title}</h2>
                  <div className="meta">
                    {n} kart, {known} tanesi öğrenildi
                  </div>
                  {preview && (
                    <div className="set-emojis" aria-hidden="true">
                      {preview}
                    </div>
                  )}
                </div>
                <div className="body">
                  <div className="meter" role="img" aria-label={`${n} karttan ${known} tanesi öğrenildi`}>
                    <i style={{ width: `${n ? Math.round((known / n) * 100) : 0}%` }} />
                  </div>
                  <div className="actions">
                    <button className="btn primary" type="button" onClick={() => navigate(`/set/${s.id}/kartlar`)}>
                      Çalış
                    </button>
                    <button className="btn" type="button" onClick={() => navigate(`/set/${s.id}/duzenle`)}>
                      Düzenle
                    </button>
                    <ConfirmButton
                      label="Sil"
                      confirmLabel="Silmeyi onayla"
                      onConfirm={() => {
                        deleteSet(s.id);
                        toast("Set silindi.");
                      }}
                    />
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      ) : (
        <div className="empty">
          <p>Henüz hiç setin yok. Kütüphaneden hazır bir kelime paketi ekleyebilir ya da kendi setini oluşturabilirsin.</p>
          <div className="row-actions">
            <Link className="btn primary" to="/kutuphane">
              Kütüphaneye git
            </Link>
            <Link className="btn" to="/set/yeni">
              Kendi setini oluştur
            </Link>
          </div>
        </div>
      )}

      <Backup />
    </section>
  );
}

function Backup() {
  const { sets, saveSet } = useStore();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const backup = open ? JSON.stringify({ kartlik: 2, sets }) : "";

  function copy() {
    navigator.clipboard?.writeText(backup).then(
      () => toast("Yedek panoya kopyalandı."),
      () => toast("Kopyalanamadı. Metni seçip Ctrl+C ile kopyala.")
    );
  }

  function restore() {
    try {
      const parsed = JSON.parse(input);
      const list = Array.isArray(parsed) ? parsed : parsed?.sets;
      if (!Array.isArray(list)) throw new Error();
      let added = 0;
      for (const s of list) {
        if (!s || typeof s.title !== "string" || !Array.isArray(s.cards)) continue;
        const cards = s.cards
          .filter((c) => c && typeof c.term === "string" && typeof c.def === "string")
          .map((c) => ({ ...c, id: uid(), known: !!c.known }));
        if (!cards.length) continue;
        saveSet({ id: uid(), title: s.title, source: s.source ?? null, cards, best: null });
        added++;
      }
      if (!added) throw new Error();
      setInput("");
      toast(`${added} set eklendi.`);
    } catch {
      toast("Bu metin bir Kartlık yedeği değil. Yedeği eksiksiz kopyalayıp tekrar dene.");
    }
  }

  return (
    <details className="backup" onToggle={(e) => setOpen(e.currentTarget.open)}>
      <summary>Yedekle ve başka yere taşı</summary>
      <p className="hint">
        Bu metni kopyalayıp saklayabilir, başka bir tarayıcıda “Yedeği ekle” ile setlerini geri getirebilirsin.
      </p>
      <textarea className="box mono" rows={4} readOnly value={backup} aria-label="Yedek metni" onFocus={(e) => e.target.select()} />
      <div className="row-actions">
        <button className="btn" type="button" onClick={copy}>
          Yedeği kopyala
        </button>
      </div>
      <textarea
        className="box mono"
        rows={4}
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="Kopyaladığın yedek metnini buraya yapıştır"
        aria-label="Geri yüklenecek yedek metni"
      />
      <div className="row-actions">
        <button className="btn" type="button" onClick={restore} disabled={!input.trim()}>
          Yedeği ekle
        </button>
      </div>
    </details>
  );
}
