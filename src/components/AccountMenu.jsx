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

/** Supabase'in giriş bağlantısı hatasını nedenini söyleyen bir cümleye çevirir. */
function otpErrorText(error) {
  const msg = error.message || "";
  // Supabase'in ücretsiz e-posta servisi yalnızca projenin ekibindeki adreslere gönderir.
  if (error.code === "email_address_not_authorized" || /not authorized/i.test(msg)) {
    return "Bu adrese e-posta gönderilemiyor: Supabase'in ücretsiz e-posta servisi yalnızca Supabase hesabındaki ekip üyelerinin adreslerine gönderir.";
  }
  if (error.status === 429) {
    return "Çok sık bağlantı istendi. Biraz bekleyip tekrar dene (ücretsiz planda saatte birkaç e-posta gönderilebiliyor).";
  }
  return `Bağlantı gönderilemedi (${msg || "bilinmeyen hata"}). Adresi kontrol edip tekrar dene.`;
}

/** Supabase ayarlıysa e-postayla giriş (sihirli bağlantı) sunar, değilse yalnızca durumu gösterir. */
export default function AccountMenu() {
  const { sync, session, cloudEnabled } = useStore();
  const [email, setEmail] = useState("");
  const [state, setState] = useState("idle"); // idle | sending | sent | error
  const [errorText, setErrorText] = useState("");

  if (!cloudEnabled) return <span className="sync">{LABELS.local}</span>;

  async function sendLink(e) {
    e.preventDefault();
    setState("sending");
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: window.location.origin + window.location.pathname },
    });
    if (error) setErrorText(otpErrorText(error));
    setState(error ? "error" : "sent");
  }

  if (session) {
    return (
      <div className="account">
        <span className="sync">{LABELS[sync]}</span>
        <button type="button" className="btn ghost small" onClick={() => supabase.auth.signOut()}>
          Çıkış yap
        </button>
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
          <form onSubmit={sendLink}>
            <p className="hint">Setlerini her cihazda görmek için e-postanla giriş yap. Şifre gerekmez.</p>
            <input
              className="answer"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="ornek@eposta.com"
              aria-label="E-posta adresi"
            />
            {state === "error" && <p className="form-error">{errorText}</p>}
            <div className="row-actions">
              <button className="btn primary" type="submit" disabled={state === "sending"}>
                {state === "sending" ? "Gönderiliyor…" : "Giriş bağlantısı gönder"}
              </button>
            </div>
          </form>
        )}
      </div>
    </details>
  );
}
