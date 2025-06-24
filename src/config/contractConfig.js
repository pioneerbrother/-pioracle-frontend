// src/config/contractConfig.js
import PREDICTION_MARKET_ABI from './PredictionMarketP2P.json';

const chains = {
    // Polygon Mainnet - Chain ID: 137 (decimal)
    polygon_mainnet: {
        contractAddress: import.meta.env.VITE_POLYGON_MAINNET_PREDICTION_MARKET_CONTRACT_ADDRESS || "0x1F52a81DF45d8098E676285a436e51a49dC145BC", // Your old contract
        rpcUrl: import.meta.env.VITE_POLYGON_MAINNET_RPC_URL || "https://polygon-rpc.com/", // USE YOUR ALCHEMY URL HERE
        chainIdHex: '0x89',
        name: 'Polygon Mainnet',
        symbol: 'MATIC',
        explorerUrl: 'https://polygonscan.com/',
    },
    // BNB Smart Chain Mainnet - Chain ID: 56 (decimal)
    bnb_mainnet: {
        contractAddress: import.meta.env.VITE_BNB_MAINNET_CONTRACT_ADDRESS || "0x3D93FD642837e61Ef34D6808cE0b29Ec3e15d1C8", // Your new contract
        rpcUrl: import.meta.env.VITE_BNB_MAINNET_RPC_URL || "https://bsc-dataseed.binance.org/",
        chainIdHex: '0x38',
        name: 'BNB Smart Chain',
        symbol: 'BNB',
        explorerUrl: 'https://bscscan.com',
    },
    // Add other chains like amoy_testnet, bsc_testnet if you want them in Web3Modal's list
};

// --- VITE_NETWORK_TARGET determines the DEFAULT chain for users NOT YET CONNECTED ---
const VITE_NETWORK_TARGET = import.meta.env.VITE_NETWORK_TARGET || 'bnb_mainnet'; // Default to bnb for new users
const defaultConfig = chains[VITE_NETWORK_TARGET];

if (!defaultConfig) {
    throw new Error(`[contractConfig] Config for VITE_NETWORK_TARGET "${VITE_NETWORK_TARGET}" not found.`);
}
console.log(`[contractConfig] Default configuration loaded for VITE_NETWORK_TARGET: '${VITE_NETWORK_TARGET}'`);

export const getContractAbi = () => PREDICTION_MARKET_ABI.abi || PREDICTION_MARKET_ABI;

// --- GETTERS FOR THE DEFAULT TARGET NETWORK (used by Web3Modal defaultChainId) ---
export const getTargetChainIdHex = () => defaultConfig.chainIdHex;

// --- NEW FUNCTION: Get config for a SPECIFIC chainId ---
export const getConfigForChainId = (chainId) => {
    if (!chainId) return null;
    const chainIdStr = typeof chainId === 'number' ? chainId.toString() : chainId; // Ensure it's a string for lookup if needed
    
    for (const key in chains) {
        if (parseInt(chains[key].chainIdHex, 16).toString() === chainIdStr) {
            return chains[key];
        }
    }
    console.warn(`[contractConfig] No configuration found for chainId: ${chainId}`);
    return null; // Or return defaultConfig as a fallback? Careful with this.
};

// --- UPDATED FUNCTION: Get all supported chains for Web3Modal ---
export const getAllSupportedChainsForModal = () => {
    const supportedChainKeys = ['polygon_mainnet', 'bnb_mainnet']; // Define which chains are in Web3Modal
    return supportedChainKeys.map(key => {
        const chain = chains[key];
        if (!chain) return null;
        return {
            chainId: parseInt(chain.chainIdHex, 16),
            name: chain.name,
            currency: chain.symbol,
            explorerUrl: chain.explorerUrl,
            rpcUrl: chain.rpcUrl,
        };
    }).filter(chain => chain !== null);
};