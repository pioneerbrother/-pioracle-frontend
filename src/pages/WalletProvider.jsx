// src/pages/WalletProvider.jsx
import React, { createContext, useState, useEffect, useCallback, useMemo } from 'react';
import { ethers } from 'ethers';
import { createWeb3Modal } from '@web3modal/ethers5';
import { 
    getAllSupportedChainsForModal,
    getConfigForChainId,
    getContractAbi,
    getTargetChainIdHex
} from '../config/contractConfig';

export const WalletContext = createContext(null);

const WALLETCONNECT_PROJECT_ID = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID;

// Create the modal instance once, outside the component. This is safe.
const web3Modal = createWeb3Modal({
    ethersConfig: { metadata: { name: "Pioracle.online", description: "...", url: "https://pioracle.online" } },
    chains: getAllSupportedChainsForModal(),
    projectId: WALLETCONNECT_PROJECT_ID,
});

export function WalletProvider({ children }) {
    const [isInitialized, setIsInitialized] = useState(false);
    const [appState, setAppState] = useState({
        provider: null,
        signer: null,
        contract: null,
        chainId: null,
        walletAddress: null,
        nativeTokenSymbol: null
    });

    const setupReadOnlyDefault = useCallback(() => {
        const defaultChainId = parseInt(getTargetChainIdHex(), 16);
        if (defaultChainId && !isNaN(defaultChainId)) {
            const chainConfig = getConfigForChainId(defaultChainId);
            if (chainConfig?.rpcUrl) {
                const readOnlyProvider = new ethers.providers.StaticJsonRpcProvider(chainConfig.rpcUrl, defaultChainId);
                const contractAddress = chainConfig.predictionMarketContractAddress;
                const contractInstance = contractAddress ? new ethers.Contract(contractAddress, getContractAbi(), readOnlyProvider) : null;
                
                setAppState({
                    provider: readOnlyProvider,
                    signer: null,
                    walletAddress: null,
                    chainId: defaultChainId,
                    contract: contractInstance,
                    nativeTokenSymbol: chainConfig.symbol,
                });
            }
        }
        setIsInitialized(true);
    }, []);

    useEffect(() => {
        // Subscribe to connection state changes
        const unsubscribe = web3Modal.subscribeEvents(async (event) => {
            if (event.data.event === "MODAL_CLOSE" && !appState.walletAddress) {
                 // User closed modal without connecting, ensure we have a default state
                 if(!appState.provider) setupReadOnlyDefault();
            }
        });

        // Set initial state
        setupReadOnlyDefault();
        
        return () => unsubscribe();
    }, [setupReadOnlyDefault, appState.walletAddress, appState.provider]);
    
    const contextValue = useMemo(() => ({
        ...appState,
        isInitialized,
        connectWallet: () => web3Modal.open(),
        disconnectWallet: () => web3Modal.disconnect(),
    }), [appState, isInitialized]);
    
    return (
        <WalletContext.Provider value={contextValue}>
            {isInitialized ? children : (<div>Initializing PiOracle...</div>)}
        </WalletContext.Provider>
    );
}