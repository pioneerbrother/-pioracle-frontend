// src/PioracleApp.jsx

import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

import { WalletProvider } from './context/WalletContext.jsx'; 
import Header from './components/common/Header.jsx'; 
import Footer from './components/common/Footer.jsx';

import PredictionMarketsListPage from './pages/PredictionMarketsListPage.jsx';
import MarketDetailPage from './pages/MarketDetailPage.jsx';
// ... other page imports

// --- THE ONLY BLOG COMPONENT YOU NEED ---
import Blog from './pages/Blog.jsx'; 

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
              <Route path="/predictions/:marketId" element={<MarketDetailPage />} />
              {/* ... etc */}

              {/* --- THE FINAL, UNIFIED BLOG ROUTING --- */}
              <Route path="/blog" element={<Blog />} />
              <Route path="/posts/:slug" element={<Blog />} />
              
            </Routes>
          </main>
          <Footer />
        </div>
      </Router>
    </WalletProvider>
  );
}

export default PioracleApp;