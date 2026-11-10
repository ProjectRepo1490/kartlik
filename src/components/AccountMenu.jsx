import { useState } from "react";
import { useStore } from "../store/StoreContext.jsx";
import { supabase } from "../lib/storage/supabase.js";

const LABELS = {
  local: "Bu cihazda saklanıyor",
  signedOut: "Bu cihazda saklanıyor",
  syncing: "Eşitleniyor…",
  synced: "Hesabınla eşitlendi",
  error: "Eşitlenemedi; değişiklikler bu cihazda",
};

/** Supabase'in giriş / şifre hatasını nedenini söyleyen bir cümleye çevirir. */
function authErrorText(error, action) {
  const msg = error.message || "";
  if (error.code === "invalid_credentials") return "E-posta ya da şifre yanlış. Şifre belirlemediysen e-postaya bağlantı iste.";
  if (error.name === "AuthWeakPasswordError" || error.code === "weak_password") return "Şifre çok kısa ya da zayıf. Daha uzun bir şifre dene.";
  if (error.code === "same_password") return "Yeni şifre mevcut şifrenle aynı.";
  if (error.code === "reauthentication_needed") {
    return "Güvenlik için yakın zamanda giriş yapmış olman gerekiyor: çıkış yapıp tekrar gir, sonra şifreni belirle.";
  }
  // Supabase'in ücretsiz e-posta servisi yalnızca projenin ekibindeki adreslere gönderir.
  if (error.code === "email_address_not_authorized" || /not authorized/i.test(msg)) {
    return "Bu adrese e-posta gönderilemiyor: Supabase'in ücretsiz e-posta servisi yalnızca Supabase hesabındaki ekip üyelerinin adreslerine gönderir.";
  }
  if (error.status === 429) {
    return "Çok sık deneme yapıldı. Biraz bekleyip tekrar dene (ücretsiz planda saatte birkaç e-posta gönderilebiliyor).";
  }
  return `${action} (${msg || "bilinmeyen hata"}).`;
}

/** Supabase ayarlıysa e-posta + şifreyle ya da e-postaya gelen bağlantıyla giriş sunar, değilse yalnızca durumu gösterir. */
export default function AccountMenu() {
  const { sync, session, cloudEnabled } = useStore();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [state, setState] = useState("idle"); // idle | sending | sent | error
  const [errorText, setErrorText] = useState("");

  if (!cloudEnabled) return <span className="sync">{LABELS.local}</span>;

  function fail(text) {
    setErrorText(text);
    setState("error");
  }

  async function signIn(e) {
    e.preventDefault();
    if (!password) return fail("Şifreni yaz ya da şifren yoksa e-postaya bağlantı iste.");
    setState("sending");
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (error) fail(authErrorText(error, "Giriş yapılamadı"));
    else setState("idle");
  }

  async function sendLink() {
    if (!email.trim()) return fail("Önce e-posta adresini yaz.");
    setState("sending");
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: window.location.origin + window.location.pathname },
    });
    if (error) fail(authErrorText(error, "Bağlantı gönderilemedi"));
    else setState("sent");
  }

  if (session) {
    return (
      <div className="account">
        <span className="sync">{LABELS[sync]}</span>
        <details className="account-menu">
          <summary className="btn ghost small">Hesap</summary>
          <div className="account-pop">
            <p className="hint">
              <strong>{session.user?.email}</strong> ile giriş yaptın.
            </p>
            <PasswordForm />
            <div className="row-actions">
              <button type="button" className="btn ghost small" onClick={() => supabase.auth.signOut()}>
                Çıkış yap
              </button>
            </div>
          </div>
        </details>
      </div>
    );
  }

  return (
    <details className="account-menu">
      <summary className="btn small">Giriş yap</summary>
      <div className="account-pop">
        {state === "sent" ? (
          <p>
            Giriş bağlantısını <strong>{email}</strong> adresine gönderdik. E-postandaki bağlantıya tıkla, bu sayfaya
            giriş yapmış olarak döneceksin.
          </p>
        ) : (
          <form onSubmit={signIn}>
            <p className="hint">Setlerini her cihazda görmek için giriş yap.</p>
            <input
              className="answer"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="ornek@eposta.com"
              aria-label="E-posta adresi"
            />
            <input
              className="answer"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Şifre"
              aria-label="Şifre"
            />
            {state === "error" && <p className="form-error">{errorText}</p>}
            <div className="row-actions">
              <button className="btn primary" type="submit" disabled={state === "sending"}>
                {state === "sending" ? "Bekle…" : "Giriş yap"}
              </button>
              <button className="btn ghost small" type="button" disabled={state === "sending"} onClick={sendLink}>
                Şifren yoksa: e-postaya bağlantı gönder
              </button>
            </div>
          </form>
        )}
      </div>
    </details>
  );
}

/** Giriş yapmış kullanıcının şifre belirlemesi: diğer cihazlarda e-posta beklemeden e-posta + şifreyle girebilsin. */
function PasswordForm() {
  const [password, setPassword] = useState("");
  const [repeat, setRepeat] = useState("");
  const [state, setState] = useState("idle"); // idle | saving | saved | error
  const [errorText, setErrorText] = useState("");

  async function save(e) {
    e.preventDefault();
    if (password !== repeat) {
      setErrorText("İki şifre aynı değil.");
      setState("error");
      return;
    }
    setState("saving");
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      setErrorText(authErrorText(error, "Şifre kaydedilemedi"));
      setState("error");
      return;
    }
    setPassword("");
    setRepeat("");
    setState("saved");
  }

  return (
    <form onSubmit={save}>
      <p className="hint">Şifre belirle: diğer cihazlarda e-posta beklemeden e-posta ve şifreyle girersin.</p>
      <input
        className="answer"
        type="password"
        required
        autoComplete="new-password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Yeni şifre"
        aria-label="Yeni şifre"
      />
      <input
        className="answer"
        type="password"
        required
        autoComplete="new-password"
        value={repeat}
        onChange={(e) => setRepeat(e.target.value)}
        placeholder="Yeni şifre (tekrar)"
        aria-label="Yeni şifre (tekrar)"
      />
      {state === "error" && <p className="form-error">{errorText}</p>}
      {state === "saved" && <p className="ok">Şifren kaydedildi. Diğer cihazlarda e-posta ve şifreyle girebilirsin.</p>}
      <div className="row-actions">
        <button className="btn primary" type="submit" disabled={state === "saving"}>
          {state === "saving" ? "Kaydediliyor…" : "Şifreyi kaydet"}
        </button>
      </div>
    </form>
  );
}
