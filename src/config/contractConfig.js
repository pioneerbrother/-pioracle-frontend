// src/config/contractConfig.js

import PREDICTION_MARKET_P2P_ABI_JSON from './abis/PredictionMarketP2P.json';

// Get values from .env file
const VITE_BSC_TESTNET_PM_ADDRESS = import.meta.env.VITE_BSC_TESTNET_PREDICTION_MARKET_CONTRACT_ADDRESS;
const VITE_BSC_TESTNET_RPC_URL_FROM_ENV = import.meta.env.VITE_BSC_TESTNET_RPC_URL;

// --- THIS IS THE MAIN CONFIGURATION OBJECT ---
const chains = {
    bsc_testnet: {
        // Your existing, correct testnet configuration
        predictionMarketContractAddress: VITE_BSC_TESTNET_PM_ADDRESS || "0x810Fbd810D9E563920E4543f95B4D277100a38f8",
        hostRegistryContractAddress: "0x634c91dE69d394709de424c7F6C56279E2e4d3B7",
        tippingJarContractAddress: "0x66fc38263C9D5A3d6eFAe8D0C376DdEC00042648",
        premiumContentContractAddress: "0x9f08fbF4f91c0AB1E66D6384c86563cb3C159742",
        usdcTokenAddress: "0x2e35b93D8E2ffc0ba2416767a0315cd82c462C93",
        rpcUrl: VITE_BSC_TESTNET_RPC_URL_FROM_ENV || "https://data-seed-prebsc-1-s1.binance.org:8545/",
        chainIdHex: '0x61',
        name: 'BNB Smart Chain Testnet',
        symbol: 'tBNB',
        explorerUrl: 'https://testnet.bscscan.com'
    },
    
    bnb_mainnet: {
        // --- LIVE MAINNET CONFIGURATION ---
        predictionMarketContractAddress: import.meta.env.VITE_BNB_MAINNET_PREDICTION_MARKET_CONTRACT_ADDRESS,
        premiumContentContractAddress: "0xa7fb3617f2be63e22b7d842ac04f44f0454a021a57c96bf84e6e4597e8aaf7b6", // <-- PASTE BNB ADDRESS HERE
        usdcTokenAddress: "0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d", 
        rpcUrl: import.meta.env.VITE_BNB_MAINNET_RPC_URL || "https://bsc-dataseed.binance.org/",
        chainIdHex: '0x38', 
        name: 'BNB Smart Chain', 
        symbol: 'BNB', 
        explorerUrl: 'https://bscscan.com',
        hostRegistryContractAddress: null,
        tippingJarContractAddress: null,
    },

    polygon_mainnet: {
        // --- LIVE MAINNET CONFIGURATION ---
        predictionMarketContractAddress: import.meta.env.VITE_POLYGON_MAINNET_PREDICTION_MARKET_CONTRACT_ADDRESS,
        premiumContentContractAddress: "0x7EF0D2c97E28f6f91F17BD406CAf8ab4C01051DD", // <-- PASTE POLYGON ADDRESS HERE
        usdcTokenAddress: "0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359",
        rpcUrl: import.meta.env.VITE_POLYGON_MAINNET_RPC_URL || "https://polygon-rpc.com/",
        chainIdHex: '0x89', 
        name: 'Polygon Mainnet', 
        symbol: 'MATIC', 
        explorerUrl: 'https://polygonscan.com/',
        hostRegistryContractAddress: null,
        tippingJarContractAddress: null,
    }
};

// --- The rest of your file is correct and does not need to change ---

const VITE_NETWORK_TARGET = import.meta.env.VITE_NETWORK_TARGET || 'bsc_testnet';
const defaultConfig = chains[VITE_NETWORK_TARGET];

if (!defaultConfig) {
    throw new Error(`[contractConfig] Default config for "${VITE_NETWORK_TARGET}" not found.`);
}
console.log(`[contractConfig] Default config for VITE_NETWORK_TARGET: '${VITE_NETWORK_TARGET}'`, defaultConfig);

export const getContractAbi = () => PREDICTION_MARKET_P2P_ABI_JSON.abi || PREDICTION_MARKET_P2P_ABI_JSON;
export const getTargetChainIdHex = () => defaultConfig.chainIdHex;

export const getConfigForChainId = (chainId) => {
    if (chainId === null || typeof chainId === 'undefined') return null;
    const numChainId = Number(chainId);
    for (const key in chains) {
        if (parseInt(chains[key].chainIdHex, 16) === numChainId) {
            return chains[key];
        }
    }
    console.warn(`[contractConfig] No config found for chainId: ${numChainId}.`);
    return null;
};

export const getPredictionMarketContractAddressForChain = (chainId) => {
    const config = getConfigForChainId(chainId);
    return config?.predictionMarketContractAddress || null;
};

export const getAllSupportedChainsForModal = () => {
    let supportedChainKeysInModal = ['bnb_mainnet', 'polygon_mainnet', 'bsc_testnet']; 

    if (!supportedChainKeysInModal.includes(VITE_NETWORK_TARGET)) {
        supportedChainKeysInModal.push(VITE_NETWORK_TARGET);
        console.log(`[contractConfig] Added default target '${VITE_NETWORK_TARGET}' to modal chain list.`);
    }

    const modalChains = supportedChainKeysInModal.map(key => {
        const chain = chains[key];
        if (!chain || !chain.chainIdHex || !chain.rpcUrl) {
            console.warn(`[contractConfig] Modal config for key '${key}' is incomplete. Skipping.`);
            return null;
        }
        return {
            chainId: parseInt(chain.chainIdHex, 16),
            name: chain.name,
            currency: chain.symbol,
            explorerUrl: chain.explorerUrl,
            rpcUrl: chain.rpcUrl,
        };
    }).filter(chain => chain !== null);

    console.log("[contractConfig] Final chains configured for Web3Modal:", modalChains);
    return modalChains;
};
