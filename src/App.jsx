// src/App.jsx - FINAL VERIFIED VERSION
import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { WalletProvider } from './pages/WalletProvider'; 
import Header from './components/common/Header'; 
import Footer from './components/common/Footer';
import PredictionMarketsListPage from './pages/PredictionMarketsListPage';
import MarketDetailPage from './pages/MarketDetailPage';
import CreateMarketPage from './pages/CreateMarketPage';
import RecentlyResolvedPage from './pages/RecentlyResolvedPage';
import MyPredictionsPage from './pages/MyPredictionsPage';
import BlogPage from './pages/BlogPage';
import BlogPostPage from './pages/BlogPostPage';

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
              
              {/* --- VERIFIED THIS ROUTE PATH --- */}
              <Route path="/recently-resolved" element={<RecentlyResolvedPage />} />

              <Route path="/my-predictions" element={<MyPredictionsPage />} />
              <Route path="/blog" element={<BlogPage />} />
              <Route path="/blog/:slug" element={<BlogPostPage />} />
              
              {/* You might need a simple component for the /guide route */}
              {/* <Route path="/guide" element={<GuidePage />} /> */}
            </Routes>
          </main>
          <Footer />
        </div>
      </Router>
    </WalletProvider>
  );
}

export default App;

