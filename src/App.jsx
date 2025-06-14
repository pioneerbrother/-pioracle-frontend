// src/App.jsx
import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

// Core Application Wrapper
import { WalletProvider } from './pages/WalletProvider'; 

// Layout Components
import Header from './components/common/Header'; 
import Footer from './components/common/Footer';

// Page Components
import PredictionMarketsListPage from './pages/PredictionMarketsListPage';
import MarketDetailPage from './pages/MarketDetailPage';
import CreateMarketPage from './pages/CreateMarketPage';
import RecentlyResolvedPage from './pages/RecentlyResolvedPage';
import MyPredictionsPage from './pages/MyPredictionsPage';
import BlogPage from './pages/BlogPage';
import BlogPostPage from './pages/BlogPostPage';
import GuidePage from './pages/GuidePage';

function App() {
  return (
    <WalletProvider>
      <Router>
        <div className="App">
          <Header />
          <main>
            <Routes>
              {/* --- THIS ROUTE IS NOW CORRECTED --- */}
              <Route path="/" element={<PredictionMarketsListPage />} />
              <Route path="/predictions" element={<PredictionMarketsListPage />} />

              {/* Other application routes */}
              <Route path="/predictions/:marketId" element={<MarketDetailPage />} />
              <Route path="/create-market" element={<CreateMarketPage />} />
              <Route path="/recently-resolved" element={<RecentlyResolvedPage />} />
              <Route path="/my-predictions" element={<MyPredictionsPage />} />
              <Route path="/guide" element={<GuidePage />} />

              {/* Blog routes */}
              <Route path="/blog" element={<BlogPage />} />
              <Route path="/blog/:slug" element={<BlogPostPage />} />
            </Routes>
          </main>
          <Footer />
        </div>
      </Router>
    </WalletProvider>
  );
}

export default App;

