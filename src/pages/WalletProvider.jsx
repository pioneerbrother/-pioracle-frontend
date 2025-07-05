// src/pages/WalletProvider.jsx

import React, { createContext, useState, useEffect, useCallback, useMemo } from 'react';
import { ethers } from 'ethers';
import { createWeb3Modal } from '@web3modal/ethers5';

import { getAllSupportedChainsForModal, getConfigForChainId, getTargetChainIdHex } from '../config/contractConfig';
import PredictionMarketABI from '../config/abis/PredictionMarketP2P.json'; // The single, correct, up-to-date ABI

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

    // --- THIS IS THE NEW, ROBUST LOGIC YOU DESCRIBED ---
    useEffect(() => {
        const handleStateChange = ({ provider, address, chainId, isConnected }) => {
            if (isConnected && provider && address && chainId) {
                const web3Provider = new ethers.providers.Web3Provider(provider, 'any');
                const currentSigner = web3Provider.getSigner();
                const chainConfig = getConfigForChainId(chainId);

                let contractInstance = null;
                if (chainConfig && chainConfig.predictionMarketContractAddress) {
                    try {
                        // Ensure ENS is disabled on non-mainnet chains
                        if (chainId !== 1) {
                            web3Provider.getNetwork().then(network => network.ensAddress = null);
                        }
                        const abi = PredictionMarketABI.abi || PredictionMarketABI;
                        contractInstance = new ethers.Contract(chainConfig.predictionMarketContractAddress, abi, currentSigner);
                        console.log(`PMLP: Successfully created contract instance for chain ${chainId} at address ${chainConfig.predictionMarketContractAddress}`);
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
                    predictionMarketContract: contractInstance, // This will be null if config is missing
                    isInitialized: true,
                });
            } else {
                // Not connected or disconnecting, revert to a clean, initialized state
                setConnectionState({ ...initialState, isInitialized: true });
            }
        };

        const unsubscribe = web3Modal.subscribeProvider(handleStateChange);
        
        // Initial check on load
        handleStateChange(web3Modal.getState());

        return () => {
            unsubscribe();
        };
    }, []); // Run only once on mount

    const connectWallet = useCallback(() => web3Modal.open(), []);
    const disconnectWallet = useCallback(() => web3Modal.disconnect(), []);

    const contextValue = useMemo(() => ({
        ...connectionState,
        connectWallet,
        disconnectWallet,
    }), [connectionState, connectWallet, disconnectWallet]);

    return (
        <WalletContext.Provider value={contextValue}>
            {connectionState.isInitialized ? children : (
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
                    Initializing Application...
                </div>
            )}
        </WalletContext.Provider>
    );
}