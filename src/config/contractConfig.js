// src/config/contractConfig.js

import PREDICTION_MARKET_P2P_ABI_JSON from './abis/PredictionMarketP2P.json';
import { createWeb3Modal } from '@web3modal/ethers5';

const WALLETCONNECT_PROJECT_ID = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID;

// --- STEP 1: DEFINE THE CHAINS DATA ---
const chains = {
    bnb_mainnet: {
        rpcUrl: "https://bsc-dataseed.binance.org/",
        chainIdHex: '0x38', 
        name: 'BNB Smart Chain', 
        symbol: 'BNB', 
        explorerUrl: 'https://bscscan.com',
        predictionMarketContractAddress: '0x3D93FD642837e61Ef34D6808cE0b29Ec3e15d1C8',
    },
    polygon_mainnet: {
        rpcUrl: "https://polygon-rpc.com/",
        chainIdHex: '0x89', 
        name: 'Polygon', 
        symbol: 'MATIC', 
        explorerUrl: 'https://polygonscan.com/',
        predictionMarketContractAddress: '0x1F52a81DF45d8098E676285a436e51a49dC145BC',
    },
    bsc_testnet: {
        rpcUrl: "https://data-seed-prebsc-1-s1.binance.org:8545/",
        chainIdHex: '0x61',
        name: 'BNB Smart Chain Testnet',
        symbol: 'tBNB',
        explorerUrl: 'https://testnet.bscscan.com',
        predictionMarketContractAddress: import.meta.env.VITE_BSC_TESTNET_PREDICTION_MARKET_CONTRACT_ADDRESS,
    },
};

// --- STEP 2: CREATE THE ARRAY FOR THE MODAL MANUALLY ---
// This avoids calling a function during initialization.
const modalChains = [
    {
        chainId: 56, // 0x38
        name: 'BNB Smart Chain',
        currency: 'BNB',
        explorerUrl: 'https://bscscan.com',
        rpcUrl: chains.bnb_mainnet.rpcUrl,
    },
    {
        chainId: 137, // 0x89
        name: 'Polygon',
        currency: 'MATIC',
        explorerUrl: 'https://polygonscan.com',
        rpcUrl: chains.polygon_mainnet.rpcUrl,
    },
    {
        chainId: 97, // 0x61
        name: 'BNB Smart Chain Testnet',
        currency: 'tBNB',
        explorerUrl: 'https://testnet.bscscan.com',
        rpcUrl: chains.bsc_testnet.rpcUrl,
    }
];

// --- STEP 3: EXPORT HELPER FUNCTIONS (No longer includes getAllSupportedChainsForModal) ---
export const getContractAbi = () => PREDICTION_MARKET_P2P_ABI_JSON.abi || PREDICTION_MARKET_P2P_ABI_JSON;

export const getConfigForChainId = (chainId) => {
    if (chainId === null || typeof chainId === 'undefined') return null;
    const numChainId = Number(chainId);
    for (const key in chains) {
        if (parseInt(chains[key].chainIdHex, 16) === numChainId) {
            return chains[key];
        }
    }
    return null;
};

// --- STEP 4: CREATE AND EXPORT THE MODAL ---
if (!WALLETCONNECT_PROJECT_ID) {
    throw new Error("[contractConfig] VITE_WALLETCONNECT_PROJECT_ID is not set");
}

export const web3Modal = createWeb3Modal({
    ethersConfig: { 
        metadata: { 
            name: "PiOracle", 
            description: "Decentralized Prediction Markets", 
            url: "https://pioracle.online" 
        } 
    },
    chains: modalChains, // Use the manually created array
    projectId: WALLETCONNECT_PROJECT_ID,
});