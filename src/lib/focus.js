const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), summary, [tabindex]:not([tabindex="-1"])';

/** Kapalı <details> içindeki öğeler (kendi <summary>'si hariç) Chromium'da ekranda kutu tutsa da odaklanamaz. */
function inClosedDetails(el) {
  for (let d = el.closest("details:not([open])"); d; d = d.parentElement?.closest("details:not([open])")) {
    if (el.parentElement !== d || el.tagName !== "SUMMARY") return true;
  }
  return false;
}

/** Klavyeyle sırayla odaklanabilen, ekranda görünen öğeler (odak koruyucular hariç). */
function focusables(root) {
  return [...root.querySelectorAll(FOCUSABLE)].filter(
    (el) =>
      !("focusGuard" in el.dataset) &&
      el.tabIndex >= 0 &&
      el.getClientRects().length > 0 &&
      getComputedStyle(el).visibility !== "hidden" &&
      !inClosedDetails(el)
  );
}

let backward = false; // son Tab yönü: odak koruyucuya hangi yönden gelindiğini söyler

/**
 * Tab ile odak sayfanın sonundan (Shift+Tab ile başından) tarayıcının adres çubuğuna geçmesin.
 * Sayfanın başında ve sonunda görünmez birer odak koruyucu var: tarayıcı odağı sayfadan çıkarmadan önce
 * bunlara verir, odak da uygulamanın öbür ucuna taşınır. Tab'a müdahale edilmediği için tarayıcının
 * "tıklanan yerden devam et" davranışı bozulmaz. Adres çubuğuna yine F6 ya da Ctrl+L ile gidilebilir.
 */
export function keepTabInApp() {
  for (const atEnd of [false, true]) {
    const guard = document.createElement("span");
    guard.tabIndex = 0;
    guard.dataset.focusGuard = "";
    guard.style.cssText = "position:fixed;top:0;left:0;width:1px;height:0;overflow:hidden";
    guard.addEventListener("focus", () => {
      const items = focusables(document.body);
      if (items.length) (backward ? items[items.length - 1] : items[0]).focus();
    });
    if (atEnd) document.body.append(guard);
    else document.body.prepend(guard);
  }

  document.addEventListener("keydown", (e) => {
    if (e.key !== "Tab") return;
    backward = e.shiftKey;
    // Açık pencere (dialog) varken sayfanın geri kalanı, koruyucular dahil, devre dışıdır: döngü pencerenin içinde kalır.
    const dialog = document.querySelector("dialog[open]");
    if (!dialog || e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey) return;
    const items = focusables(dialog);
    if (!items.length) return;
    const active = document.activeElement;
    const outside = !dialog.contains(active) || active === dialog;
    const target = e.shiftKey
      ? active === items[0] || outside ? items[items.length - 1] : null
      : active === items[items.length - 1] || outside ? items[0] : null;
    if (!target) return;
    e.preventDefault();
    target.focus();
  });
}
