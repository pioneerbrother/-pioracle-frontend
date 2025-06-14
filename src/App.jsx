// src/App.jsx
import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

// Import the WalletProvider to wrap the whole app
import { WalletProvider } from './pages/WalletProvider'; 

// Import layout components
import Header from './components/layout/Header';
import Footer from './components/layout/Footer';

// --- THIS IS THE MISSING IMPORT ---
import PredictionMarketListPage from './pages/PredictionMarketListPage';

// Import other page components
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
              <Route path="/predictions" element={<PredictionMarket-market-list-page />} />

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