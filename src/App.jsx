// src/App.jsx

import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

// Core Application Wrapper
import { WalletProvider } from './pages/WalletProvider'; 

// Layout Components
import Header from './components/common/Header'; 
import Footer from './components/common/Footer';
// We no longer need BlogLayout

// Page Components
import PredictionMarketsListPage from './pages/PredictionMarketsListPage';
import CreateMarketPage from './pages/CreateMarketPage';
import RecentlyResolvedPage from './pages/RecentlyResolvedPage';
import MyPredictionsPage from './pages/MyPredictionsPage';
import BlogPage from './pages/BlogPage';
import BlogPostPaywall from './pages/BlogPostPaywall'; // Using the renamed component
import GuidePage from './pages/GuidePage';
import TippingPage from './pages/TippingPage';
import MarketDetailPage from './pages/MarketDetailPage';

function App() {
  return (
    <WalletProvider>
      <Router>
        <div className="App">
          <Header />
          <main>
            <Routes>
              {/* --- Core App Routes (Unchanged) --- */}
              <Route path="/" element={<PredictionMarketsListPage />} />
              <Route path="/predictions" element={<PredictionMarketsListPage />} />
              <Route path="/predictions/:marketId" element={<MarketDetailPage />} />
              <Route path="/create-market" element={<CreateMarketPage />} />
              <Route path="/recently-resolved" element={<RecentlyResolvedPage />} />
              <Route path="/my-predictions" element={<MyPredictionsPage />} />
              <Route path="/guide" element={<GuidePage />} />
              <Route path="/tip-jar" element={<TippingPage />} />

              {/* ======================================================== */}
              {/* --- THIS IS THE FINAL, SIMPLIFIED BLOG ROUTING --- */}
              {/* The router is smart enough to pick the most specific path first. */}
              
              <Route path="/blog/:slug" element={<BlogPostPaywall />} />
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

export default App;


