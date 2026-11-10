import { useEffect, useRef, useState } from "react";

/** İlk tıklamada onay ister, 3,5 saniye içinde ikinci tıklama işlemi yapar. */
export default function ConfirmButton({ label, confirmLabel, onConfirm, className = "btn ghost danger" }) {
  const [armed, setArmed] = useState(false);
  const timer = useRef(null);
  useEffect(() => () => clearTimeout(timer.current), []);

  function handleClick() {
    if (armed) {
      clearTimeout(timer.current);
      setArmed(false);
      onConfirm();
      return;
    }
    setArmed(true);
    timer.current = setTimeout(() => setArmed(false), 3500);
  }

  return (
    <button type="button" className={className + (armed ? " armed" : "")} onClick={handleClick}>
      {armed ? confirmLabel : label}
    </button>
  );
}
