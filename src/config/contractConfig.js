// src/config/contractConfig.js

import PREDICTION_MARKET_P2P_ABI_JSON from './abis/PredictionMarketP2P.json';
import { createWeb3Modal } from '@web3modal/ethers5';

// --- CONFIGURATION SECTION ---

const WALLETCONNECT_PROJECT_ID = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID;

const chains = {
    // These addresses now point to your OLD contracts to display them.
    bnb_mainnet: {
        rpcUrl: import.meta.env.VITE_BNB_MAINNET_RPC_URL || "https://bsc-dataseed.binance.org/",
        chainIdHex: '0x38', 
        name: 'BNB Smart Chain', 
        symbol: 'BNB', 
        explorerUrl: 'https://bscscan.com',
        predictionMarketContractAddress: '0x3D93FD642837e61Ef34D6808cE0b29Ec3e15d1C8',
        usdcTokenAddress: "0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d",
    },
    polygon_mainnet: {
        rpcUrl: import.meta.env.VITE_POLYGON_MAINNET_RPC_URL || "https://polygon-rpc.com/",
        chainIdHex: '0x89', 
        name: 'Polygon', 
        symbol: 'MATIC', 
        explorerUrl: 'https://polygonscan.com/',
        predictionMarketContractAddress: '0x1F52a81DF45d8098E676285a436e51a49dC145BC',
        usdcTokenAddress: "0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359",
    },
    bsc_testnet: {
        predictionMarketContractAddress: import.meta.env.VITE_BSC_TESTNET_PREDICTION_MARKET_CONTRACT_ADDRESS,
        rpcUrl: import.meta.env.VITE_BSC_TESTNET_RPC_URL || "https://data-seed-prebsc-1-s1.binance.org:8545/",
        chainIdHex: '0x61',
        name: 'BNB Smart Chain Testnet',
        symbol: 'tBNB',
        explorerUrl: 'https://testnet.bscscan.com'
    },
};

// --- HELPER FUNCTIONS (DEFINED FIRST) ---

const VITE_NETWORK_TARGET = import.meta.env.VITE_NETWORK_TARGET || 'bsc_testnet';

export const getContractAbi = () => PREDICTION_MARKET_P2P_ABI_JSON.abi || PREDICTION_MARKET_P2P_ABI_JSON;

export const getTargetChainIdHex = () => {
    const defaultConfig = chains[VITE_NETWORK_TARGET];
    if (!defaultConfig) {
        throw new Error(`[contractConfig] Default config for "${VITE_NETWORK_TARGET}" not found.`);
    }
    return defaultConfig.chainIdHex;
};

export const getConfigForChainId = (chainId) => {
    if (chainId === null || typeof chainId === 'undefined') return null;
    const numChainId = Number(chainId);
    for (const key in chains) {
        if (parseInt(chains[key].chainIdHex, 16) === numChainId) {
            return chains[key];
        }
    }
    return null;
};

export const getAllSupportedChainsForModal = () => {
    // Define which chains to show in the Web3Modal UI
    const supportedChainKeys = ['bnb_mainnet', 'polygon_mainnet', 'bsc_testnet']; 

    const modalChains = supportedChainKeys.map(key => {
        const chain = chains[key];
        if (!chain || !chain.chainIdHex || !chain.rpcUrl) {
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

    return modalChains;
};

// --- WEB3MODAL INSTANCE CREATION (DEFINED LAST) ---

if (!WALLETCONNECT_PROJECT_ID) {
    throw new Error("[contractConfig] VITE_WALLETCONNECT_PROJECT_ID is not set in your .env file");
}

// This is now safe because getAllSupportedChainsForModal() is defined above.
export const web3Modal = createWeb3Modal({
    ethersConfig: { 
        metadata: { 
            name: "PiOracle", 
            description: "Decentralized Prediction Markets", 
            url: "https://pioracle.online" 
        } 
    },
    chains: getAllSupportedChainsForModal(),
    projectId: WALLETCONNECT_PROJECT_ID,
});