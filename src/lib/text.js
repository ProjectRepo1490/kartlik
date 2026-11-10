export const uid = () =>
  Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-5);

export function shuffle(list) {
  const a = list.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Büyük/küçük harf ve noktalama farkını yok sayar.
 * Türkçe ve İngilizce "I/İ" farkı için iki ayrı dil kuralıyla küçültür:
 * "I" İngilizcede "i", Türkçede "ı" olur; ikisi de denenir.
 */
function normWith(s, locale) {
  return String(s ?? "")
    .normalize("NFC")
    .toLocaleLowerCase(locale)
    .replace(/\u0307/g, "") // "İ" İngilizce kuralla küçültülünce kalan nokta işareti
    .replace(/[.,;:!?'"’‘“”(){}[\]]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export const norm = (s) => normWith(s, "tr");

/** Cevabın kabul edilebilir biçimleri: tamamı, parantezsiz hâli ve virgülle ayrılmış her parça. */
function variants(target) {
  const t = String(target ?? "");
  const noParens = t.replace(/\([^)]*\)/g, " ");
  return [t, noParens, ...noParens.split(/[,;/]/)];
}

export function check(answer, target) {
  for (const locale of ["tr", "en"]) {
    const a = normWith(answer, locale);
    if (!a) return false;
    if (variants(target).some((v) => normWith(v, locale) === a)) return true;
  }
  return false;
}

/** Aynı setten, doğru cevapla karışmayacak k tane yanlış seçenek. */
export function distractors(cards, card, k, answerOf) {
  const seen = new Set([norm(answerOf(card))]);
  const out = [];
  for (const other of shuffle(cards.filter((c) => c.id !== card.id))) {
    const value = answerOf(other);
    const key = norm(value);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(value);
    if (out.length >= k) break;
  }
  return out;
}

export const formatSeconds = (t) => t.toFixed(1).replace(".", ",") + " sn";
