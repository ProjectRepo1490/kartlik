import { HashRouter, Link, NavLink, Route, Routes } from "react-router-dom";
import { StoreProvider } from "./store/StoreContext.jsx";
import { ToastProvider } from "./components/Toast.jsx";
import AccountMenu from "./components/AccountMenu.jsx";
import Home from "./pages/Home.jsx";
import Library from "./pages/Library.jsx";
import EditSet from "./pages/EditSet.jsx";
import Study from "./pages/Study.jsx";
import NotFound from "./pages/NotFound.jsx";

// HashRouter: GitHub Pages, Netlify gibi statik sunucularda ek ayar gerektirmez.
export default function App() {
  return (
    <StoreProvider>
      <ToastProvider>
        <HashRouter>
          <div className="wrap">
            <header className="top">
              <Link to="/" className="brand">
                <span className="logo" aria-hidden="true" />
                Kartlık
              </Link>
              <nav className="nav" aria-label="Ana menü">
                <NavLink to="/" end>
                  Setlerim
                </NavLink>
                <NavLink to="/kutuphane">Kelime kütüphanesi</NavLink>
              </nav>
              <AccountMenu />
            </header>
            <main>
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/kutuphane" element={<Library />} />
                <Route path="/set/yeni" element={<EditSet />} />
                <Route path="/set/:id/duzenle" element={<EditSet />} />
                <Route path="/set/:id/:mode" element={<Study />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </main>
          </div>
        </HashRouter>
      </ToastProvider>
    </StoreProvider>
  );
}
