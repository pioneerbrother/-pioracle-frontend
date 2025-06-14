// src/App.jsx
import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

// Import the WalletProvider to wrap the whole app
import { WalletProvider } from './pages/WalletProvider'; 

// --- THIS IS THE CORRECTED IMPORT PATH ---
// It now includes the '/common/' sub-directory
import Header from './components/common/Header'; 
import Footer from './components/common/Footer'; // Correcting this one as well

// Import page components
import PredictionMarketListPage from './pages/PredictionMarketListPage';
import MarketDetailPage from './pages/MarketDetailPage';
import CreateMarketPage from './pages/CreateMarketPage';
import BlogPage from './pages/BlogPage';
import BlogPostPage from './pages/BlogPostPage';

function App() {
  return (
    // Wrap the entire application in WalletProvider
    <WalletProvider>
      <Router>
        <div className="App">
          <Header />
          <main>
            <Routes>
              {/* Routes are correct */}
              <Route path="/" element={<PredictionMarketListPage />} />
              <Route path="/predictions" element={<PredictionMarketListPage />} />
              <Route path="/predictions/:marketId" element={<MarketDetailPage />} />
              <Route path="/create-market" element={<CreateMarketPage />} />
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