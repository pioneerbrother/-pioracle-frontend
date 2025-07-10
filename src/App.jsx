// src/App.jsx

import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

// Import the provider
import { WalletProvider } from './pages/WalletProvider.jsx'; 

// Import common components
import Header from './components/common/Header.jsx'; 
import Footer from './components/common/Footer.jsx';

// Import ONLY the page components that still exist
import PredictionMarketsListPage from './pages/PredictionMarketsListPage.jsx';
import CreateMarketPage from './pages/CreateMarketPage.jsx';
import RecentlyResolvedPage from './pages/RecentlyResolvedPage.jsx';
import MyPredictionsPage from './pages/MyPredictionsPage.jsx';
import GuidePage from './pages/GuidePage.jsx';
import MarketDetailPage from './pages/MarketDetailPage.jsx';

function App() {
  return (
    <WalletProvider>
      <Router>
        <div className="App">
          <Header />
          <main>
            <Routes>
              {/* Core Prediction Market Routes */}
              <Route path="/" element={<PredictionMarketsListPage />} />
              <Route path="/predictions" element={<PredictionMarketsListPage />} />
              <Route path="/predictions/:marketId" element={<MarketDetailPage />} />
              <Route path="/create-market" element={<CreateMarketPage />} />
              <Route path="/recently-resolved" element={<RecentlyResolvedPage />} />
              <Route path="/my-predictions" element={<MyPredictionsPage />} />
              <Route path="/guide" element={<GuidePage />} />

              {/* All other routes (Tip Jar, Blog, etc.) have been removed. */}
              
            </Routes>
          </main>
          <Footer />
        </div>
      </Router>
    </WalletProvider>
  );
}

export default App;