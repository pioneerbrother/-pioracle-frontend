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
// You might have other ABIs here for other contracts handled by the provider
// import PredictionMarketABI from '../config/abis/PredictionMarket.json'; // Example

export const WalletContext = createContext(null);

const WALLETCONNECT_PROJECT_ID = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID;
if (!WALLETCONNECT_PROJECT_ID) {
    throw new Error("VITE_WALLETCONNECT_PROJECT_ID is not set in your .env file");
}

// Ensure web3Modal is created ONCE at the top-level scope.
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
    nativeTokenSymbol: null,
    premiumContentContract: null,
    predictionMarketContract: null, // Assuming you also manage this here
    // web3Modal is now directly used by connectWallet/disconnectWallet,
    // so it doesn't need to be part of connectionState.
};

export function WalletProvider({ children }) {
    const [isInitialized, setIsInitialized] = useState(false);
    const [connectionState, setConnectionState] = useState(initialState);

    const setupState = useCallback(async (provider, chainId, signer = null, address = null) => {
        if (provider && provider.getNetwork) {
            try {
                const network = await provider.getNetwork();
                if (network.chainId !== 1) { network.ensAddress = null; }
            } catch (e) { console.error("Could not get network from provider", e); }
        }

        const chainConfig = getConfigForChainId(chainId);
        const effectiveSignerOrProvider = signer || provider;

        const premiumContentAddr = chainConfig?.premiumContentContractAddress;
        const premiumContentAbi = PremiumContentABI.abi || PremiumContentABI;
        const premiumContentContract = (premiumContentAddr && effectiveSignerOrProvider)
            ? new ethers.Contract(premiumContentAddr, premiumContentAbi, effectiveSignerOrProvider)
            : null;

        // If you're managing PredictionMarketContract here, add its instantiation:
        // const predictionMarketAddr = chainConfig?.predictionMarketContractAddress;
        // const predictionMarketAbi = PredictionMarketABI.abi || PredictionMarketABI; // Make sure PredictionMarketABI is imported
        // const predictionMarketContract = (predictionMarketAddr && effectiveSignerOrProvider)
        //     ? new ethers.Contract(predictionMarketAddr, predictionMarketAbi, effectiveSignerOrProvider)
        //     : null;

        setConnectionState({
            provider,
            signer,
            walletAddress: address,
            chainId,
            nativeTokenSymbol: chainConfig?.symbol || 'Unknown',
            premiumContentContract,
            // predictionMarketContract, // Add if managed here
        });
        setIsInitialized(true);
    }, []);

    const setupReadOnlyState = useCallback(() => {
        const defaultChainId = parseInt(getTargetChainIdHex(), 16);
        const chainConfig = getConfigForChainId(defaultChainId);
        if (chainConfig?.rpcUrl) {
            const readOnlyProvider = new ethers.providers.StaticJsonRpcProvider(chainConfig.rpcUrl, defaultChainId);
            setupState(readOnlyProvider, defaultChainId);
        } else {
            // If no RPC URL, set a minimal state.
            // Still ensures isInitialized is true to prevent infinite loading.
            setConnectionState({ ...initialState, chainId: defaultChainId });
            setIsInitialized(true);
        }
    }, [setupState]);

    useEffect(() => {
        const unsubscribe = web3Modal.subscribeProvider(async ({ provider, address, chainId, isConnected }) => {
            if (isConnected && provider && address && chainId) {
                const web3Provider = new ethers.providers.Web3Provider(provider, 'any');
                const currentSigner = web3Provider.getSigner();
                await setupState(web3Provider, chainId, currentSigner, address);
            } else if (!isConnected) {
                // When disconnecting, return to initial (read-only) state.
                setupReadOnlyState();
            }
        });
        setupReadOnlyState(); // Set initial state on component mount.
        return () => unsubscribe();
    }, [setupReadOnlyState, setupState]);

    // --- FINAL FIX FOR DISCONNECT BUTTON ---
    // These functions directly access the globally created `web3Modal` instance.
    // They are stable because `web3Modal` itself is stable (created once outside).
    const connectWallet = useCallback(() => {
        web3Modal.open();
    }, []);

    const disconnectWallet = useCallback(() => {
        web3Modal.disconnect();
    }, []);
    // --- END OF FIX ---

    const contextValue = useMemo(() => ({
        ...connectionState,
        isInitialized,
        connectWallet,
        disconnectWallet,
        web3Modal: web3Modal, // Ensure web3Modal itself is passed via context if needed by ConnectWalletButton
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
