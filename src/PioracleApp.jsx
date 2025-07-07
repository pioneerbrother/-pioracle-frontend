// src/PioracleApp.jsx

import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { WalletProvider } from './pages/WalletProvider';
import Header from './components/common/Header';
import Footer from './components/common/Footer';

// --- IMPORT ALL YOUR PAGES ---
import PredictionMarketsListPage from './pages/PredictionMarketsListPage';
import MarketDetailPage from './pages/MarketDetailPage';
import CreateMarketPage from './pages/CreateMarketPage';
import RecentlyResolvedPage from './pages/RecentlyResolvedPage';
import MyPredictionsPage from './pages/MyPredictionsPage';
import GuidePage from './pages/GuidePage';
import TippingPage from './pages/TippingPage';
import BlogPage from './pages/BlogPage';
import BlogPostPaywall from './pages/BlogPostPaywall';

function PioracleApp() {
  return (
    <WalletProvider>
      <Router>
        <div className="App">
          {/* --- THIS IS THE VISIBLE PROOF --- */}
          <h1 style={{ textAlign: 'center', color: 'red', background: 'yellow', padding: '10px' }}>
            ROUTING FIXED - vFINAL
          </h1>
          
          <Header />
          <main>
            <Routes>
              {/* === CORE APP ROUTES === */}
              <Route path="/" element={<PredictionMarketsListPage />} />
              <Route path="/predictions" element={<PredictionMarketsListPage />} />
              <Route path="/predictions/:marketId" element={<MarketDetailPage />} />
              <Route path="/create-market" element={<CreateMarketPage />} />
              <Route path="/recently-resolved" element={<RecentlyResolvedPage />} />
              <Route path="/my-predictions" element={<MyPredictionsPage />} />
              <Route path="/guide" element={<GuidePage />} />
              <Route path="/tip-jar" element={<TippingPage />} />

              {/* ======================================================== */}
              {/* === FINAL, SEPARATED BLOG ROUTING === */}
              {/* This specific route MUST come first */}
              <Route path="/blog/:slug" element={<BlogPostPaywall />} />
              
              {/* This general route comes second */}
              <Route path="/blog" element={<BlogPage />} />
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
