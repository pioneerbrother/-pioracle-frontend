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
import BlogPostPage from './pages/BlogPostPage'; // For regular, free posts
import GuidePage from './pages/GuidePage';
import MarketDetailLoader from './pages/MarketDetailLoader';
import TippingPage from './pages/TippingPage'; // For the Tip Jar / Host Hub
import BlogPostDetail from './pages/BlogPostDetail'; // Your NEW detail/paywall page

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
              <Route path="/predictions/:marketId" element={<MarketDetailLoader />} />
              <Route path="/create-market" element={<CreateMarketPage />} />
              <Route path="/recently-resolved" element={<RecentlyResolvedPage />} />
              <Route path="/my-predictions" element={<MyPredictionsPage />} />
              <Route path="/guide" element={<GuidePage />} />
              <Route path="/tip-jar" element={<TippingPage />} />
              {/* Note: /hosts might be a better name for the Tip Jar page route */}
              {/* <Route path="/hosts" element={<HostPage />} /> */}


              {/* --- BLOG ROUTES (Order is Important!) --- */}
              <Route path="/blog" element={<BlogPage />} />

              {/* 1. Specific, Paywalled Routes (handled by ExclusivePostPage) */}
              <Route 
                path="/blog/invasion-plan-of-turkey-en" 
                element={<ExclusivePostPage />} 
              />
              <Route 
                path="/blog/tochnit-plisha-turkiya" 
                element={<ExclusivePostPage />} 
              />

              {/* 2. General Route for all other free posts (handled by BlogPostPage) */}
              {/* This MUST come AFTER the specific routes */}
              <Route path="/blog/:slug" element={<BlogPostPage />} />
               {/* --- NEW, SIMPLIFIED BLOG ROUTES --- */}
              {/* This route shows the list of all blog posts */}
              <Route path="/blog" element={<BlogPage />} />

              {/* This SINGLE route handles ALL individual posts. */}
              {/* It will render our smart BlogPostDetail component, */}
              {/* which decides whether to show a paywall or the content. */}
              <Route path="/blog/:slug" element={<BlogPostDetail />} />
              {/* ========================================================== */}



            </Routes>
          </main>
          <Footer />
        </div>
      </Router>
    </WalletProvider>
  );
}

export default App;

