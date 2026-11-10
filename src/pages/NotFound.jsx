import { Link } from "react-router-dom";

export default function NotFound() {
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
