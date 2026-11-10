import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useStore } from "../store/StoreContext.jsx";
import CardImage from "../components/CardImage.jsx";
import { check, distractors, shuffle } from "../lib/text.js";

// Doğru cevabın yeşil işaretini görecek kadar bekleyip sıradaki soruya geçer.
const CORRECT_DELAY = 500;
// Bilinemeyen kart en fazla bu kadar kez art arda doğru cevaplanınca öğrenilmiş sayılır.
const MAX_REPEAT = 5;

const FRESH = { level: 0, streak: 0, misses: 0 };

/**
 * Kartın öğrenilmiş sayılması için kaç doğru cevap daha gerekiyor (0: öğrenildi).
 * Hem modun basamakları tamamlanmalı hem de son yanlıştan beri yanlış sayısı kadar (en fazla MAX_REPEAT) art arda doğru verilmeli.
 */
function remaining(p, mode) {
  const steps = p.level >= 2 ? 0 : mode === "mix" && p.level === 0 ? 2 : 1;
  return Math.max(steps, Math.min(p.misses, MAX_REPEAT) - p.streak, 0);
}

/**
 * Her kartın ilerlemesi: level 0 yeni, 1 tanıdık (çoktan seçmeliyi bildi), 2 basamaklar tamam;
 * streak son yanlıştan beri art arda doğru sayısı, misses bu turdaki yanlış sayısı.
 * learnMode "mix": önce çoktan seçmeli (0 -> 1), sonra yazılı (1 -> 2). "write" ya da "mc": doğru cevap doğrudan 2 yapar.
 * Yanlış cevap kartı 0'a döndürür; kart, yanlış sayısı kadar (en fazla 5) art arda doğru cevaplanana kadar tekrar sorulur.
 */
