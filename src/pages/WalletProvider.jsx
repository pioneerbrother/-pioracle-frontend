// src/pages/WalletProvider.jsx

import React, { createContext, useState, useEffect, useCallback, useMemo } from 'react';
import { ethers } from 'ethers';
import { createWeb3Modal } from '@web3modal/ethers5';

import { getAllSupportedChainsForModal, getTargetChainIdHex } from '../config/contractConfig';
import PredictionMarketABI from '../config/abis/PredictionMarketP2P.json';

export const WalletContext = createContext(null);

const WALLETCONNECT_PROJECT_ID = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID;
const web3Modal = createWeb3Modal({ /* ... your config ... */ });

// --- HARDCODED MAINNET ADDRESSES FOR FINAL DEBUGGING ---
const MAINNET_ADDRESSES = {
    56: "0x45ED5a4A419341E9c563daf384C6885968290277",  // BNB Mainnet
    137: "0x9D2b02E9B8e9Fb0F82dDA9BB0d531cB7275fd3d8" // Polygon Mainnet
};
// We can use a testnet address here too if needed for local testing
const TESTNET_ADDRESSES = {
    97: "YOUR_BSC_TESTNET_PM_ADDRESS", // Replace if you have one
};

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

    const setupState = useCallback(async (provider, chainId, signer = null, address = null) => {
        if (provider && provider.getNetwork) {
            try {
                const network = await provider.getNetwork();
                if (network.chainId !== 1) { network.ensAddress = null; }
            } catch (e) { console.error("Could not get network from provider", e); }
        }

        const effectiveSignerOrProvider = signer || provider;
        let predictionMarketContract = null;

        // --- THE FINAL FIX: Use a hardcoded address to eliminate all doubt ---
        const contractAddress = MAINNET_ADDRESSES[chainId] || TESTNET_ADDRESSES[chainId] || null;

        if (contractAddress && effectiveSignerOrProvider) {
            try {
                const predictionMarketAbi = PredictionMarketABI.abi || PredictionMarketABI;
                predictionMarketContract = new ethers.Contract(contractAddress, predictionMarketAbi, effectiveSignerOrProvider);
                console.log(`Successfully created contract instance for chain ${chainId} at address ${contractAddress}`);
            } catch (e) {
                console.error(`Failed to create contract instance for chain ${chainId}`, e);
            }
        } else {
            console.log(`No PredictionMarket contract address configured for chain ${chainId}`);
        }

        setConnectionState({
            provider,
            signer,
            walletAddress: address,
            chainId,
            predictionMarketContract, // This will be set or null
        });
        setIsInitialized(true);
    }, []);

    const setupReadOnlyState = useCallback(() => { /* ... same as before, it will call setupState ... */ }, [setupState]);
    useEffect(() => { /* ... same as before ... */ }, [setupReadOnlyState, setupState]);
    const connectWallet = useCallback(() => { web3Modal.open(); }, []);
    const disconnectWallet = useCallback(() => { web3Modal.disconnect(); }, []);
    const contextValue = useMemo(() => ({ /* ... same as before ... */ }), [connectionState, isInitialized, connectWallet, disconnectWallet]);

    return (
        <WalletContext.Provider value={contextValue}>
            {isInitialized ? children : <div>Initializing...</div>}
        </WalletContext.Provider>
    );
}
