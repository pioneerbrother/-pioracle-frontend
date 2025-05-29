// pioracle/src/App.jsx
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link as RouterLink } from 'react-router-dom';
import { WalletProvider } from './context/WalletProvider';
import PredictionMarketsListPage from './pages/PredictionMarketsListPage';
import MarketDetailPage from './pages/MarketDetailPage';
import MyPredictionsPage from './pages/MyPredictionsPage'; // <-- IMPORT
import RecentlyResolvedPage from './pages/RecentlyResolvedPage'; // <-- IMPORT
import Header from './components/common/Header'; // <-- IMPORT THE NEW HEADER
import ConnectWalletButton from './components/common/ConnectWalletButton'; // IMPORT THE BUTTON
import './App.css'; 

const AppHeader = () => ( // Renamed for clarity
  <header style={{ 
      display: 'flex', 
      justifyContent: 'space-between', 
      alignItems: 'center', 
      padding: '10px 20px', 
      backgroundColor: '#333', /* Darker background */
      color: 'white', /* White text */
      marginBottom: '20px' 
    }}>
    <nav style={{ display: 'flex', gap: '20px' }}>
      <RouterLink to="/" style={{ color: 'white', textDecoration: 'none' }}>Prediction Markets</RouterLink>
      {/* Add other global navigation links here if needed */}
    </nav>
    <ConnectWalletButton /> {/* ADD THE BUTTON COMPONENT HERE */}
  </header>
);

function App() {
  return (
  
    <Router>
        <WalletProvider>
      <Header />
      
        <AppHeader /> {/* UNCOMMENT AND USE THE NEW HEADER */}
        <main className="main-content-area" style={{ padding: '0 20px' }}>
          <Routes>
            <Route path="/" element={<PredictionMarketsListPage />} />
            <Route path="/predictions" element={<PredictionMarketsListPage />} />
            <Route path="/predictions/:marketId" element={<MarketDetailPage />} />
             <Route path="/my-predictions" element={<MyPredictionsPage />} /> {/* <-- ADD ROUTE */}
              <Route path="/resolved-markets" element={<RecentlyResolvedPage />} /> {/* <-- ADD ROUTE */}
          </Routes>
        </main>
        {/* You can add a simple Footer component here too if desired */}
        {/* <footer style={{textAlign: 'center', padding: '20px', marginTop: '30px', borderTop: '1px solid #eee'}}>PiOracle © 2024</footer> */}
      </WalletProvider>
    </Router>
  );
}

export default App;