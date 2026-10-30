/**
 * MiseEnPlace (frontend) — Structure de l'application : barre de navigation et routes.
 */

import { Navigate, Route, Routes } from 'react-router-dom';
import Navbar from './components/Navbar.jsx';
import DashboardPage from './pages/DashboardPage.jsx';
import RecipesPage from './pages/RecipesPage.jsx';
import RecipeFormPage from './pages/RecipeFormPage.jsx';
import RecipeDetailPage from './pages/RecipeDetailPage.jsx';
import StockPage from './pages/StockPage.jsx';

export default function App() {
  return (
    <div className="app">
      <a className="skip-link" href="#contenu">
        Aller au contenu
      </a>
      <Navbar />

      <main id="contenu" className="content">
        <Routes>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/recettes" element={<RecipesPage />} />
          <Route path="/recettes/nouvelle" element={<RecipeFormPage />} />
          <Route path="/recettes/:id" element={<RecipeDetailPage />} />
          <Route path="/stock" element={<StockPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>

      <footer className="site-footer">
        MiseEnPlace — projet SED2515 (données fictives, prix en dollars canadiens)
      </footer>
    </div>
  );
}
