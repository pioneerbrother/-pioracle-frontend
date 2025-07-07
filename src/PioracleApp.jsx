// src/PioracleApp.jsx

import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

// Core Application Wrapper
import { WalletProvider } from './pages/WalletProvider'; 

// Layout Components
import Header from './components/common/Header'; 
import Footer from './components/common/Footer';

// Page Components
import PredictionMarketsListPage from './pages/PredictionMarketsListPage';
import CreateMarketPage from './pages/CreateMarketPage';
import RecentlyResolvedPage from './pages/RecentlyResolvedPage';
import MyPredictionsPage from './pages/MyPredictionsPage';
import GuidePage from './pages/GuidePage';
import TippingPage from './pages/TippingPage';
import MarketDetailPage from './pages/MarketDetailPage';
import Blog from './pages/Blog'; // The new unified blog component

function PioracleApp() {
  console.log("--- PIORACLE APP (RENAMED) - FINAL ROUTING LOADED ---");
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

              {/* ======================================================== */}
              {/* === THIS IS THE FINAL, CORRECTED BLOG ROUTING --- */}
              {/* This tells the router that all URLs STARTING WITH /blog should be handled by the Blog component */}
              <Route path="/blog/*" element={<Blog />} />
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

