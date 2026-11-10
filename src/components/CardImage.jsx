import { useState } from "react";

/** Kartın resmini gösterir: yüklenen/aranan resim varsa o, yoksa ya da yüklenemezse (internet yok, servis sınırı) emoji. */
export default function CardImage({ card, size = "md", showCredit = false }) {
  const [failedSrc, setFailedSrc] = useState(null);
  if (card.image?.src && card.image.src !== failedSrc) {
    return (
      <figure className={`card-img ${size}`}>
        <img src={card.image.src} alt="" loading="lazy" onError={() => setFailedSrc(card.image.src)} />
        {showCredit && card.image.credit ? <figcaption>{card.image.credit}</figcaption> : null}
      </figure>
    );
  }
  if (card.emoji) {
    return (
      <span className={`card-emoji ${size}`} aria-hidden="true">
        {card.emoji}
      </span>
    );
  }
  return null;
}

export const hasVisual = (card) => !!(card.image?.src || card.emoji);
