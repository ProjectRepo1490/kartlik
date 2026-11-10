import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { supabase } from "../lib/storage/supabase.js";
import { useToast } from "./Toast.jsx";

/** E-postadaki giriş bağlantısı Supabase jetonlarını ya da hatayı adresin # kısmında getirir; HashRouter bunu sayfa adı sanar. */
export const isAuthCallback = (path) => /^\/?(access_token|error)=/.test(path);

/**
 * Supabase jetonu yalnızca sayfa açılışında okur ve adresi temizler. Uygulama zaten açıkken bağlantı aynı pencerede
 * açılırsa sayfa yeniden yüklenmez, jeton işlenmez; süresi dolmuş ya da kullanılmış bağlantının hatası da adreste kalır.
 * İkisini burada karşılar ve ana sayfaya döner.
 */
export default function AuthRedirect() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const toast = useToast();

  useEffect(() => {
    if (!supabase || !isAuthCallback(pathname)) return;
    let cancelled = false;
    (async () => {
      await supabase.auth.getSession(); // sayfa açılışındaki işleme bitsin; başarılıysa adres zaten temizlenmiştir
      if (cancelled) return;
      const params = new URLSearchParams(window.location.hash.slice(1));
      if (params.get("access_token") && params.get("refresh_token")) {
        const { error } = await supabase.auth.setSession({
          access_token: params.get("access_token"),
          refresh_token: params.get("refresh_token"),
        });
        if (error) toast("Giriş yapılamadı. Yeni bir giriş bağlantısı iste.");
      } else if (params.get("error") || params.get("error_description")) {
        toast(
          params.get("error_code") === "otp_expired"
            ? "Bu giriş bağlantısının süresi dolmuş ya da daha önce kullanılmış. Yeni bir bağlantı iste."
            : `Giriş yapılamadı (${params.get("error_description") || params.get("error")}).`
        );
      } else {
        return;
      }
      if (!cancelled) navigate("/", { replace: true });
    })();
    return () => {
      cancelled = true;
    };
  }, [pathname, navigate, toast]);

  return null;
}
