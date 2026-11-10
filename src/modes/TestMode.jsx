import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useStore } from "../store/StoreContext.jsx";
import CardImage from "../components/CardImage.jsx";
import { check, distractors, shuffle } from "../lib/text.js";

const TYPE_LABEL = { mc: "Çoktan seçmeli", tf: "Doğru mu?", write: "Yazılı" };

export default function TestMode({ set, dir, Q, A }) {
  const [questions, setQuestions] = useState(null);
  if (!questions) return <Setup set={set} A={A} onStart={setQuestions} />;
  return <Run key={questions.id} set={set} dir={dir} Q={Q} A={A} test={questions} onNew={() => setQuestions(null)} />;
}

function Setup({ set, A, onStart }) {
  const n = set.cards.length;
  const canChoice = n >= 2;
  const [count, setCount] = useState(String(Math.min(n, 10)));
  const [types, setTypes] = useState({ mc: canChoice, tf: canChoice, write: true });
  const [error, setError] = useState("");

  function start() {
    const chosen = Object.keys(types).filter((k) => types[k]);
    if (!chosen.length) {
      setError("En az bir soru türü seç.");
      return;
    }
    const k = Math.max(1, Math.min(n, parseInt(count, 10) || 1));
    const items = shuffle(set.cards)
      .slice(0, k)
      .map((card) => {
        const q = { card, type: chosen[Math.floor(Math.random() * chosen.length)] };
        if (q.type === "mc") {
          q.options = shuffle([A(card), ...distractors(set.cards, card, 3, A)]);
          if (q.options.length < 2) q.type = "write";
        }
        if (q.type === "tf") {
          const wrong = distractors(set.cards, card, 1, A);
          q.truth = !wrong.length || Math.random() < 0.5;
          q.shown = q.truth ? A(card) : wrong[0];
        }
        return q;
      });
    onStart({ id: Math.random(), items });
  }

  const box = (key, label) => (
    <label className={"check" + (key !== "write" && !canChoice ? " is-disabled" : "")}>
      <input
        type="checkbox"
        checked={types[key]}
        disabled={key !== "write" && !canChoice}
        onChange={(e) => setTypes((t) => ({ ...t, [key]: e.target.checked }))}
      />
      <span>{label}</span>
    </label>
  );

  return (
    <div className="q-card">
      <h2 className="q-title">Testini hazırla</h2>
      {!canChoice && <p className="hint">Sette tek kart olduğu için yalnızca yazılı soru hazırlanabilir.</p>}
      <div className="setup-grid">
        <label className="field">
          <span className="cell-label">Soru sayısı (en fazla {n})</span>
          <input className="num-input" type="number" min={1} max={n} inputMode="numeric" value={count} onChange={(e) => setCount(e.target.value)} />
        </label>
        <fieldset className="field">
          <legend className="cell-label">Soru türleri</legend>
          <div className="checks">
            {box("mc", "Çoktan seçmeli")}
            {box("tf", "Doğru mu, yanlış mı")}
            {box("write", "Yazılı")}
          </div>
        </fieldset>
      </div>
      <p className="form-error" role="alert">
        {error}
      </p>
      <div className="row-actions">
        <button className="btn primary" type="button" onClick={start}>
          Testi başlat
        </button>
      </div>
    </div>
  );
}

