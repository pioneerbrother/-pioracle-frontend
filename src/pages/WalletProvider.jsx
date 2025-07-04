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

// --- Import ONLY the Prediction Market ABI ---
import PredictionMarketABI from '../config/abis/PMP2P_ABI_v2.json';

export const WalletContext = createContext(null);

const WALLETCONNECT_PROJECT_ID = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID;
if (!WALLETCONNECT_PROJECT_ID) {
    throw new Error("VITE_WALLETCONNECT_PROJECT_ID is not set in your .env file");
}

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
    predictionMarketContract: null, // The ONLY contract we will manage here
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

        // --- Instantiate ONLY the PredictionMarketP2P contract ---
        const predictionMarketAddr = chainConfig?.predictionMarketContractAddress;
        const predictionMarketAbi = PredictionMarketABI.abi || PredictionMarketABI;
        const predictionMarketContract = (predictionMarketAddr && effectiveSignerOrProvider)
            ? new ethers.Contract(predictionMarketAddr, predictionMarketAbi, effectiveSignerOrProvider)
            : null;

        setConnectionState({
            provider,
            signer,
            walletAddress: address,
            chainId,
            nativeTokenSymbol: chainConfig?.symbol || 'Unknown',
            predictionMarketContract, // Set the one and only contract
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
                setupReadOnlyState();
            }
        });
        setupReadOnlyState();
        return () => unsubscribe();
    }, [setupReadOnlyState, setupState]);

    const connectWallet = useCallback(() => { web3Modal.open(); }, []);
    const disconnectWallet = useCallback(() => { web3Modal.disconnect(); }, []);

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