export default function Learn({ set, Q, A }) {
  const { updateCard, learnMode } = useStore();
  const navigate = useNavigate();
  const [progress, setProgressState] = useState(() => Object.fromEntries(set.cards.map((c) => [c.id, FRESH])));
  const [question, setQuestion] = useState(null);
  const [result, setResult] = useState(null);
  const [stats, setStats] = useState({ asked: 0, right: 0 });

  const progressRef = useRef(progress);
  const cardsRef = useRef(set.cards);
  cardsRef.current = set.cards;
  const lastRef = useRef(null);

  function setProgress(id, value) {
    const next = { ...progressRef.current, [id]: value };
    progressRef.current = next;
    setProgressState(next);
  }

  const next = useCallback(() => {
    const cards = cardsRef.current;
    const p = progressRef.current;
    setResult(null);
    const left = cards.filter((c) => remaining(p[c.id] ?? FRESH, learnMode) > 0);
    if (!left.length) {
      setQuestion({ done: true });
      return;
    }
    const pool = left.length > 1 ? left.filter((c) => c.id !== lastRef.current) : left;
    const card = pool[Math.floor(Math.random() * pool.length)];
    lastRef.current = card.id;
    const wantsMc = learnMode === "mc" || (learnMode === "mix" && (p[card.id] ?? FRESH).level === 0);
    let type = wantsMc && cards.length >= 2 ? "mc" : "write";
    let options = null;
    if (type === "mc") {
      options = shuffle([A(card), ...distractors(cards, card, 3, A)]);
      if (options.length < 2) type = "write";
    }
    setQuestion({ id: card.id, type, options, nonce: Math.random() });
  }, [A, learnMode]);

  useEffect(() => {
    next();
  }, [next]);

  // Doğru cevaptan sonra kısa bir beklemeyle sıradaki soruya geç; yanlışta "Devam et" beklenir.
  useEffect(() => {
    if (!result?.ok) return;
    const t = setTimeout(next, CORRECT_DELAY);
    return () => clearTimeout(t);
  }, [result, next]);

  const card = question && !question.done ? set.cards.find((c) => c.id === question.id) : null;

  function setKnown(c, known) {
    if (c.known !== known) updateCard(set.id, c.id, { known });
  }

  /** Cevabı kaydeder; kartın kaç kez daha sorulacağını (öğrenildiyse 0) döner. Seçmelide doğru, karışık modda yalnız 1. basamağa çıkarır. */
  function record(ok, viaMc, prev = progressRef.current[card.id] ?? FRESH) {
    const level = viaMc && learnMode !== "mc" ? Math.max(prev.level, 1) : 2;
    const p = ok ? { level, streak: prev.streak + 1, misses: prev.misses } : { level: 0, streak: 0, misses: prev.misses + 1 };
    setProgress(card.id, p);
    const left = remaining(p, learnMode);
    if (!ok || left === 0) setKnown(card, ok);
    return left;
  }

  function chooseOption(index) {
    if (result || !card) return;
    const correct = question.options.indexOf(A(card));
    const ok = index === correct;
    const left = record(ok, true);
    setStats((s) => ({ asked: s.asked + 1, right: s.right + (ok ? 1 : 0) }));
    setResult({ ok, picked: index, correct, left });
  }

  function submitWritten(value) {
    if (result || !card) return;
    const ok = value != null && check(value, A(card));
    const prev = progressRef.current[card.id] ?? FRESH;
    const left = record(ok, false, prev);
    setStats((s) => ({ asked: s.asked + 1, right: s.right + (ok ? 1 : 0) }));
    setResult({ ok, given: value, left, prev });
  }

  // "Aslında doğruydu": yanlış sayılan cevabı geri al, doğru say.
  function override() {
    record(true, false, result.prev);
    setStats((s) => ({ ...s, right: s.right + 1 }));
    next();
  }

  // 1–4 tuşlarıyla seçenek seçme
  useEffect(() => {
    if (question?.type !== "mc" || result) return;
    function onKey(e) {
      if (e.target.closest?.("input, textarea, select")) return;
      const n = parseInt(e.key, 10);
      if (n >= 1 && n <= question.options.length) {
        e.preventDefault();
        chooseOption(n - 1);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const n = set.cards.length;
  const learned = (c) => remaining(progress[c.id] ?? FRESH, learnMode) === 0;
  const mastered = set.cards.filter(learned).length;
  const familiar = set.cards.filter((c) => !learned(c) && (progress[c.id] ?? FRESH).level > 0).length;
  const bar = (
    <div className="learn-progress">
      <div className="seg-bar" role="img" aria-label={`${n} karttan ${mastered} tanesi öğrenildi`}>
        <i className="m" style={{ width: `${(mastered / n) * 100}%` }} />
        <i className="l" style={{ width: `${(familiar / n) * 100}%` }} />
      </div>
      <div className="seg-legend">
        <span>Öğrenildi: {mastered}</span>
        <span>Tanıdık: {familiar}</span>
        <span>Yeni: {n - mastered - familiar}</span>
      </div>
    </div>
  );

  if (question?.done) {
    const pct = stats.asked ? Math.round((stats.right / stats.asked) * 100) : 100;
    return (
      <>
        {bar}
        <div className="q-card center">
          <h2 className="q-title">Bu turu tamamladın</h2>
          <p>
            Bütün {n} kartı öğrendin. Toplam {stats.asked} soru cevapladın, isabetin %{pct}.
          </p>
          <div className="row-actions center">
            <button className="btn primary" type="button" onClick={() => navigate(`/set/${set.id}/test`)}>
              Kendini test et
            </button>
            <button
              className="btn"
              type="button"
              onClick={() => {
                const reset = Object.fromEntries(set.cards.map((c) => [c.id, FRESH]));
                progressRef.current = reset;
                setProgressState(reset);
                setStats({ asked: 0, right: 0 });
                next();
              }}
            >
              Yeniden çalış
            </button>
          </div>
        </div>
      </>
    );
  }

  if (!card) return bar;

  const prompt = Q(card);

  return (
    <>
      {bar}
      <div className="q-card" key={question.nonce}>
        <div className="q-kind">{question.type === "mc" ? "Doğru cevabı seç" : "Cevabı yaz"}</div>
        <div className="prompt-row">
          {/* Öğrenirken resim iki yönde de soruyla görünür; Test modunda ipucu olmasın diye gizlidir. */}
          <CardImage card={card} size="md" />
          <div className={"q-prompt" + (prompt.length > 140 ? " long" : "")}>{prompt}</div>
        </div>

        {question.type === "mc" ? (
          <div className="options">
            {question.options.map((opt, idx) => {
              let cls = "opt";
              if (result && idx === result.correct) cls += " correct";
              else if (result && idx === result.picked) cls += " wrong";
              return (
                <button key={idx} type="button" className={cls} disabled={!!result} onClick={() => chooseOption(idx)}>
                  <span className="k" aria-hidden="true">
                    {idx + 1}
                  </span>
                  <span>{opt}</span>
                </button>
              );
            })}
          </div>
        ) : (
          <WrittenAnswer result={result} onSubmit={submitWritten} />
        )}

        {result && (
          <div className="feedback" aria-live="polite">
            <div className="feedback-row">
              <div>
                {result.ok ? (
                  <p className="ok">
                    {result.left === 0
                      ? "Doğru! Bu kartı öğrendin."
                      : question.type === "mc" && learnMode === "mix" && result.left === 1
                        ? "Doğru! Bu kartı bir dahaki sefere yazarak cevaplayacaksın."
                        : `Doğru! Bu kart ${result.left} kez daha sorulacak.`}
                  </p>
                ) : (
                  <>
                    <p className="bad">
                      {question.type === "mc"
                        ? "Bu sefer olmadı. Doğru cevap yeşille işaretli."
                        : result.given == null
                          ? "Sorun değil, doğru cevap bu:"
                          : "Bu sefer olmadı."}
                    </p>
                    <p className="hint">Bu kelime {result.left} kez daha karşına çıkacak.</p>
                  </>
                )}
              </div>
            </div>
            {!result.ok && question.type === "write" && (
              <div className="compare">
                {result.given != null && (
                  <div>
                    <span className="cmp-label">Senin cevabın</span>
                    {result.given}
                  </div>
                )}
                <div>
                  <span className="cmp-label">Doğru cevap</span>
                  <span className="cmp-right">{A(card)}</span>
                </div>
              </div>
            )}
            {!result.ok && (
              <div className="row-actions">
                <button className="btn primary" type="button" autoFocus onClick={next}>
                  Devam et
                </button>
                {question.type === "write" && result.given != null && (
                  <button className="btn ghost" type="button" onClick={override}>
                    Aslında doğruydu
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}

function WrittenAnswer({ result, onSubmit }) {
  const [value, setValue] = useState("");
  const cls = "answer" + (result ? (result.ok ? " is-ok" : result.given != null ? " is-bad" : "") : "");
  return (
    <form
      className="write-form"
      onSubmit={(e) => {
        e.preventDefault();
        if (value.trim()) onSubmit(value.trim());
      }}
    >
      <input
        className={cls}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        disabled={!!result}
        autoFocus
        autoComplete="off"
        autoCapitalize="off"
        spellCheck={false}
        placeholder="Cevabını yaz"
        aria-label="Cevabın"
      />
      <div className="row-actions">
        <button className="btn primary" type="submit" disabled={!!result}>
          Cevapla
        </button>
        <button className="btn ghost" type="button" disabled={!!result} onClick={() => onSubmit(null)}>
          Bilmiyorum
        </button>
      </div>
    </form>
  );
}