function Run({ set, dir, Q, A, test, onNew }) {
  const { saveSet } = useStore();
  const navigate = useNavigate();
  const [answers, setAnswers] = useState({});
  const [graded, setGraded] = useState(false);
  const [overrides, setOverrides] = useState(() => new Set());
  const scoreRef = useRef(null);
  const items = test.items;

  function isRight(q, i) {
    if (overrides.has(i)) return true;
    const a = answers[i];
    if (q.type === "write") return !!a && check(a, A(q.card));
    if (q.type === "mc") return a != null && q.options[a] === A(q.card);
    return a != null && a === q.truth;
  }

  function grade() {
    setGraded(true);
    const wrongIds = new Set(items.filter((q, i) => !isRight(q, i)).map((q) => q.card.id));
    if (set.cards.some((c) => wrongIds.has(c.id) && c.known)) {
      saveSet({ ...set, cards: set.cards.map((c) => (wrongIds.has(c.id) ? { ...c, known: false } : c)) });
    }
    requestAnimationFrame(() => {
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      scoreRef.current?.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
    });
  }

  const score = graded ? items.filter((q, i) => isRight(q, i)).length : 0;
  const pct = Math.round((score / items.length) * 100);
  const termPrompt = dir === "td";

  return (
    <div>
      <div ref={scoreRef} aria-live="polite">
        {graded && (
          <div className="score shown">
            <div className="score-num">%{pct}</div>
            <div>
              <div className="score-line">
                {items.length} sorudan {score} doğru
              </div>
              <div className="hint">
                {pct === 100
                  ? "Kusursuz. Bu seti gerçekten biliyorsun."
                  : pct >= 70
                    ? "İyi gidiyor. Yanlışlarına bir kez daha göz at."
                    : "Öğren modunda biraz daha çalışıp tekrar dene."}
              </div>
            </div>
          </div>
        )}
      </div>

      <ol className="test-list">
        {items.map((q, i) => {
          const ok = graded && isRight(q, i);
          const answered = answers[i] != null && answers[i] !== "";
          return (
            <li key={i} className={"tq" + (graded ? (ok ? " is-ok" : " is-bad") : "")}>
              <div className="tq-head">
                <span>
                  Soru {i + 1} / {items.length}
                </span>
                <span>{TYPE_LABEL[q.type]}</span>
              </div>
              <div className="prompt-row">
                {!termPrompt && <CardImage card={q.card} size="sm" />}
                <div className={"q-prompt small" + (termPrompt ? " term" : "")}>{Q(q.card)}</div>
              </div>

              {q.type === "mc" && (
                <div className="options">
                  {q.options.map((o, j) => {
                    let cls = "opt";
                    if (graded && o === A(q.card)) cls += " correct";
                    else if (graded && answers[i] === j) cls += " wrong";
                    return (
                      <label key={j} className={cls}>
                        <input
                          type="radio"
                          name={`q${i}`}
                          checked={answers[i] === j}
                          disabled={graded}
                          onChange={() => setAnswers((a) => ({ ...a, [i]: j }))}
                        />
                        <span>{o}</span>
                      </label>
                    );
                  })}
                </div>
              )}

              {q.type === "tf" && (
                <>
                  <div className="tf-shown">
                    <span className="cmp-label">Bu eşleşme doğru mu?</span>
                    {q.shown}
                  </div>
                  <div className="options two">
                    {[true, false].map((v) => {
                      let cls = "opt";
                      if (graded && v === q.truth) cls += " correct";
                      else if (graded && answers[i] === v) cls += " wrong";
                      return (
                        <label key={String(v)} className={cls}>
                          <input
                            type="radio"
                            name={`q${i}`}
                            checked={answers[i] === v}
                            disabled={graded}
                            onChange={() => setAnswers((a) => ({ ...a, [i]: v }))}
                          />
                          <span>{v ? "Doğru" : "Yanlış"}</span>
                        </label>
                      );
                    })}
                  </div>
                </>
              )}

              {q.type === "write" && (
                <input
                  className={"answer" + (graded ? (ok ? " is-ok" : answered ? " is-bad" : "") : "")}
                  value={answers[i] ?? ""}
                  disabled={graded}
                  onChange={(e) => setAnswers((a) => ({ ...a, [i]: e.target.value }))}
                  autoComplete="off"
                  autoCapitalize="off"
                  spellCheck={false}
                  placeholder="Cevabını yaz"
                  aria-label={`${i + 1}. sorunun cevabı`}
                />
              )}

              {graded && (
                <div className="tq-result">
                  <p className={ok ? "ok" : "bad"}>
                    {overrides.has(i) ? "Doğru sayıldı" : ok ? "Doğru" : answered ? "Yanlış" : "Boş bırakıldı"}
                  </p>
                  {!ok &&
                    (q.type === "tf" ? (
                      <p>{q.truth ? "Bu eşleşme doğruydu." : `Bu eşleşme yanlıştı. Doğru cevap: ${A(q.card)}`}</p>
                    ) : (
                      <p>
                        <span className="cmp-label">Doğru cevap</span>
                        <span className="cmp-right">{A(q.card)}</span>
                      </p>
                    ))}
                  {!ok && q.type === "write" && answered && (
                    <button className="btn ghost small" type="button" onClick={() => setOverrides((s) => new Set(s).add(i))}>
                      Aslında doğruydu
                    </button>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ol>

      <div className="row-actions test-actions">
        {graded ? (
          <>
            <button className="btn primary" type="button" onClick={onNew}>
              Yeni test hazırla
            </button>
            <button className="btn" type="button" onClick={() => navigate(`/set/${set.id}/ogren`)}>
              Öğren moduna geç
            </button>
          </>
        ) : (
          <button className="btn primary" type="button" onClick={grade}>
            Testi bitir
          </button>
        )}
      </div>
    </div>
  );
}
