// src/config/contractConfig.js
import PREDICTION_MARKET_P2P_ABI_JSON from './abis/PredictionMarketP2P.json';
import TIPPING_JAR_ABI_JSON from './abis/TippingJar.json';
// import BADGE_ABI_JSON from './abis/Badge.json'; // Only if needed directly by frontend

const chains = {
    polygon_mainnet: {
        predictionMarketContractAddress: import.meta.env.VITE_POLYGON_MAINNET_PREDICTION_MARKET_CONTRACT_ADDRESS || "0x1F52a81DF45d8098E676285a436e51a49dC145BC",
        // tippingJarContractAddress: "YOUR_POLYGON_MAINNET_TIPPING_JAR_ADDRESS_IF_DEPLOYED",
        rpcUrl: import.meta.env.VITE_POLYGON_MAINNET_RPC_URL || "https://polygon-rpc.com/", // Consider your Alchemy URL
        chainIdHex: '0x89', // 137
        name: 'Polygon Mainnet',
        symbol: 'MATIC',
        explorerUrl: 'https://polygonscan.com/',
    },
    bnb_mainnet: {
        predictionMarketContractAddress: import.meta.env.VITE_BNB_MAINNET_CONTRACT_ADDRESS || "0x3D93FD642837e61Ef34D6808cE0b29Ec3e15d1C8",
        // tippingJarContractAddress: "YOUR_BNB_MAINNET_TIPPING_JAR_ADDRESS_IF_DEPLOYED",
        rpcUrl: import.meta.env.VITE_BNB_MAINNET_RPC_URL || "https://bsc-dataseed.binance.org/",
        chainIdHex: '0x38', // 56
        name: 'BNB Smart Chain',
        symbol: 'BNB',
        explorerUrl: 'https://bscscan.com',
    },
    bsc_testnet: {
        // IMPORTANT: Provide a placeholder or actual address if you have a PredictionMarket deployed here
        predictionMarketContractAddress: import.meta.env.VITE_BSC_TESTNET_PREDICTION_MARKET_CONTRACT_ADDRESS || null, // Or "0x00...000" if none
        tippingJarContractAddress: import.meta.env.VITE_BSC_TESTNET_TIPPING_JAR_CONTRACT_ADDRESS || "0xd6d1A0cCFb89A56C58Aa5A72F92723e584aFcbA8",
        badgeContractAddress: import.meta.env.VITE_BSC_TESTNET_BADGE_CONTRACT_ADDRESS || "0x7Db53509cD6DA18B7AaCDe26be7F19231046b015",
        rpcUrl: import.meta.env.VITE_BSC_TESTNET_RPC_URL || "https://data-seed-prebsc-1-s1.binance.org:8545/",
        chainIdHex: '0x61', // 97
        name: 'BNB Smart Chain Testnet',
        symbol: 'tBNB',
        explorerUrl: 'https://testnet.bscscan.com',
    },
    // Add amoy_testnet with predictionMarketContractAddress and tippingJarContractAddress if you test tipping there
    amoy_testnet: {
        predictionMarketContractAddress: import.meta.env.VITE_AMOY_PREDICTION_MARKET_CONTRACT_ADDRESS || null, // Or actual Amoy PM address
        // tippingJarContractAddress: import.meta.env.VITE_AMOY_TIPPING_JAR_CONTRACT_ADDRESS || "YOUR_AMOY_TIPPING_JAR_ADDRESS",
        rpcUrl: import.meta.env.VITE_AMOY_RPC_URL || "https://rpc-amoy.polygon.technology/",
        chainIdHex: '0x13882', // 80002
        name: 'Polygon Amoy',
        symbol: 'MATIC',
        explorerUrl: 'https://www.oklink.com/amoy',
    }
};

const VITE_NETWORK_TARGET = import.meta.env.VITE_NETWORK_TARGET || 'bsc_testnet'; // Default for current testing
const defaultConfig = chains[VITE_NETWORK_TARGET];

if (!defaultConfig) {
    throw new Error(`[contractConfig] Config for VITE_NETWORK_TARGET "${VITE_NETWORK_TARGET}" not found. Check .env and chains object.`);
}
console.log(`[contractConfig] Default configuration loaded for VITE_NETWORK_TARGET: '${VITE_NETWORK_TARGET}' (Chain ID: ${parseInt(defaultConfig.chainIdHex,16)})`);

// --- PREDICTION MARKET SPECIFIC GETTERS ---
export const getPredictionMarketContractAddressForChain = (chainId) => {
    const config = getConfigForChainId(chainId);
    return config?.predictionMarketContractAddress || null;
};
export const getPredictionMarketAbi = () => PREDICTION_MARKET_P2P_ABI_JSON.abi || PREDICTION_MARKET_P2P_ABI_JSON;

// --- TIPPING JAR SPECIFIC GETTERS ---
export const getTippingJarContractAddressForChain = (chainId) => {
    const config = getConfigForChainId(chainId);
    return config?.tippingJarContractAddress || null;
};
export const getTippingJarAbi = () => TIPPING_JAR_ABI_JSON.abi || TIPPING_JAR_ABI_JSON;

// --- UTILITY GETTERS ---
export const getTargetChainIdHex = () => defaultConfig.chainIdHex; // For Web3Modal default

// --- Get config for a SPECIFIC chainId (used by WalletProvider and pages) ---
export const getConfigForChainId = (chainId) => {
    if (chainId === null || typeof chainId === 'undefined') return null; // Handle null/undefined chainId gracefully
    const numChainId = Number(chainId); 
    
    for (const key in chains) {
        if (parseInt(chains[key].chainIdHex, 16) === numChainId) {
            return chains[key];
        }
    }
    console.warn(`[contractConfig] No full configuration found for chainId: ${numChainId}. Returning null.`);
    return null;
};

// --- Get all supported chains for Web3Modal ---
export const getAllSupportedChainsForModal = () => {
    const supportedChainKeysInModal = ['polygon_mainnet', 'bnb_mainnet', 'bsc_testnet', 'amoy_testnet']; // Now includes testnets
    
    return supportedChainKeysInModal.map(key => {
        const chain = chains[key];
        if (!chain) {
            console.warn(`[contractConfig] Config for chain key "${key}" not found while preparing Web3Modal chains.`);
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
};