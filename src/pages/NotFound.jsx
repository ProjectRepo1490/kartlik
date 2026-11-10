import { Link, useLocation } from "react-router-dom";
import { isAuthCallback } from "../components/AuthRedirect.jsx";

export default function NotFound() {
  const { pathname } = useLocation();
  // Giriş bağlantısından dönüşte adres bir sayfa değil; AuthRedirect işleyip ana sayfaya döndürene kadar.
  if (isAuthCallback(pathname)) {
    return (
      <section className="empty">
        <p>Giriş yapılıyor…</p>
      </section>
    );
  }
  return (
    <section className="empty">
      <h1 className="q-title">Bu sayfa bulunamadı</h1>
      <p>Set silinmiş ya da bağlantı yanlış olabilir.</p>
      <Link className="btn primary" to="/">
        Setlerime dön
      </Link>
    </section>
  );
}
