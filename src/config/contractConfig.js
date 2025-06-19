// src/config/contractConfig.js
import PREDICTION_MARKET_ABI from './PredictionMarketP2P.json';

// --- Central Configuration Object ---
// All network-specific details are defined here. To add a new network,
// you just need to add a new entry to this object.
const chains = {
    local: {
        contractAddress: import.meta.env.VITE_LOCAL_PREDICTION_MARKET_CONTRACT_ADDRESS,
        rpcUrl: import.meta.env.VITE_LOCALHOST_RPC_URL || 'http://127.0.0.1:8545/',
        chainId: import.meta.env.VITE_LOCAL_CHAIN_ID_HEX || '0x7a69',
        name: 'Localhost 8545',
        symbol: 'ETH',
        explorerUrl: '', // No standard explorer for localhost
    },
    amoy_testnet: {
        contractAddress: import.meta.env.VITE_AMOY_PREDICTION_MARKET_CONTRACT_ADDRESS,
        rpcUrl: import.meta.env.VITE_AMOY_RPC_URL,
        chainId: import.meta.env.VITE_AMOY_CHAIN_ID_HEX || '0x13882',
        name: 'Polygon Amoy',
        symbol: 'MATIC',
        explorerUrl: 'https://www.oklink.com/amoy',
    },
    polygon_mainnet: {
        contractAddress: import.meta.env.VITE_POLYGON_MAINNET_PREDICTION_MARKET_CONTRACT_ADDRESS,
        rpcUrl: import.meta.env.VITE_POLYGON_MAINNET_RPC_URL,
        chainId: import.meta.env.VITE_POLYGON_MAINNET_CHAIN_ID_HEX || '0x89',
        name: 'Polygon Mainnet',
        symbol: 'MATIC',
        explorerUrl: 'https://polygonscan.com/',
    },
    bnb_mainnet: {
        contractAddress: import.meta.env.VITE_BNB_MAINNET_CONTRACT_ADDRESS,
        rpcUrl: import.meta.env.VITE_BNB_MAINNET_RPC_URL,
        chainId: '0x38',
        name: 'BNB Smart Chain',
        symbol: 'BNB',
        explorerUrl: 'https://bscscan.com',
    },
};

// --- Dynamic Configuration Selection ---
// This is the only line you need to change in your .env file to switch networks.
const VITE_NETWORK_TARGET = import.meta.env.VITE_NETWORK_TARGET || 'polygon_mainnet'; // Default to polygon_mainnet
const currentConfig = chains[VITE_NETWORK_TARGET];

// Error handling if the target network is not configured
if (!currentConfig) {
    throw new Error(`Fatal Error: Configuration for network "${VITE_NETWORK_TARGET}" is not defined in contractConfig.js.`);
}

console.log(`[contractConfig] Loaded configuration for target: '${VITE_NETWORK_TARGET}'`);

// --- Exported Getter Functions ---
// All other parts of your app will use these functions.
// They are now simple, one-line functions that return the correct value for the current target network.
export const getContractAddress = () => currentConfig.contractAddress;
export const getRpcUrl = () => currentConfig.rpcUrl;
export const getTargetChainIdHex = () => currentConfig.chainId;
export const getChainName = () => currentConfig.name;
export const getCurrencySymbol = () => currentConfig.symbol;
export const getExplorerUrl = () => currentConfig.explorerUrl;

// ABI is now consistent across all networks
export const getContractAbi = () => {
    return PREDICTION_MARKET_ABI.abi || PREDICTION_MARKET_ABI;
};

// Note: The previous version of getContractAbi was async. If you encounter issues,
// you may need to make it async again and use dynamic imports as shown before.
// For now, this direct import is simpler if the ABI is the same for all chains.