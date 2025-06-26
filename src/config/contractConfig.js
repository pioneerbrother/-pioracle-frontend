// src/config/contractConfig.js (TEMPORARY MINIMAL VERSION FOR DEBUGGING)
import PREDICTION_MARKET_P2P_ABI_JSON from './abis/PredictionMarketP2P.json';

const VITE_BSC_TESTNET_PM_ADDRESS = import.meta.env.VITE_BSC_TESTNET_PREDICTION_MARKET_CONTRACT_ADDRESS;
const VITE_BSC_TESTNET_RPC_URL_FROM_ENV = import.meta.env.VITE_BSC_TESTNET_RPC_URL;

console.log("[contractConfig] RAW VITE_BSC_TESTNET_PREDICTION_MARKET_CONTRACT_ADDRESS:", VITE_BSC_TESTNET_PM_ADDRESS);
console.log("[contractConfig] RAW VITE_BSC_TESTNET_RPC_URL:", VITE_BSC_TESTNET_RPC_URL_FROM_ENV);

const chains = {
    bsc_testnet: {
        predictionMarketContractAddress: VITE_BSC_TESTNET_PM_ADDRESS || "0x810Fbd810D9E563920E4543f95B4D277100a38f8", // Fallback
        rpcUrl: VITE_BSC_TESTNET_RPC_URL_FROM_ENV || "https://data-seed-prebsc-1-s1.binance.org:8545/", // Fallback
        chainIdHex: '0x61', // 97
        name: 'BNB Smart Chain Testnet',
        symbol: 'tBNB',
        explorerUrl: 'https://testnet.bscscan.com',
        // Add other contract types if needed for other parts of the app, but keep it minimal for now
        tippingJarContractAddress: import.meta.env.VITE_BSC_TESTNET_TIPPING_JAR_CONTRACT_ADDRESS || null,
        badgeContractAddress: import.meta.env.VITE_BSC_TESTNET_BADGE_CONTRACT_ADDRESS || null,
    },
    // Add other essential chains if your app breaks without them, but try to keep minimal
    bnb_mainnet: { // Example minimal bnb_mainnet for Web3Modal
        predictionMarketContractAddress: import.meta.env.VITE_BNB_MAINNET_PREDICTION_MARKET_CONTRACT_ADDRESS,
        rpcUrl: import.meta.env.VITE_BNB_MAINNET_RPC_URL || "https://bsc-dataseed.binance.org/",
        chainIdHex: '0x38', name: 'BNB Smart Chain', symbol: 'BNB', explorerUrl: 'https://bscscan.com',
    },
    polygon_mainnet: { // Example minimal polygon_mainnet for Web3Modal
        predictionMarketContractAddress: import.meta.env.VITE_POLYGON_MAINNET_PREDICTION_MARKET_CONTRACT_ADDRESS,
        rpcUrl: import.meta.env.VITE_POLYGON_MAINNET_RPC_URL || "https://polygon-rpc.com/",
        chainIdHex: '0x89', name: 'Polygon Mainnet', symbol: 'MATIC', explorerUrl: 'https://polygonscan.com/',
    }
};

const VITE_NETWORK_TARGET = import.meta.env.VITE_NETWORK_TARGET || 'bsc_testnet';
const defaultConfig = chains[VITE_NETWORK_TARGET];

if (!defaultConfig) {
    throw new Error(`[contractConfig] MINIMAL: Default config for "${VITE_NETWORK_TARGET}" not found.`);
}
console.log(`[contractConfig] MINIMAL: Default config for VITE_NETWORK_TARGET: '${VITE_NETWORK_TARGET}'`, defaultConfig);


export const getPredictionMarketAbi = () => PREDICTION_MARKET_P2P_ABI_JSON.abi || PREDICTION_MARKET_P2P_ABI_JSON;

export const getTargetChainIdHex = () => defaultConfig.chainIdHex;

export const getConfigForChainId = (chainId) => {
    if (chainId === null || typeof chainId === 'undefined') return null;
    const numChainId = Number(chainId);
    console.log(`[contractConfig] MINIMAL: getConfigForChainId called with: ${numChainId}`);
    for (const key in chains) {
        if (parseInt(chains[key].chainIdHex, 16) === numChainId) {
            console.log(`[contractConfig] MINIMAL: getConfigForChainId - Match for ${key}:`, chains[key]);
            return chains[key];
        }
    }
    console.warn(`[contractConfig] MINIMAL: No config found for chainId: ${numChainId}.`);
    return null;
};

export const getPredictionMarketContractAddressForChain = (chainId) => {
    const config = getConfigForChainId(chainId);
    const address = config?.predictionMarketContractAddress;
    console.log(`[contractConfig] MINIMAL: getPredictionMarketContractAddressForChain for ${chainId} is: ${address} (from config: ${JSON.stringify(config)})`);
    return address || null;
};

export const getAllSupportedChainsForModal = () => {
    const supportedChainKeysInModal = ['bnb_mainnet', 'polygon_mainnet', 'bsc_testnet']; // Focus on these
    return supportedChainKeysInModal
        .map(key => {
            const chain = chains[key];
            if (!chain) return null;
            return {
                chainId: parseInt(chain.chainIdHex, 16),
                name: chain.name,
                currency: chain.symbol,
                explorerUrl: chain.explorerUrl,
                rpcUrl: chain.rpcUrl,
            };
        })
        .filter(chain => chain !== null);
};