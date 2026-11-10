import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import { registerSW } from "virtual:pwa-register";
import { keepTabInApp } from "./lib/focus.js";
import "./styles.css";

keepTabInApp();
// Yayındaki sürümde internetsiz açılma önbelleğini kurar; yeni sürüm yayınlanınca sayfa kendini yeniler.
// Geliştirme sunucusunda etkisizdir.
registerSW({ immediate: true });

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
  </StrictMode>
);
