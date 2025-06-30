// src/config/contractConfig.js (TEMPORARY MINIMAL VERSION FOR DEBUGGING)
import PREDICTION_MARKET_P2P_ABI_JSON from './abis/PredictionMarketP2P.json';

const VITE_BSC_TESTNET_PM_ADDRESS = import.meta.env.VITE_BSC_TESTNET_PREDICTION_MARKET_CONTRACT_ADDRESS;
const VITE_BSC_TESTNET_RPC_URL_FROM_ENV = import.meta.env.VITE_BSC_TESTNET_RPC_URL;

console.log("[contractConfig] RAW VITE_BSC_TESTNET_PREDICTION_MARKET_CONTRACT_ADDRESS:", VITE_BSC_TESTNET_PM_ADDRESS);
console.log("[contractConfig] RAW VITE_BSC_TESTNET_RPC_URL:", VITE_BSC_TESTNET_RPC_URL_FROM_ENV);

const chains = {
     // In src/config/contractConfig.js, inside the chains.bsc_testnet object:

bsc_testnet: {
    // ... your other bsc_testnet properties like predictionMarketContractAddress ...
    hostRegistryContractAddress: "0x634c91dE69d394709de424c7F6C56279E2e4d3B7",
    tippingJarContractAddress: "0x66fc38263C9D5A3d6eFAe8D0C376DdEC00042648",
    founderBadgeContractAddress: "0x27186F40Eae1329BE3A8928d3587F071fB000C7D",
    supporterBadgeContractAddress: "0x482d84e0520F082D0a46fd96bB52aA12b4a872e8" 
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