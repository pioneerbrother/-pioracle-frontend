// src/App.jsx

import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

// Import the provider from its original location
import { WalletProvider } from './pages/WalletProvider.jsx'; 

import Header from './components/common/Header.jsx'; 
import Footer from './components/common/Footer.jsx';

// Import all your page components
import PredictionMarketsListPage from './pages/PredictionMarketsListPage.jsx';
import CreateMarketPage from './pages/CreateMarketPage.jsx';
import RecentlyResolvedPage from './pages/RecentlyResolvedPage.jsx';
import MyPredictionsPage from './pages/MyPredictionsPage.jsx';
import GuidePage from './pages/GuidePage.jsx';
import TippingPage from './pages/TippingPage.jsx';
import MarketDetailPage from './pages/MarketDetailPage.jsx';
import BlogPage from './pages/BlogPage.jsx';
import BlogPostDetail from './pages/BlogPostDetail.jsx'; // The simple detail page

function App() {
  return (
    <WalletProvider>
      <Router>
        <div className="App">
          <Header />
          <main>
            <Routes>
              <Route path="/" element={<PredictionMarketsListPage />} />
              <Route path="/predictions" element={<PredictionMarketsListPage />} />
              <Route path="/predictions/:marketId" element={<MarketDetailPage />} />
              <Route path="/create-market" element={<CreateMarketPage />} />
              <Route path="/recently-resolved" element={<RecentlyResolvedPage />} />
              <Route path="/my-predictions" element={<MyPredictionsPage />} />
              <Route path="/guide" element={<GuidePage />} />
              <Route path="/tip-jar" element={<TippingPage />} />

              {/* The original, simple blog routing */}
              <Route path="/blog" element={<BlogPage />} />
              <Route path="/blog/:slug" element={<BlogPostDetail />} />
              
            </Routes>
          </main>
          <Footer />
        </div>
      </Router>
    </WalletProvider>
  );
}

export default App;