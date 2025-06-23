// src/config/contractConfig.js
import PREDICTION_MARKET_ABI from './PredictionMarketP2P.json';

const chains = {
    // We remove 'local' to prevent it from ever being a fallback on production
    amoy_testnet: {
        contractAddress: import.meta.env.VITE_AMOY_PREDICTION_MARKET_CONTRACT_ADDRESS,
        rpcUrl: import.meta.env.VITE_AMOY_RPC_URL,
        chainId: '0x13882',
        name: 'Polygon Amoy',
        symbol: 'MATIC',
        explorerUrl: 'https://www.oklink.com/amoy',
    },
    polygon_mainnet: {
        contractAddress: import.meta.env.VITE_POLYGON_MAINNET_CONTRACT_ADDRESS,
        rpcUrl: import.meta.env.VITE_POLYGON_MAINNET_RPC_URL,
        chainId: '0x89',
        name: 'Polygon Mainnet',
        symbol: 'MATIC',
        explorerUrl: 'https://polygonscan.com/',
    },
    bsc_testnet: {
        contractAddress: import.meta.env.VITE_BSC_TESTNET_CONTRACT_ADDRESS,
        rpcUrl: import.meta.env.VITE_BSC_TESTNET_RPC_URL,
        chainId: '0x61',
        name: 'BNB Smart Chain Testnet',
        symbol: 'tBNB',
        explorerUrl: 'https://testnet.bscscan.com',
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

// --- THIS IS THE NEW, MORE DEFENSIVE LOGIC ---
const VITE_NETWORK_TARGET = import.meta.env.VITE_NETWORK_TARGET;

// This log will appear in your Netlify build logs, showing what value it's reading.
console.log(`[contractConfig] VITE_NETWORK_TARGET read from environment: '${VITE_NETWORK_TARGET}'`);

if (!VITE_NETWORK_TARGET) {
    throw new Error(`FATAL BUILD ERROR: VITE_NETWORK_TARGET is not defined in your environment variables. The build cannot continue.`);
}

const currentConfig = chains[VITE_NETWORK_TARGET];

if (!currentConfig) {
    throw new Error(`FATAL BUILD ERROR: Configuration for network "${VITE_NETWORK_TARGET}" is not defined in contractConfig.js. Check for typos.`);
}

console.log(`[contractConfig] Successfully loaded configuration for target: '${VITE_NETWORK_TARGET}'`);
// --- END OF NEW LOGIC ---

export const getContractAddress = () => currentConfig.contractAddress;
export const getRpcUrl = () => currentConfig.rpcUrl;
export const getTargetChainIdHex = () => currentConfig.chainId;
export const getChainName = () => currentConfig.name;
export const getCurrencySymbol = () => currentConfig.symbol;
export const getExplorerUrl = () => currentConfig.explorerUrl;

export const getContractAbi = () => {
    return PREDICTION_MARKET_ABI.abi || PREDICTION_MARKET_ABI;
};