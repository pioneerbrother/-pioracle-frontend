// src/PioracleApp.jsx

import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { WalletProvider } from './pages/WalletProvider';
import Header from './components/common/Header';
import Footer from './components/common/Footer';

// --- IMPORT ALL YOUR PAGE COMPONENTS ---
import PredictionMarketsListPage from './pages/PredictionMarketsListPage';
import MarketDetailPage from './pages/MarketDetailPage';
import CreateMarketPage from './pages/CreateMarketPage';
import RecentlyResolvedPage from './pages/RecentlyResolvedPage';
import MyPredictionsPage from './pages/MyPredictionsPage';
import GuidePage from './pages/GuidePage';
import TippingPage from './pages/TippingPage';
import BlogPage from './pages/BlogPage';
import BlogPostPaywall from './pages/BlogPostPaywall'; // Ensure you have this file

function PioracleApp() {
  return (
    <WalletProvider>
      <Router>
        <div className="App">
          <Header />
          <main>
            <Routes>
              {/* === CORE APP ROUTES (UNCHANGED) === */}
              <Route path="/" element={<PredictionMarketsListPage />} />
              <Route path="/predictions" element={<PredictionMarketsListPage />} />
              <Route path="/predictions/:marketId" element={<MarketDetailPage />} />
              <Route path="/create-market" element={<CreateMarketPage />} />
              <Route path="/recently-resolved" element={<RecentlyResolvedPage />} />
              <Route path="/my-predictions" element={<MyPredictionsPage />} />
              <Route path="/guide" element={<GuidePage />} />
              <Route path="/tip-jar" element={<TippingPage />} />

              {/* ======================================================== */}
              {/* === THIS IS THE FINAL, CORRECTED BLOG ROUTING === */}
              
              {/* This route handles the blog list page at "/blog" */}
              <Route path="/blog" element={<BlogPage />} />

              {/* This route handles the detail/paywall page at "/read/:slug" */}
              {/* This now matches the links in your BlogPage.jsx file */}
              <Route path="/read/:slug" element={<BlogPostPaywall />} />
              
              {/* ======================================================== */}
            </Routes>
          </main>
          <Footer />
        </div>
      </Router>
    </WalletProvider>
  );
}

export default PioracleApp;

