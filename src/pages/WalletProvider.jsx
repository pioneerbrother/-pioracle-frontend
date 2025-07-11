// src/pages/WalletProvider.jsx

import React, { createContext, useState, useEffect, useCallback, useMemo } from 'react';
import { ethers } from 'ethers';

// --- THIS IS THE MAIN FIX ---
// We no longer import multiple functions. We only import the finished `web3Modal` instance
// and one helper function that we still need. This solves the build error.
import { web3Modal, getConfigForChainId } from '../config/contractConfig.js'; 

// This import path must be correct for your project structure
import { WalletContext } from '../contexts/WalletContext.jsx';

// We still need the ABI for creating contract instances
import PredictionMarketABI from '../config/abis/PredictionMarketP2P.json';

// The initial state for our context when no wallet is connected
const initialState = {
    provider: null,
    signer: null,
    walletAddress: null,
    chainId: null,
    predictionMarketContract: null,
};

export function WalletProvider({ children }) {
    const [isInitialized, setIsInitialized] = useState(false);
    const [connectionState, setConnectionState] = useState(initialState);

    // This function sets up the ethers provider and contract instance.
    // It's called for both read-only and connected states.
    const setupState = useCallback(async (provider, chainId, signer = null, address = null) => {
        const chainConfig = getConfigForChainId(chainId);
        let predictionMarketContract = null;

        if (chainConfig && chainConfig.predictionMarketContractAddress) {
            try {
                const effectiveSignerOrProvider = signer || provider;
                const abi = PredictionMarketABI.abi || PredictionMarketABI;
                predictionMarketContract = new ethers.Contract(chainConfig.predictionMarketContractAddress, abi, effectiveSignerOrProvider);
                console.log(`WalletProvider: Successfully created contract instance for chain ${chainId}.`);
            } catch (e) {
                console.error(`WalletProvider: Failed to create contract instance for chain ${chainId}.`, e);
            }
        } else {
            console.log(`WalletProvider: No contract address configured for chain ${chainId}.`);
        }

        setConnectionState({
            provider,
            signer,
            walletAddress: address,
            chainId,
            predictionMarketContract,
        });
        setIsInitialized(true);
    }, []);

    // Sets up a read-only provider for when no wallet is connected
    const setupReadOnlyState = useCallback(() => {
        // We default to BNB mainnet for the read-only view
        const defaultChainId = 56; 
        const chainConfig = getConfigForChainId(defaultChainId);
        
        if (chainConfig && chainConfig.rpcUrl) {
            const readOnlyProvider = new ethers.providers.StaticJsonRpcProvider(chainConfig.rpcUrl, defaultChainId);
            setupState(readOnlyProvider, defaultChainId);
        } else {
            // Fallback if something is wrong with the config
            setConnectionState({ ...initialState, chainId: defaultChainId });
            setIsInitialized(true);
        }
    }, [setupState]);

    // This effect runs once to subscribe to Web3Modal's state changes
    useEffect(() => {
        const unsubscribe = web3Modal.subscribeProvider(async ({ provider, address, chainId, isConnected }) => {
            if (isConnected && provider && address && chainId) {
                // Wallet is connected
                console.log("WalletProvider: Wallet connected.", { address, chainId });
                const web3Provider = new ethers.providers.Web3Provider(provider, 'any');
                const currentSigner = web3Provider.getSigner();
                await setupState(web3Provider, chainId, currentSigner, address);
            } else if (!isConnected) {
                // Wallet disconnected
                console.log("WalletProvider: Wallet disconnected. Setting up read-only state.");
                setupReadOnlyState();
            }
        });

        // Initialize with a read-only state on first load
        setupReadOnlyState();

        // Cleanup function to unsubscribe when the component unmounts
        return () => {
            unsubscribe();
        };
    }, [setupReadOnlyState, setupState]);

    const connectWallet = useCallback(() => { web3Modal.open(); }, []);

    const disconnectWallet = useCallback(() => {
        // The modern way to disconnect is to just clear the cache and let the subscription handle the state change.
        localStorage.removeItem("wagmi.cached-provider");
        localStorage.removeItem("WEB3_CONNECT_CACHED_PROVIDER");
        window.location.reload(); // The simplest way to ensure a full state reset
    }, []);

    // The value that will be provided to all consuming components
    const contextValue = useMemo(() => ({
        ...connectionState,
        isInitialized,
        connectWallet,
        disconnectWallet,
    }), [connectionState, isInitialized, connectWallet, disconnectWallet]);

    return (
        <WalletContext.Provider value={contextValue}>
            {isInitialized ? children : (
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
                    Initializing Application...
                </div>
            )}
        </WalletContext.Provider>
    );
}