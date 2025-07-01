// src/pages/WalletProvider.jsx

import React, { createContext, useState, useEffect, useCallback, useMemo } from 'react';
import { ethers } from 'ethers';
import { createWeb3Modal } from '@web3modal/ethers5';

// --- Configuration Imports ---
import {
    getAllSupportedChainsForModal,
    getConfigForChainId,
    getTargetChainIdHex,
} from '../config/contractConfig';

// --- Import ABIs directly ---
import PremiumContentABI from '../config/abis/PremiumContent.json';
// If you manage other contracts here in the future, import their ABIs too.

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
    premiumContentContract: null,
    // Add other contracts here if you add them to the provider
    web3Modal: null, // We'll add the modal instance here for the button
};

// --- The Provider Component ---
export function WalletProvider({ children }) {
    const [isInitialized, setIsInitialized] = useState(false);
    const [connectionState, setConnectionState] = useState(initialState);

    // Core logic function to set up provider and contracts
    const setupState = useCallback(async (provider, chainId, signer = null, address = null) => {
        if (provider.getNetwork) {
            try {
                const network = await provider.getNetwork();
                if (network.chainId !== 1) {
                    network.ensAddress = null;
                }
            } catch (e) { console.error("Could not get network from provider", e); }
        }

        const chainConfig = getConfigForChainId(chainId);
        
        // This is a small improvement: we still set the basic state even if the chain is unsupported.
        // This allows the UI to show "Unsupported Network" correctly.
        const premiumContentAddr = chainConfig?.premiumContentContractAddress;
        const premiumContentAbi = PremiumContentABI.abi || PremiumContentABI;
        const premiumContentContract = (premiumContentAddr && (signer || provider))
            ? new ethers.Contract(premiumContentAddr, premiumContentAbi, (signer || provider))
            : null;

        setConnectionState({
            provider,
            signer,
            walletAddress: address,
            chainId,
            nativeTokenSymbol: chainConfig?.symbol || 'Unknown',
            premiumContentContract, // This will be null if chainConfig is missing
            web3Modal: web3Modal, // Pass the modal instance
        });
        setIsInitialized(true);
    }, []);

    // Sets up the initial read-only state
    const setupReadOnlyState = useCallback(() => {
        const defaultChainId = parseInt(getTargetChainIdHex(), 16);
        setupState(null, defaultChainId); // Call setupState even with a null provider initially
    }, [setupState]);


    // Main effect to subscribe to wallet events
    useEffect(() => {
        const unsubscribe = web3Modal.subscribeProvider(async ({ provider, address, chainId, isConnected }) => {
            if (isConnected && provider && address && chainId) {
                const web3Provider = new ethers.providers.Web3Provider(provider, 'any');
                const currentSigner = web3Provider.getSigner();
                await setupState(web3Provider, chainId, currentSigner, address);
            } else if (!isConnected) {
                // When disconnecting, we don't want a read-only provider, we want a truly empty state
                setConnectionState(initialState);
                setIsInitialized(true);
            }
        });

        // Set initial state on first load
        setupReadOnlyState(); 

        return () => unsubscribe();
    }, [setupReadOnlyState, setupState]);

    const connectWallet = useCallback(() => web3Modal.open(), []);
    const disconnectWallet = useCallback(() => web3Modal.disconnect(), []);

    const contextValue = useMemo(() => ({
        ...connectionState,
        isInitialized,
        connectWallet,
        disconnectWallet,
    }), [connectionState, isInitialized, connectWallet, disconnectWallet]);

    return (
        <WalletContext.Provider value={contextValue}>
            {isInitialized ? children : (
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', fontSize: '1.2rem', color: '#ccc' }}>
                    Initializing PiOracle...
                </div>
            )}
        </WalletContext.Provider>
    );
}
