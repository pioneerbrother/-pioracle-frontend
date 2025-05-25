// pioracle/src/config/contractConfig.js
import PREDICTION_MARKET_ABI_JSON from './PredictionMarketP2P.json';

const VITE_NETWORK_TARGET = import.meta.env.VITE_NETWORK_TARGET || 'local'; // Default to local
console.log("[contractConfig] VITE_NETWORK_TARGET:", VITE_NETWORK_TARGET);

// --- Localhost (Hardhat) Configuration ---
const LOCAL_CONTRACT_ADDRESS = import.meta.env.VITE_LOCAL_PREDICTION_MARKET_CONTRACT_ADDRESS;
const LOCAL_RPC_URL = import.meta.env.VITE_LOCALHOST_RPC_URL || 'http://127.0.0.1:8545/';
const LOCAL_CHAIN_ID_HEX = import.meta.env.VITE_LOCAL_CHAIN_ID_HEX || '0x7a69'; // 31337 (decimal)
const LOCAL_NETWORK_NAME = 'Localhost 8545';

// --- Polygon Amoy Testnet Configuration ---
const AMOY_CONTRACT_ADDRESS = import.meta.env.VITE_AMOY_PREDICTION_MARKET_CONTRACT_ADDRESS;
const AMOY_RPC_URL = import.meta.env.VITE_AMOY_RPC_URL;
const AMOY_CHAIN_ID_HEX = import.meta.env.VITE_AMOY_CHAIN_ID_HEX || '0x13882'; // 80002 (decimal)
const AMOY_NETWORK_NAME = 'Polygon Amoy';

// --- Polygon Mainnet Configuration ---
const MAINNET_CONTRACT_ADDRESS = import.meta.env.VITE_POLYGON_MAINNET_PREDICTION_MARKET_CONTRACT_ADDRESS;
const MAINNET_RPC_URL = import.meta.env.VITE_POLYGON_MAINNET_RPC_URL;
const MAINNET_CHAIN_ID_HEX = import.meta.env.VITE_POLYGON_MAINNET_CHAIN_ID_HEX || '0x89'; // 137 (decimal)
const MAINNET_NETWORK_NAME = 'Polygon Mainnet';


export const getContractAddress = () => {
    let address;
    if (VITE_NETWORK_TARGET === 'amoy') address = AMOY_CONTRACT_ADDRESS;
    else if (VITE_NETWORK_TARGET === 'polygon_mainnet') address = MAINNET_CONTRACT_ADDRESS;
    else address = LOCAL_CONTRACT_ADDRESS; // Default to local
    console.log(`[contractConfig] getContractAddress() for target '${VITE_NETWORK_TARGET}' will return:`, address);
    return address;
};

export const getRpcUrl = () => {
    let rpcUrl;
    if (VITE_NETWORK_TARGET === 'amoy') rpcUrl = AMOY_RPC_URL;
    else if (VITE_NETWORK_TARGET === 'polygon_mainnet') rpcUrl = MAINNET_RPC_URL;
    else rpcUrl = LOCAL_RPC_URL;
    console.log(`[contractConfig] getRpcUrl() for target '${VITE_NETWORK_TARGET}' will return:`, rpcUrl);
    return rpcUrl;
};

export const getTargetChainIdHex = () => {
    let chainIdHex;
    if (VITE_NETWORK_TARGET === 'amoy') chainIdHex = AMOY_CHAIN_ID_HEX;
    else if (VITE_NETWORK_TARGET === 'polygon_mainnet') chainIdHex = MAINNET_CHAIN_ID_HEX;
    else chainIdHex = LOCAL_CHAIN_ID_HEX;
    console.log(`[contractConfig] getTargetChainIdHex() for target '${VITE_NETWORK_TARGET}' will return:`, chainIdHex);
    return chainIdHex;
};

export const getTargetNetworkName = () => {
    let networkName;
    if (VITE_NETWORK_TARGET === 'amoy') networkName = AMOY_NETWORK_NAME;
    else if (VITE_NETWORK_TARGET === 'polygon_mainnet') networkName = MAINNET_NETWORK_NAME;
    else networkName = LOCAL_NETWORK_NAME;
    console.log(`[contractConfig] getTargetNetworkName() for target '${VITE_NETWORK_TARGET}' will return:`, networkName);
    return networkName;
};

export const getContractAbi = () => {
    const abi = PREDICTION_MARKET_ABI_JSON.abi || PREDICTION_MARKET_ABI_JSON;
    return abi;
};

// These are exported for convenience but WalletProvider uses the getter functions for dynamic loading
export const PREDICTION_MARKET_ABI = getContractAbi();
export const PREDICTION_MARKET_CONTRACT_ADDRESS = getContractAddress();
export const TARGET_CHAIN_ID_HEX = getTargetChainIdHex();
export const TARGET_NETWORK_NAME = getTargetNetworkName();
export const CURRENT_RPC_URL = getRpcUrl();