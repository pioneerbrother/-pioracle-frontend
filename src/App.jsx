// src/App.jsx
import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

// Import the WalletProvider to wrap the whole app
import { WalletProvider } from './pages/WalletProvider'; 

// --- CORRECTED IMPORT PATHS ---
import Header from './components/Header'; // Assuming Header.jsx is in src/components/
import Footer from './components/Footer'; // Assuming Footer.jsx is in src/components/

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
              {/* Default route and predictions route both point to the list page */}
              <Route path="/" element={<PredictionMarketListPage />} />
              
              {/* --- CORRECTED TYPO IN THIS ROUTE --- */}
              <Route path="/predictions" element={<PredictionMarketListPage />} />

              {/* Other application routes */}
              <Route path="/predictions/:marketId" element={<MarketDetailPage />} />
              <Route path="/create-market" element={<CreateMarketPage />} />

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