/**
 * Openverse: Creative Commons lisanslı görsellerin ücretsiz, anahtarsız arama API'si.
 * Anahtarsız kullanımda istek sınırı vardır; sınır aşılırsa "rate_limited" hatası döner.
 */
const OPENVERSE = "https://api.openverse.org/v1/images/";

export async function searchImages(query, { signal } = {}) {
  const url = `${OPENVERSE}?q=${encodeURIComponent(query)}&page_size=12`;
  const res = await fetch(url, { signal });
  if (res.status === 429) throw Object.assign(new Error("rate_limited"), { code: "rate_limited" });
  if (!res.ok) throw Object.assign(new Error("http_" + res.status), { code: "http" });
  const json = await res.json();
  return (json.results || [])
    .filter((r) => r.thumbnail || r.url)
    .map((r) => ({
      src: r.thumbnail || r.url,
      credit: [
        r.creator,
        r.license ? `CC ${String(r.license).toUpperCase()} ${r.license_version || ""}`.trim() : null,
      ]
        .filter(Boolean)
        .join(", "),
      link: r.foreign_landing_url || null,
    }));
}

/** Yüklenen resmi küçültüp JPEG data URL'ye çevirir (setler küçük kalsın diye). */
export function fileToDataUrl(file, max = 480, quality = 0.8) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("read_failed"));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("not_image"));
      img.onload = () => {
        const scale = Math.min(1, max / Math.max(img.width, img.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}
