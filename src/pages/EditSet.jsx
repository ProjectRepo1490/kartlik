import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useStore } from "../store/StoreContext.jsx";
import { useToast } from "../components/Toast.jsx";
import CardImage, { hasVisual } from "../components/CardImage.jsx";
import ImagePicker from "../components/ImagePicker.jsx";
import NotFound from "./NotFound.jsx";
import { uid } from "../lib/text.js";
import { searchImages } from "../lib/images.js";

const blank = () => ({ id: uid(), term: "", def: "", emoji: null, image: null, known: false });

const SEPARATORS = {
  tab: { label: "Sekme (Excel ya da Google E-Tablolar’dan kopyalama)", patterns: [/\t/] },
  dash: { label: "Tire ( apple - elma )", patterns: [/\s[-–—]\s/, /[-–—]/] },
  colon: { label: "İki nokta ( apple: elma )", patterns: [/:/] },
  semi: { label: "Noktalı virgül ( apple; elma )", patterns: [/;/] },
  comma: { label: "Virgül ( apple, elma )", patterns: [/,/] },
};

function parseBulk(text, sep) {
  const cards = [];
  let missing = 0;
  for (const line of text.split(/\r?\n/)) {
    if (!line.trim()) continue;
    let m = null;
    for (const re of SEPARATORS[sep].patterns) {
      m = re.exec(line);
      if (m) break;
    }
    if (!m) {
      cards.push({ ...blank(), term: line.trim() });
      missing++;
    } else {
      cards.push({ ...blank(), term: line.slice(0, m.index).trim(), def: line.slice(m.index + m[0].length).trim() });
    }
  }
  return { cards, missing };
}

export default function EditSet() {
  const { id } = useParams();
  const { getSet } = useStore();
  const existing = id ? getSet(id) : null;
  if (id && !existing) return <NotFound />;
  return <Editor key={id || "new"} existing={existing} />;
}

function Editor({ existing }) {
  const { saveSet } = useStore();
  const navigate = useNavigate();
  const toast = useToast();
  const [original] = useState(() => new Map((existing?.cards ?? []).map((c) => [c.id, c])));
  const [title, setTitle] = useState(existing?.title ?? "");
  const [cards, setCards] = useState(() => (existing ? existing.cards.map((c) => ({ ...c })) : [blank(), blank(), blank()]));
  const [error, setError] = useState("");
  const [pickerId, setPickerId] = useState(null);
  const [focusId, setFocusId] = useState(null);
  const [auto, setAuto] = useState(null); // { done, total } otomatik resim ararken
  const stopAuto = useRef(false);
  const titleRef = useRef(null);

  useEffect(() => () => {
    stopAuto.current = true;
  }, []);

  const update = (cardId, patch) => setCards((cs) => cs.map((c) => (c.id === cardId ? { ...c, ...patch } : c)));
  const remove = (cardId) =>
    setCards((cs) => {
      const next = cs.filter((c) => c.id !== cardId);
      return next.length ? next : [blank()];
    });
  function addRow() {
    const c = blank();
    setCards((cs) => [...cs, c]);
    setFocusId(c.id);
  }

  async function findMissingImages() {
    // Emojili kartlar da dahil: fotoğraf bulunursa emojinin yerine o gösterilir, emoji kartta yedek olarak kalır.
    const targets = cards.filter((c) => c.term.trim() && !c.image?.src);
    if (!targets.length) {
      toast("Fotoğrafı olmayan kart yok.");
      return;
    }
    stopAuto.current = false;
    setAuto({ done: 0, total: targets.length });
    let found = 0;
    for (let i = 0; i < targets.length; i++) {
      if (stopAuto.current) break;
      try {
        const results = await searchImages(targets[i].term);
        if (results[0]) {
          update(targets[i].id, { image: { src: results[0].src, credit: results[0].credit, link: results[0].link } });
          found++;
        }
      } catch (e) {
        toast(
          e.code === "rate_limited"
            ? `Arama sınırına ulaşıldı. ${found} karta resim eklendi, kalanları birkaç dakika sonra dene.`
            : "Resim servisine ulaşılamadı. İnternet bağlantını kontrol et."
        );
        setAuto(null);
        return;
      }
      setAuto({ done: i + 1, total: targets.length });
      // Ücretsiz servisi yormamak için istekler arasında kısa bekleme.
      await new Promise((r) => setTimeout(r, 1100));
    }
    setAuto(null);
    toast(`${found} karta resim eklendi. Beğenmediklerini kart üzerindeki resme tıklayarak değiştirebilirsin.`);
  }

  function save() {
    setError("");
    const t = title.trim();
    if (!t) {
      setError("Sete bir ad ver.");
      titleRef.current?.focus();
      return;
    }
    const half = cards.findIndex((c) => (c.term.trim() || c.def.trim()) && !(c.term.trim() && c.def.trim()));
    if (half > -1) {
      setError(`${half + 1} numaralı kartın bir tarafı boş. Doldur ya da kartı sil.`);
      return;
    }
    const finalCards = cards
      .filter((c) => c.term.trim() && c.def.trim())
      .map((c) => {
        const o = original.get(c.id);
        const term = c.term.trim();
        const def = c.def.trim();
        return { ...c, term, def, known: o && o.term === term && o.def === def ? !!o.known : false };
      });
    if (!finalCards.length) {
      setError("En az bir kartın iki tarafını da doldur.");
      return;
    }
    stopAuto.current = true;
    const saved = saveSet({ ...(existing ?? { id: uid(), source: null, best: null }), title: t, cards: finalCards });
    toast("Set kaydedildi.");
    navigate(`/set/${saved.id}/kartlar`);
  }

  const pickerCard = cards.find((c) => c.id === pickerId);

  return (
    <section>
      <div className="page-head">
        <h1 className="title">{existing ? "Seti düzenle" : "Yeni set"}</h1>
      </div>
      <input
        ref={titleRef}
        className="title-input"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Set adı, örneğin “Almanca A1 kelimeler”"
        aria-label="Set adı"
        maxLength={120}
      />

      <BulkImport
        onAdd={(newCards, missing) => {
          setCards((cs) => {
            const trimmed = cs.slice();
            while (trimmed.length && !trimmed[trimmed.length - 1].term.trim() && !trimmed[trimmed.length - 1].def.trim()) trimmed.pop();
            return [...trimmed, ...newCards];
          });
          toast(
            missing
              ? `${newCards.length} kart eklendi. ${missing} satırda ayraç bulunamadı; tanımlarını doldur.`
              : `${newCards.length} kart eklendi.`
          );
        }}
      />

      <div className="image-tools">
        {auto ? (
          <>
            <span className="hint">
              Resimler aranıyor: {auto.done} / {auto.total}
            </span>
            <button className="btn small" type="button" onClick={() => (stopAuto.current = true)}>
              Durdur
            </button>
          </>
        ) : (
          <button className="btn small" type="button" onClick={findMissingImages}>
            Fotoğrafı olmayan kartlara otomatik resim bul
          </button>
        )}
      </div>

      <ol className="rows">
        {cards.map((c, i) => (
          <Row
            key={c.id}
            card={c}
            index={i}
            autoFocus={c.id === focusId}
            isLast={i === cards.length - 1}
            onChange={(patch) => update(c.id, patch)}
            onRemove={() => remove(c.id)}
            onPickImage={() => setPickerId(c.id)}
            onAddAfter={addRow}
          />
        ))}
      </ol>
      <div className="row-actions">
        <button className="btn" type="button" onClick={addRow}>
          Kart ekle
        </button>
      </div>
      <p className="form-error" role="alert">
        {error}
      </p>

      <div className="save-bar">
        <button className="btn ghost" type="button" onClick={() => navigate(existing ? `/set/${existing.id}/kartlar` : "/")}>
          Vazgeç
        </button>
        <button className="btn primary" type="button" onClick={save}>
          Seti kaydet
        </button>
      </div>

      {pickerCard && (
        <ImagePicker card={pickerCard} onChange={(patch) => update(pickerCard.id, patch)} onClose={() => setPickerId(null)} />
      )}
    </section>
  );
}

