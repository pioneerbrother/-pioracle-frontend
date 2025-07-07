// src/main.jsx

import React from 'react';
import ReactDOM from 'react-dom/client';
import PioracleApp from './PioracleApp.jsx';
import './index.css';

// --- THIS IS THE CRITICAL FIX ---
// 1. Import the necessary functions at the top.
import { createWeb3Modal } from '@web3modal/ethers5/react';
import { getAllSupportedChainsForModal } from './config/contractConfig.js';

// 2. Get your project ID from environment variables.
const WALLETCONNECT_PROJECT_ID = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID;

// 3. Call createWeb3Modal here, BEFORE the React app renders.
// This guarantees that the modal is ready before any hooks are called.
createWeb3Modal({
    ethersConfig: { metadata: { name: "PiOracle", description: "Decentralized Prediction Markets", url: "https://pioracle.online" } },
    chains: getAllSupportedChainsForModal(),
    projectId: WALLETCONNECT_PROJECT_ID,
});
// --- END OF FIX ---

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <PioracleApp />
  </React.StrictMode>,
);
