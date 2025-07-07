// src/PioracleApp.jsx

import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

// --- IMPORT FROM THE NEW, CORRECT LOCATION ---
import { WalletProvider } from './context/WalletContext.jsx'; 

import Header from './components/common/Header.jsx'; 
import Footer from './components/common/Footer.jsx';
import WalletStatus from './components/WalletStatus.jsx';
import PredictionMarketsListPage from './pages/PredictionMarketsListPage.jsx';
import MarketDetailPage from './pages/MarketDetailPage.jsx';
import BlogPage from './pages/BlogPage.jsx';
import BlogPostPaywall from './pages/BlogPostPaywall.jsx';
// ... other page imports ...

function PioracleApp() {
  return (
    // This is the only provider needed.
    <WalletProvider>
      <Router>
        <div className="App">
          <Header />
          <main>
            <Routes>
              {/* === ALL YOUR APPLICATION ROUTES === */}
              <Route path="/" element={<PredictionMarketsListPage />} />
              <Route path="/predictions/:marketId" element={<MarketDetailPage />} />
              <Route path="/blog" element={<BlogPage />} />
              <Route path="/posts/:slug" element={<BlogPostPaywall />} />
              {/* ... etc. */}
            </Routes>
          </main>
          <Footer />
          
          {/* Your debug component will now work correctly */}
          <WalletStatus />
        </div>
      </Router>
    </WalletProvider>
  );
}

export default PioracleApp;