function AutoTextarea({ value, onChange, autoFocus, onKeyDown }) {
  const ref = useRef(null);
  useLayoutEffect(() => {
    const el = ref.current;
    el.style.height = "auto";
    el.style.height = el.scrollHeight + "px";
  }, [value]);
  useEffect(() => {
    if (autoFocus) ref.current.focus();
  }, [autoFocus]);
  return <textarea ref={ref} className="cell" rows={1} value={value} onChange={(e) => onChange(e.target.value)} onKeyDown={onKeyDown} />;
}

function Row({ card, index, autoFocus, isLast, onChange, onRemove, onPickImage, onAddAfter }) {
  return (
    <li className="row">
      <span className="num" aria-hidden="true">
        {index + 1}
      </span>
      <label className="cell-wrap">
        <AutoTextarea value={card.term} onChange={(term) => onChange({ term })} autoFocus={autoFocus} />
        <span className="cell-label">Terim</span>
      </label>
      <label className="cell-wrap">
        <AutoTextarea
          value={card.def}
          onChange={(def) => onChange({ def })}
          onKeyDown={(e) => {
            // Son kartta Tab'a basınca yeni kart açılır.
            if (e.key === "Tab" && !e.shiftKey && isLast && (card.term.trim() || card.def.trim())) {
              e.preventDefault();
              onAddAfter();
            }
          }}
        />
        <span className="cell-label">Tanım</span>
      </label>
      <button type="button" className="thumb" onClick={onPickImage} aria-label={`${index + 1}. karta resim ekle ya da değiştir`}>
        {hasVisual(card) ? <CardImage card={card} size="xs" /> : <span className="thumb-empty">Resim</span>}
      </button>
      <button type="button" className="btn ghost icon" onClick={onRemove} aria-label={`${index + 1}. kartı sil`} title="Kartı sil">
        ×
      </button>
    </li>
  );
}

function BulkImport({ onAdd }) {
  const [text, setText] = useState("");
  const [sep, setSep] = useState("tab");

  function handleText(v) {
    setText(v);
    if (v.includes("\t")) setSep("tab");
    else if (sep === "tab" && /\s-\s/.test(v)) setSep("dash");
  }

  return (
    <details className="bulk">
      <summary>Listeden toplu ekle</summary>
      <p className="hint">Her satıra bir kart yaz. Terim ile tanımı aşağıda seçtiğin işaretle ayır.</p>
      <textarea
        className="box"
        rows={6}
        value={text}
        onChange={(e) => handleText(e.target.value)}
        placeholder={"apple\telma\nbook\tkitap\ncar\taraba"}
        aria-label="Toplu eklenecek liste"
      />
      <label className="field">
        <span className="cell-label">Terim ile tanımı ayıran işaret</span>
        <select className="select" value={sep} onChange={(e) => setSep(e.target.value)}>
          {Object.entries(SEPARATORS).map(([k, v]) => (
            <option key={k} value={k}>
              {v.label}
            </option>
          ))}
        </select>
      </label>
      <div className="row-actions">
        <button
          className="btn"
          type="button"
          disabled={!text.trim()}
          onClick={() => {
            const { cards, missing } = parseBulk(text, sep);
            if (!cards.length) return;
            onAdd(cards, missing);
            setText("");
          }}
        >
          Listeyi kartlara ekle
        </button>
      </div>
    </details>
  );
}
