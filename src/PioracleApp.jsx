// src/PioracleApp.jsx

import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

// Import all components with the .jsx extension for build safety.
import { WalletProvider } from './context/WalletContext.jsx'; 
import Header from './components/common/Header.jsx'; 
import Footer from './components/common/Footer.jsx';
import PredictionMarketsListPage from './pages/PredictionMarketsListPage.jsx';
import CreateMarketPage from './pages/CreateMarketPage.jsx';
import RecentlyResolvedPage from './pages/RecentlyResolvedPage.jsx';
import MyPredictionsPage from './pages/MyPredictionsPage.jsx';
import GuidePage from './pages/GuidePage.jsx';
import TippingPage from './pages/TippingPage.jsx';
import MarketDetailPage from './pages/MarketDetailPage.jsx';
import BlogPage from './pages/BlogPage.jsx';
import BlogPostPaywall from './pages/BlogPostPaywall.jsx';

function PioracleApp() {
  return (
    <WalletProvider>
      <Router>
        <div className="App">
          <Header />
          <main>
            <Routes>
              {/* === ALL YOUR OTHER PAGES === */}
              <Route path="/" element={<PredictionMarketsListPage />} />
              <Route path="/predictions" element={<PredictionMarketsListPage />} />
              <Route path="/predictions/:marketId" element={<MarketDetailPage />} />
              <Route path="/create-market" element={<CreateMarketPage />} />
              <Route path="/recently-resolved" element={<RecentlyResolvedPage />} />
              <Route path="/my-predictions" element={<MyPredictionsPage />} />
              <Route path="/guide" element={<GuidePage />} />
              <Route path="/tip-jar" element={<TippingPage />} />

              {/* ======================================================== */}
              {/* === THE UNAMBIGUOUS BLOG ROUTING === */}
              <Route path="/blog" element={<BlogPage />} />
              <Route path="/posts/:slug" element={<BlogPostPaywall />} />
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