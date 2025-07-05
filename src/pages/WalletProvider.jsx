// src/pages/WalletProvider.jsx

import React, { createContext, useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { createWeb3Modal } from '@web3modal/ethers5';

import { getAllSupportedChainsForModal, getConfigForChainId, getTargetChainIdHex } from '../config/contractConfig';

// --- HARDCODED ABI to bypass all caching issues ---
const PREDICTION_MARKET_ABI = [
  "function getExistingMarketIds() view returns (uint256[])",
  "function getMarketInfo(uint256 _marketId) view returns (string memory assetSymbol, uint8 state, uint256 expiryTimestamp, uint256 creationTimestamp)",
  "function getMarketStakes(uint256 _marketId) view returns (uint256 totalStakedYes, uint256 totalStakedNo)"
];

export const WalletContext = createContext(null);

const WALLETCONNECT_PROJECT_ID = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID;
const web3Modal = createWeb3Modal({
    ethersConfig: { metadata: { name: "PiOracle", description: "Decentralized Prediction Markets", url: "https://pioracle.online" } },
    chains: getAllSupportedChainsForModal(),
    projectId: WALLETCONNECT_PROJECT_ID,
});

const initialState = {
    provider: null, signer: null, walletAddress: null, chainId: null,
    predictionMarketContract: null, isInitialized: false,
};

export function WalletProvider({ children }) {
    const [connectionState, setConnectionState] = useState(initialState);

    useEffect(() => {
        const setupState = async (provider, chainId, signer = null, address = null) => {
            const chainConfig = getConfigForChainId(chainId);
            const effectiveSignerOrProvider = signer || provider;
            let contractInstance = null;

            if (chainConfig && chainConfig.predictionMarketContractAddress && effectiveSignerOrProvider) {
                try {
                    contractInstance = new ethers.Contract(chainConfig.predictionMarketContractAddress, PREDICTION_MARKET_ABI, effectiveSignerOrProvider);
                    console.log(`PMLP: Contract instance created for chain ${chainId}.`);
                } catch (e) {
                    console.error(`PMLP: Failed to create contract for chain ${chainId}`, e);
                }
            } else {
                console.warn(`PMLP: No contract address configured for chain ${chainId}`);
            }
            
            setConnectionState({
                provider, signer, walletAddress: address, chainId,
                predictionMarketContract: contractInstance,
                isInitialized: true,
            });
        };

        const handleStateChange = async ({ provider, address, chainId, isConnected }) => {
            if (isConnected && provider && address && chainId) {
                const web3Provider = new ethers.providers.Web3Provider(provider, 'any');
                const currentSigner = web3Provider.getSigner();
                await setupState(web3Provider, chainId, currentSigner, address);
            } else {
                // Set up a read-only provider for the default chain when disconnected
                const defaultChainId = parseInt(getTargetChainIdHex(), 16);
                const chainConfig = getConfigForChainId(defaultChainId);
                if (chainConfig?.rpcUrl) {
                    const readOnlyProvider = new ethers.providers.StaticJsonRpcProvider(chainConfig.rpcUrl, defaultChainId);
                    await setupState(readOnlyProvider, defaultChainId);
                } else {
                    setConnectionState({ ...initialState, isInitialized: true });
                }
            }
        };

        const unsubscribe = web3Modal.subscribeProvider(handleStateChange);
        handleStateChange(web3Modal.getState()); // Initial check

        return () => unsubscribe();
    }, []); // Run only once

    const contextValue = {
        ...connectionState,
        connectWallet: () => web3Modal.open(),
        disconnectWallet: () => web3Modal.disconnect(),
    };

    return (
        <WalletContext.Provider value={contextValue}>
            {connectionState.isInitialized ? children : <div>Initializing Application...</div>}
        </WalletContext.Provider>
    );
}