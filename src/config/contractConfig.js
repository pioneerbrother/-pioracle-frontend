// src/config/contractConfig.js
import PREDICTION_MARKET_ABI_JSON from './PredictionMarketP2P.json';

const VITE_NETWORK_TARGET = import.meta.env.VITE_NETWORK_TARGET || 'local';
console.log("[contractConfig] VITE_NETWORK_TARGET:", VITE_NETWORK_TARGET);

// --- Localhost (Hardhat) Configuration ---
const LOCAL_CONTRACT_ADDRESS = import.meta.env.VITE_LOCAL_PREDICTION_MARKET_CONTRACT_ADDRESS;
console.log("[contractConfig] VITE_LOCAL_PREDICTION_MARKET_CONTRACT_ADDRESS (from env):", LOCAL_CONTRACT_ADDRESS);
const LOCAL_RPC_URL = import.meta.env.VITE_LOCALHOST_RPC_URL || 'http://127.0.0.1:8545/';
const LOCAL_CHAIN_ID_HEX = import.meta.env.VITE_LOCAL_CHAIN_ID_HEX || '0x7a69'; // 31337 for Hardhat <--- ENSURE THIS LINE IS PRESENT AND CORRECT
const LOCAL_NETWORK_NAME = 'Localhost 8545';

// --- Amoy Testnet Configuration ---
const AMOY_CONTRACT_ADDRESS = import.meta.env.VITE_AMOY_PREDICTION_MARKET_CONTRACT_ADDRESS;
console.log("[contractConfig] VITE_AMOY_PREDICTION_MARKET_CONTRACT_ADDRESS (from env):", AMOY_CONTRACT_ADDRESS);
const AMOY_RPC_URL = import.meta.env.VITE_AMOY_RPC_URL;
const AMOY_CHAIN_ID_HEX = import.meta.env.VITE_AMOY_CHAIN_ID_HEX || '0x13882'; // 80002
const AMOY_NETWORK_NAME = 'Polygon Amoy';

// --- Export functions to get config based on VITE_NETWORK_TARGET ---
export const getContractAddress = () => {
    let address;
    if (VITE_NETWORK_TARGET === 'amoy') address = AMOY_CONTRACT_ADDRESS;
    else address = LOCAL_CONTRACT_ADDRESS;
    console.log("[contractConfig] getContractAddress() will return:", address);
    return address;
};

export const getRpcUrl = () => {
    let rpcUrl;
    if (VITE_NETWORK_TARGET === 'amoy') rpcUrl = AMOY_RPC_URL;
    else rpcUrl = LOCAL_RPC_URL;
    console.log("[contractConfig] getRpcUrl() will return:", rpcUrl);
    return rpcUrl;
};

export const getTargetChainIdHex = () => {
    let chainIdHex;
    if (VITE_NETWORK_TARGET === 'amoy') chainIdHex = AMOY_CHAIN_ID_HEX;
    else chainIdHex = LOCAL_CHAIN_ID_HEX; // This will now be defined
    console.log("[contractConfig] getTargetChainIdHex() will return:", chainIdHex);
    return chainIdHex;
};

export const getTargetNetworkName = () => {
    let networkName;
    if (VITE_NETWORK_TARGET === 'amoy') networkName = AMOY_NETWORK_NAME;
    else networkName = LOCAL_NETWORK_NAME;
    console.log("[contractConfig] getTargetNetworkName() will return:", networkName);
    return networkName;
};

export const getContractAbi = () => {
    const abi = PREDICTION_MARKET_ABI_JSON.abi || PREDICTION_MARKET_ABI_JSON;
    // console.log("[contractConfig] getContractAbi() will return ABI with length:", abi ? abi.length : 'undefined');
    return abi;
};

// For direct use if components don't want to call functions always
export const PREDICTION_MARKET_ABI = getContractAbi();
export const PREDICTION_MARKET_CONTRACT_ADDRESS = getContractAddress(); // This will re-log
export const TARGET_CHAIN_ID_HEX = getTargetChainIdHex();               // This will re-log
export const TARGET_NETWORK_NAME = getTargetNetworkName();             // This will re-log
export const CURRENT_RPC_URL = getRpcUrl();                             // This will re-log