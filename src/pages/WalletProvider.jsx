// src/pages/WalletProvider.jsx

import React, { createContext, useState, useEffect, useCallback, useMemo } from 'react';
import { ethers } from 'ethers';
import { createWeb3Modal } from '@web3modal/ethers5';

import {
    getAllSupportedChainsForModal,
    getConfigForChainId,
    getTargetChainIdHex,
} from '../config/contractConfig';

import PredictionMarketABI from '../config/abis/PredictionMarketP2P.json'; // Ensure this ABI is up-to-date

export const WalletContext = createContext(null);

const WALLETCONNECT_PROJECT_ID = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID;
if (!WALLETCONNECT_PROJECT_ID) {
    throw new Error("VITE_WALLETCONNECT_PROJECT_ID is not set in your .env file");
}

// --- THIS IS THE FIX: Restore the full, correct configuration ---
const web3Modal = createWeb3Modal({
    ethersConfig: { metadata: { name: "PiOracle", description: "Decentralized Prediction Markets", url: "https://pioracle.online" } },
    chains: getAllSupportedChainsForModal(),
    projectId: WALLETCONNECT_PROJECT_ID,
});
// --- END OF FIX ---

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

        const chainConfig = getConfigForChainId(chainId);
        const effectiveSignerOrProvider = signer || provider;
        let predictionMarketContract = null;

        const contractAddress = chainConfig?.predictionMarketContractAddress;

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
            predictionMarketContract,
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