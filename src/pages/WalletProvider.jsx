// src/pages/WalletProvider.jsx

import React, { createContext, useState, useEffect, useCallback, useMemo } from 'react';
import { ethers } from 'ethers';
import { createWeb3Modal } from '@web3modal/ethers5';

// --- Configuration Imports ---
// Make sure these paths and function names are correct for your project structure
import {
    getAllSupportedChainsForModal,
    getConfigForChainId,
    getTargetChainIdHex,
    getPremiumContentContractAbi, // Assuming you have a function for this
    getPredictionMarketContractAbi // And this
} from '../config/contractConfig';

// --- Create the Context ---
export const WalletContext = createContext(null);

// --- Environment Variables ---
const WALLETCONNECT_PROJECT_ID = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID;
if (!WALLETCONNECT_PROJECT_ID) {
    throw new Error("VITE_WALLETCONNECT_PROJECT_ID is not set in your .env file");
}

// --- Create the Web3Modal instance ONCE, outside the component ---
const web3Modal = createWeb3Modal({
    ethersConfig: { metadata: { name: "PiOracle", description: "Decentralized Prediction Markets", url: "https://pioracle.online" } },
    chains: getAllSupportedChainsForModal(),
    projectId: WALLETCONNECT_PROJECT_ID,
});

// --- Define the initial state for the context ---
const initialState = {
    provider: null,
    signer: null,
    walletAddress: null,
    chainId: null,
    nativeTokenSymbol: null,
    predictionMarketContract: null, // Example contract
    premiumContentContract: null,    // The contract for your paywall
};

// --- The Provider Component ---
export function WalletProvider({ children }) {
    const [isInitialized, setIsInitialized] = useState(false);
    const [connectionState, setConnectionState] = useState(initialState);

    // Centralized function to set up all provider/contract states
    const setupState = useCallback(async (provider, chainId, signer = null, address = null) => {
        // --- THE CRITICAL ENS FIX ---
        // For Web3Provider, get the network and disable ENS if it's not Mainnet.
        if (provider.getNetwork) {
            try {
                const network = await provider.getNetwork();
                if (network.chainId !== 1) {
                    network.ensAddress = null; // This prevents the 'getResolver' error on other chains.
                }
            } catch (e) {
                console.error("Could not get network from provider", e);
            }
        }
        // --- END OF FIX ---

        const chainConfig = getConfigForChainId(chainId);
        if (!chainConfig) {
            console.error(`Unsupported chain: ${chainId}. Resetting state.`);
            setConnectionState(initialState);
            setIsInitialized(true);
            return;
        }

        const effectiveSignerOrProvider = signer || provider;

        // Instantiate all your contracts here
        const premiumContentAddr = chainConfig.premiumContentContractAddress;
        const premiumContentContract = premiumContentAddr
            ? new ethers.Contract(premiumContentAddr, getPremiumContentContractAbi(), effectiveSignerOrProvider)
            : null;
        
        // Example for another contract
        const predMarketAddr = chainConfig.predictionMarketContractAddress;
        const predictionMarketContract = predMarketAddr
            ? new ethers.Contract(predMarketAddr, getPredictionMarketContractAbi(), effectiveSignerOrProvider)
            : null;

        setConnectionState({
            provider,
            signer,
            walletAddress: address,
            chainId,
            nativeTokenSymbol: chainConfig.symbol,
            premiumContentContract, // Add to state
            predictionMarketContract, // Add to state
        });
        setIsInitialized(true);
    }, []);

    // Function to set up the initial read-only state
    const setupReadOnlyState = useCallback(() => {
        const defaultChainId = parseInt(getTargetChainIdHex(), 16);
        const chainConfig = getConfigForChainId(defaultChainId);
        if (chainConfig?.rpcUrl) {
            const readOnlyProvider = new ethers.providers.StaticJsonRpcProvider(chainConfig.rpcUrl, defaultChainId);
            setupState(readOnlyProvider, defaultChainId);
        } else {
            console.error("Could not set up read-only state. Default chain config missing.");
            setIsInitialized(true); // Still initialize to prevent infinite loading
        }
    }, [setupState]);

    // Main effect to subscribe to Web3Modal and handle connection/disconnection
    useEffect(() => {
        const unsubscribe = web3Modal.subscribeProvider(async ({ provider, address, chainId, isConnected }) => {
            if (isConnected && provider && address && chainId) {
                const web3Provider = new ethers.providers.Web3Provider(provider, 'any');
                const currentSigner = web3Provider.getSigner();
                await setupState(web3Provider, chainId, currentSigner, address);
            } else if (!isConnected) {
                setupReadOnlyState(); // Revert to default read-only state on disconnect
            }
        });

        setupReadOnlyState(); // Set initial state on component mount

        return () => unsubscribe(); // Cleanup subscription on unmount
    }, [setupReadOnlyState, setupState]);

    // --- THE FIX FOR THE DISCONNECT BUTTON ---
    // Use useCallback to create stable function references for the context value.
    const connectWallet = useCallback(() => web3Modal.open(), []);
    const disconnectWallet = useCallback(() => web3Modal.disconnect(), []);
    // --- END OF FIX ---

    // Memoize the context value to prevent unnecessary re-renders of consuming components
    const contextValue = useMemo(() => ({
        ...connectionState,
        isInitialized,
        connectWallet,
        disconnectWallet,
    }), [connectionState, isInitialized, connectWallet, disconnectWallet]);

    return (
        <WalletContext.Provider value={contextValue}>
            {isInitialized ? children : (
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', fontSize: '1.2rem' }}>
                    Initializing PiOracle...
                </div>
            )}
        </WalletContext.Provider>
    );
}