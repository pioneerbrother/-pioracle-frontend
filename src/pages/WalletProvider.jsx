// src/pages/WalletProvider.jsx

import React, { createContext, useState, useEffect, useCallback, useMemo } from 'react';
import { ethers } from 'ethers';
import { createWeb3Modal } from '@web3modal/ethers5';

import { getAllSupportedChainsForModal, getConfigForChainId } from '../config/contractConfig';
// Use a single, reliable ABI import
import PredictionMarketABI from '../config/abis/PredictionMarketP2P.json'; 

export const WalletContext = createContext(null);

const WALLETCONNECT_PROJECT_ID = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID;
const web3Modal = createWeb3Modal({
    ethersConfig: { metadata: { name: "PiOracle", description: "Decentralized Prediction Markets", url: "https://pioracle.online" } },
    chains: getAllSupportedChainsForModal(),
    projectId: WALLETCONNECT_PROJECT_ID,
});

const initialState = {
    provider: null,
    signer: null,
    walletAddress: null,
    chainId: null,
    predictionMarketContract: null,
    isInitialized: false, // Start as not initialized
};

export function WalletProvider({ children }) {
    const [connectionState, setConnectionState] = useState(initialState);

    // This new robust logic handles all connection state changes reliably
    useEffect(() => {
        const handleStateChange = ({ provider, address, chainId, isConnected }) => {
            if (isConnected && provider && address && chainId) {
                const web3Provider = new ethers.providers.Web3Provider(provider, 'any');
                const currentSigner = web3Provider.getSigner();
                const chainConfig = getConfigForChainId(chainId);

                let contractInstance = null;
                if (chainConfig && chainConfig.predictionMarketContractAddress) {
                    try {
                        const abi = PredictionMarketABI.abi || PredictionMarketABI;
                        contractInstance = new ethers.Contract(chainConfig.predictionMarketContractAddress, abi, currentSigner);
                        console.log(`PMLP: Successfully created contract instance for chain ${chainId}`);
                    } catch (e) {
                        console.error(`PMLP: Failed to create contract for chain ${chainId}`, e);
                    }
                } else {
                    console.warn(`PMLP: No contract address configured for chain ${chainId}`);
                }
                
                setConnectionState({
                    provider: web3Provider,
                    signer: currentSigner,
                    walletAddress: address,
                    chainId: chainId,
                    predictionMarketContract: contractInstance,
                    isInitialized: true, // Mark as initialized AFTER setting everything up
                });
            } else {
                // If not connected, revert to a clean but initialized state
                setConnectionState({ ...initialState, isInitialized: true });
            }
        };

        const unsubscribe = web3Modal.subscribeProvider(handleStateChange);
        handleStateChange(web3Modal.getState()); // Initial check

        return () => unsubscribe();
    }, []); // Run only once

    const connectWallet = useCallback(() => web3Modal.open(), []);
    const disconnectWallet = useCallback(() => web3Modal.disconnect(), []);

    const contextValue = useMemo(() => ({
        ...connectionState,
        connectWallet,
        disconnectWallet,
    }), [connectionState, connectWallet, disconnectWallet]);

    return (
        <WalletContext.Provider value={contextValue}>
            {/* Show a loading screen until the provider is initialized */}
            {connectionState.isInitialized ? children : (
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
                    Initializing Application...
                </div>
            )}
        </WalletContext.Provider>
    );
}