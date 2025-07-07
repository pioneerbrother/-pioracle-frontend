// src/App.jsx
import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

// Core Application Wrapper
import { WalletProvider } from './pages/WalletProvider'; 

// Layout Components
import Header from './components/common/Header'; 
import Footer from './components/common/Footer';
import BlogLayout from './pages/BlogLayout'; // <-- IMPORT THE NEW LAYOUT

// Page Components
import PredictionMarketsListPage from './pages/PredictionMarketsListPage';
import CreateMarketPage from './pages/CreateMarketPage';
import RecentlyResolvedPage from './pages/RecentlyResolvedPage';
import MyPredictionsPage from './pages/MyPredictionsPage';
import BlogPage from './pages/BlogPage';
import BlogPostPage from './pages/BlogPostPage'; // For regular, free posts
import GuidePage from './pages/GuidePage';
import MarketDetailLoader from './pages/MarketDetailLoader';
import TippingPage from './pages/TippingPage'; // For the Tip Jar / Host Hub
import BlogPostDetail from './pages/BlogPostPaywall'; // Your NEW detail/paywall page
import MarketDetailPage from './pages/MarketDetailPage';
import BlogPostPaywall from './pages/BlogPostPaywall';

function App() {
  return (
    <WalletProvider>
      <Router>
        <div className="App">
          <Header />
          <main>
            <Routes>
              {/* --- Core App Routes --- */}
              <Route path="/" element={<PredictionMarketsListPage />} />
              <Route path="/predictions" element={<PredictionMarketsListPage />} />
              <Route path="/predictions/:marketId" element={<MarketDetailPage />} />
              <Route path="/create-market" element={<CreateMarketPage />} />
              <Route path="/recently-resolved" element={<RecentlyResolvedPage />} />
              <Route path="/my-predictions" element={<MyPredictionsPage />} />
              <Route path="/guide" element={<GuidePage />} />
              <Route path="/tip-jar" element={<TippingPage />} />
              {/* Note: /hosts might be a better name for the Tip Jar page route */}
              {/* <Route path="/hosts" element={<HostPage />} /> */}
               {/* ======================================================== */}
              {/* --- THIS IS THE CORRECTED BLOG ROUTING LOGIC --- */}
              {/* Route 1: Shows the list of all posts. */}
              <Route path="/blog" element={<BlogLayout />} />
               <Route index element={<BlogPage />} />

              {/* Route 2: Shows the detail page for ANY post. */}
              {/* It renders our smart BlogPostDetail component, which will */}
              {/* check for the 'premium' flag and handle the paywall. */}
              <Route path="/blog/:slug" element={<BlogPostPaywall />} />
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

