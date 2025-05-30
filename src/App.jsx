// pioracle/src/App.jsx
import React from 'react'; // useContext is not needed directly in App if Header handles it
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import PredictionMarketsListPage from './pages/PredictionMarketsListPage';
import MarketDetailPage from './pages/MarketDetailPage';
import MyPredictionsPage from './pages/MyPredictionsPage';
import RecentlyResolvedPage from './pages/RecentlyResolvedPage';
import Header from './components/common/Header';
import { WalletProvider } from './context/WalletProvider';
import './App.css';

function App() {
      console.log("APP.JSX: App component rendering.");
  return (
 
    // WalletProvider and Router should wrap the parts of the app that need them
    <WalletProvider>
      <Router>
        <> {/* Fragment to hold head tags and the rest of the app */}
          {/* --- DEFAULT SITE-WIDE HEAD TAGS --- */}
          {/* These are effectively "defaults" if no deeper component overrides them. */}
          {/* React 19 hoists these to the document <head>. */}
          <title>PiOracle - Decentralized Prediction Markets on Polygon</title>
          <meta name="description" content="Predict the future of cryptocurrencies like Bitcoin, Pi Coin, and major events on PiOracle.online. Transparent, low-fee predictions on the Polygon blockchain." />
          <meta name="keywords" content="pioracle, prediction market, crypto, polygon, matic, bitcoin, pi coin, forecasts, decentralized" />
          <meta name="google-site-verification" content="vqIiRAATxjLLS7USVp-0rl-uF2TCwwN3NH1_Xu_tCfQ" />
         
          {/* Example Open Graph tags for general site sharing */}
          {/* 
          <meta property="og:title" content="PiOracle - Decentralized Prediction Markets" />
          <meta property="og:description" content="Join PiOracle to predict outcomes on crypto and real-world events." />
          <meta property="og:type" content="website" />
          <meta property="og:url" content="https://pioracle.online" />
          <meta property="og:image" content="https://pioracle.online/default-social-image.png" /> // Replace with your actual image URL
          */}
          {/* --- END DEFAULT HEAD TAGS --- */}

          <Header /> {/* Header is now a child of Router and WalletProvider */}
          
          <main className="app-content">
            <Routes>
              <Route path="/" element={<Navigate replace to="/predictions" />} />
              <Route path="/predictions" element={<PredictionMarketsListPage />} />
              <Route path="/predictions/:marketId" element={<MarketDetailPage />} />
              <Route path="/my-predictions" element={<MyPredictionsPage />} />
              <Route path="/resolved-markets" element={<RecentlyResolvedPage />} />
              {/* You could add a How It Works page later */}
              {/* <Route path="/how-it-works" element={<HowItWorksPage />} /> */}
            </Routes>
          </main>

          {/* 
          <footer className="app-footer" style={{textAlign: 'center', padding: '20px', borderTop: '1px solid #eee', marginTop: '30px'}}>
            <p>© {new Date().getFullYear()} PiOracle.online - Predict Responsibly.</p>
          </footer> 
          */}
        </>
      </Router>
    </WalletProvider>
  );
}

export default App;