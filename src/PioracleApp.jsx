// src/PioracleApp.jsx

import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

// Core Application Wrapper
import { WalletProvider } from './pages/WalletProvider'; 

// Layout Components
import Header from './components/common/Header'; 
import Footer from './components/common/Footer';
import WalletStatus from './components/WalletStatus'; // <-- IMPORT YOUR DEBUG COMPONENT

// Page Components
import PredictionMarketsListPage from './pages/PredictionMarketsListPage';
import CreateMarketPage from './pages/CreateMarketPage';
import RecentlyResolvedPage from './pages/RecentlyResolvedPage';
import MyPredictionsPage from './pages/MyPredictionsPage';
import GuidePage from './pages/GuidePage';
import TippingPage from './pages/TippingPage';
import MarketDetailPage from './pages/MarketDetailPage';
import Blog from './pages/Blog'; // Your unified blog component

function PioracleApp() {
  return (
    <WalletProvider>
      <Router>
        <div className="App">
          <Header />
          <main>
            <Routes>
              {/* === ALL YOUR OTHER PAGES RESTORED === */}
              <Route path="/" element={<PredictionMarketsListPage />} />
              <Route path="/predictions" element={<PredictionMarketsListPage />} />
              <Route path="/predictions/:marketId" element={<MarketDetailPage />} />
              <Route path="/create-market" element={<CreateMarketPage />} />
              <Route path="/recently-resolved" element={<RecentlyResolvedPage />} />
              <Route path="/my-predictions" element={<MyPredictionsPage />} />
              <Route path="/guide" element={<GuidePage />} />
              <Route path="/tip-jar" element={<TippingPage />} />

              {/* === THE CORRECTED BLOG ROUTES === */}
              <Route path="/blog" element={<Blog />} />
              <Route path="/blog/:slug" element={<Blog />} />
              
            </Routes>
          </main>
          <Footer />
          
          {/* === ADD YOUR DEBUG COMPONENT HERE === */}
          {/* It will be visible on all pages, floating at the bottom right */}
          <WalletStatus />
        </div>
      </Router>
    </WalletProvider>
  );
}

export default PioracleApp;
