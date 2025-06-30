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
import CreateMarketPage from './pages/CreateMarketPage';
import RecentlyResolvedPage from './pages/RecentlyResolvedPage';
import MyPredictionsPage from './pages/MyPredictionsPage';
import BlogPage from './pages/BlogPage';
import BlogPostPage from './pages/BlogPostPage';
import GuidePage from './pages/GuidePage';
import MarketDetailLoader from './pages/MarketDetailLoader'; // Your existing loader for market details

// --- NEWLY IMPORTED TIPPING PAGE ---
import TippingPage from './pages/TippingPage'; // Import your new TippingPage
import BlogPostPaywallPage from './pages/BlogPostPaywallPage';

function App() {
  return (
    <WalletProvider>
      <Router>
        <div className="App">
          <Header />
          <main>
            <Routes>
              {/* --- Main application routes --- */}
              <Route path="/" element={<PredictionMarketsListPage />} />
              <Route path="/predictions" element={<PredictionMarketsListPage />} />
              <Route path="/predictions/:marketId" element={<MarketDetailLoader />} />

              {/* --- Other application routes --- */}
              <Route path="/create-market" element={<CreateMarketPage />} />
              <Route path="/recently-resolved" element={<RecentlyResolvedPage />} />
              <Route path="/my-predictions" element={<MyPredictionsPage />} />
              <Route path="/guide" element={<GuidePage />} />

              {/* --- ADDED ROUTE FOR TIPPING PAGE --- */}
              <Route path="/tip-jar" element={<TippingPage />} />

              {/* --- Blog routes --- */}
              <Route path="/blog" element={<BlogPage />} />
              <Route path="/blog/:slug" element={<BlogPostPage />} />
               <Route path="/blog/fictional-invasion-scenario-turkey-israel" element={<BlogPostPaywallPage />} />
            </Routes>
          </main>
          <Footer />
        </div>
      </Router>
    </WalletProvider>
  );
}

export default App;

