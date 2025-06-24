// src/config/contractConfig.js
import PREDICTION_MARKET_ABI from './PredictionMarketP2P.json';

// --- Central Configuration Object ---
// All network-specific details are defined here.
const chains = {
    // Removed 'local' as it's not typically for Web3Modal production
    amoy_testnet: { // Keep for testing if needed by Web3Modal
        contractAddress: import.meta.env.VITE_AMOY_PREDICTION_MARKET_CONTRACT_ADDRESS,
        rpcUrl: import.meta.env.VITE_AMOY_RPC_URL,
        chainIdHex: import.meta.env.VITE_AMOY_CHAIN_ID_HEX || '0x13882', // Store as hex
        name: 'Polygon Amoy',
        symbol: 'MATIC',
        explorerUrl: 'https://www.oklink.com/amoy',
    },
    polygon_mainnet: {
        contractAddress: import.meta.env.VITE_POLYGON_MAINNET_PREDICTION_MARKET_CONTRACT_ADDRESS,
        rpcUrl: import.meta.env.VITE_POLYGON_MAINNET_RPC_URL,
        chainIdHex: import.meta.env.VITE_POLYGON_MAINNET_CHAIN_ID_HEX || '0x89', // Store as hex
        name: 'Polygon Mainnet',
        symbol: 'MATIC',
        explorerUrl: 'https://polygonscan.com/',
    },
    bsc_testnet: { // Keep for testing if needed by Web3Modal
        contractAddress: import.meta.env.VITE_BSC_TESTNET_CONTRACT_ADDRESS,
        rpcUrl: import.meta.env.VITE_BSC_TESTNET_RPC_URL,
        chainIdHex: '0x61', // Store as hex
        name: 'BNB Smart Chain Testnet',
        symbol: 'tBNB',
        explorerUrl: 'https://testnet.bscscan.com',
    },
    bnb_mainnet: {
        contractAddress: import.meta.env.VITE_BNB_MAINNET_CONTRACT_ADDRESS,
        rpcUrl: import.meta.env.VITE_BNB_MAINNET_RPC_URL,
        chainIdHex: '0x38', // Store as hex
        name: 'BNB Smart Chain',
        symbol: 'BNB',
        explorerUrl: 'https://bscscan.com',
    },
};

const VITE_NETWORK_TARGET = import.meta.env.VITE_NETWORK_TARGET || 'polygon_mainnet';
const currentConfig = chains[VITE_NETWORK_TARGET];

if (!currentConfig) {
    throw new Error(`Fatal Error: Configuration for network "${VITE_NETWORK_TARGET}" is not defined in contractConfig.js.`);
}
console.log(`[contractConfig] Loaded configuration for VITE_NETWORK_TARGET: '${VITE_NETWORK_TARGET}'`);

// --- Exported Getter Functions for the CURRENT TARGET NETWORK ---
export const getContractAddress = () => currentConfig.contractAddress;
export const getRpcUrl = () => currentConfig.rpcUrl;
export const getTargetChainIdHex = () => currentConfig.chainIdHex; // Use consistent naming
export const getChainName = () => currentConfig.name;
export const getCurrencySymbol = () => currentConfig.symbol;
export const getExplorerUrl = () => currentConfig.explorerUrl;
export const getContractAbi = () => PREDICTION_MARKET_ABI.abi || PREDICTION_MARKET_ABI;


// --- NEW FUNCTION: Get all supported chains for Web3Modal ---
export const getAllSupportedChainsForModal = () => {
    // Define which chains from your 'chains' object are supported by Web3Modal
    // For example, you might only want mainnets in production
    const supportedChainKeys = ['polygon_mainnet', 'bnb_mainnet']; // Add 'amoy_testnet', 'bsc_testnet' if needed for dev/testing

    return supportedChainKeys.map(key => {
        const chain = chains[key];
        if (!chain) return null; // Should not happen if keys are correct
        return {
            chainId: parseInt(chain.chainIdHex, 16), // Web3Modal needs chainId as a number
            name: chain.name,
            currency: chain.symbol,
            explorerUrl: chain.explorerUrl,
            rpcUrl: chain.rpcUrl,
        };
    }).filter(chain => chain !== null);
};