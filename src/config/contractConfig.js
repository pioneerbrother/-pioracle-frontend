// src/config/contractConfig.js

import PREDICTION_MARKET_P2P_ABI_JSON from './abis/PredictionMarketP2P.json';
import { createWeb3Modal } from '@web3modal/ethers5'; 

const chains = {
    bsc_testnet: {
        // ... your testnet config ...
    },
       
    bnb_mainnet: {
        rpcUrl: import.meta.env.VITE_BNB_MAINNET_RPC_URL || "https://bsc-dataseed.binance.org/",
        chainIdHex: '0x38', 
        name: 'BNB Smart Chain', 
        symbol: 'BNB', 
        explorerUrl: 'https://bscscan.com',
        
        // --- THIS IS THE FIX ---
        // We are temporarily ignoring the .env variable and hardcoding the OLD address.
        predictionMarketContractAddress: '0x3D93FD642837e61Ef34D6808cE0b29Ec3e15d1C8',
        
        // --- These other addresses are likely for features we removed. We leave them as is. ---
        premiumContentContractAddress: "0x92a43093ee203aa55e5e1538f4a7567e84d0ba64",
        usdcTokenAddress: "0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d",
        
        hostRegistryContractAddress: null,
        tippingJarContractAddress: null,
    },

    polygon_mainnet: {
        rpcUrl: import.meta.env.VITE_POLYGON_MAINNET_RPC_URL || "https://polygon-rpc.com/",
        chainIdHex: '0x89', 
        name: 'Polygon Mainnet', 
        symbol: 'MATIC', 
        explorerUrl: 'https://polygonscan.com/',

        // --- THIS IS THE FIX ---
        // We are temporarily ignoring the .env variable and hardcoding the OLD address.
        predictionMarketContractAddress: '0x1F52a81DF45d8098E676285a436e51a49dC145BC' ,

        // --- These other addresses are likely for features we removed. We leave them as is. ---
        premiumContentContractAddress: "0x7EF0D2c97E28f6f91F17BD406CAf8ab4C01051DD",
        usdcTokenAddress: "0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359",

        hostRegistryContractAddress: null,
        tippingJarContractAddress: null,
    }, 
};

// --- The rest of your file from here down does not need any changes. ---

const VITE_NETWORK_TARGET = import.meta.env.VITE_NETWORK_TARGET || 'bsc_testnet';
const defaultConfig = chains[VITE_NETWORK_TARGET];
// ... and so on ...

if (!WALLETCONNECT_PROJECT_ID) {
    throw new Error("[contractConfig] VITE_WALLETCONNECT_PROJECT_ID is not set in your .env file");
}

// Create and export the web3Modal instance directly from the config file
export const web3Modal = createWeb3Modal({
    ethersConfig: { metadata: { name: "PiOracle", description: "Decentralized Prediction Markets", url: "https://pioracle.online" } },
    chains: getAllSupportedChainsForModal(), // It can safely call its own function
    projectId: WALLETCONNECT_PROJECT_ID,
});