import { useEffect, useRef, useState } from "react";
import { searchImages, fileToDataUrl } from "../lib/images.js";
import CardImage, { hasVisual } from "./CardImage.jsx";

/**
 * Bir kartın resmini seçme penceresi:
 * internette arama (Openverse), bilgisayardan yükleme ya da emoji.
 * onChange'e { image, emoji } yaması gönderir.
 */
export default function ImagePicker({ card, onChange, onClose }) {
  const dialogRef = useRef(null);
  const [query, setQuery] = useState(card.term || "");
  const [results, setResults] = useState([]);
  const [status, setStatus] = useState("idle"); // idle | loading | empty | rate | error
  const [emoji, setEmoji] = useState(card.emoji || "");
  const [uploadError, setUploadError] = useState("");

  useEffect(() => {
    const d = dialogRef.current;
    if (d && !d.open) d.showModal();
    if (card.term) runSearch(card.term);
    return () => d?.open && d.close();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function runSearch(q) {
    const text = q.trim();
    if (!text) return;
    setStatus("loading");
    try {
      const found = await searchImages(text);
      setResults(found);
      setStatus(found.length ? "idle" : "empty");
    } catch (err) {
      setStatus(err.code === "rate_limited" ? "rate" : "error");
    }
  }

  function apply(patch) {
    onChange(patch);
    onClose();
  }

  async function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadError("");
    try {
      const src = await fileToDataUrl(file);
      apply({ image: { src, credit: null }, emoji: card.emoji ?? null });
    } catch {
      setUploadError("Bu dosya bir resim olarak açılamadı. JPG, PNG ya da WebP dene.");
    }
  }

  return (
    <dialog
      ref={dialogRef}
      className="modal"
      aria-labelledby="picker-title"
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => e.target === dialogRef.current && onClose()}
    >
      <div className="modal-body">
        <div className="modal-head">
          <h2 id="picker-title" className="q-title">
            “{card.term || "Kart"}” için resim
          </h2>
          <button type="button" className="btn ghost icon" aria-label="Pencereyi kapat" onClick={onClose}>
            ×
          </button>
        </div>

        {hasVisual(card) ? (
          <div className="current-visual">
            <CardImage card={card} size="sm" />
            <button type="button" className="btn small" onClick={() => apply({ image: null, emoji: null })}>
              Resmi kaldır
            </button>
          </div>
        ) : null}

        <form
          className="search-row"
          onSubmit={(e) => {
            e.preventDefault();
            runSearch(query);
          }}
        >
          <input
            className="answer"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Resim ara"
            placeholder="İngilizce aramak daha çok sonuç verir"
          />
          <button className="btn primary" type="submit">
            Ara
          </button>
        </form>

        <div className="results" aria-live="polite" aria-busy={status === "loading"}>
          {status === "loading" && <p className="hint">Resimler aranıyor…</p>}
          {status === "empty" && <p className="hint">Sonuç bulunamadı. Başka bir kelimeyle dene.</p>}
          {status === "rate" && (
            <p className="hint">Arama sınırına ulaşıldı. Birkaç dakika sonra tekrar dene ya da kendi resmini yükle.</p>
          )}
          {status === "error" && (
            <p className="hint">Resim servisine ulaşılamadı. İnternet bağlantını kontrol et ya da kendi resmini yükle.</p>
          )}
          {status === "idle" && results.length > 0 && (
            <ul className="result-grid">
              {results.map((r) => (
                <li key={r.src}>
                  <button
                    type="button"
                    className="result"
                    onClick={() => apply({ image: { src: r.src, credit: r.credit, link: r.link }, emoji: card.emoji ?? null })}
                    title={r.credit}
                  >
                    <img src={r.src} alt="" loading="lazy" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        {results.length > 0 && status === "idle" && (
          <p className="fine-print">Görseller Openverse’ten gelir ve Creative Commons lisanslıdır; sahibi kartta belirtilir.</p>
        )}

        <div className="picker-alt">
          <label className="field">
            <span className="cell-label">Bilgisayarından ya da telefonundan yükle</span>
            <input type="file" accept="image/*" onChange={handleFile} />
          </label>
          {uploadError && <p className="form-error">{uploadError}</p>}
          <form
            className="field"
            onSubmit={(e) => {
              e.preventDefault();
              apply({ image: null, emoji: emoji.trim() || null });
            }}
          >
            <span className="cell-label">Ya da bir emoji kullan</span>
            <div className="search-row">
              <input
                className="answer emoji-input"
                value={emoji}
                onChange={(e) => setEmoji(e.target.value)}
                maxLength={8}
                aria-label="Emoji"
                placeholder="🍎"
              />
              <button className="btn" type="submit">
                Emojiyi kullan
              </button>
            </div>
          </form>
        </div>
      </div>
    </dialog>
  );
}
