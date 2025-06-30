// src/pages/WalletProvider.jsx
import React, { createContext, useState, useEffect, useCallback, useMemo } from 'react';
import { ethers } from 'ethers';
import { createWeb3Modal } from '@web3modal/ethers5';
import { 
    getAllSupportedChainsForModal,
    getConfigForChainId,
    getContractAbi, // Assuming this gets your primary PredictionMarket ABI
    getTargetChainIdHex
} from '../config/contractConfig';

export const WalletContext = createContext(null);

const WALLETCONNECT_PROJECT_ID = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID;

export function WalletProvider({ children }) {
    const [web3Modal, setWeb3Modal] = useState(null);
    const [isInitialized, setIsInitialized] = useState(false);
    const [provider, setProvider] = useState(null);
    const [signer, setSigner] = useState(null);
    const [contract, setContract] = useState(null);
    const [chainId, setChainId] = useState(null);
    const [walletAddress, setWalletAddress] = useState(null);
    const [nativeTokenSymbol, setNativeTokenSymbol] = useState(null);
    const [defaultChainId, setDefaultChainId] = useState(null);

    // Initialize Web3Modal once on mount
    useEffect(() => {
        const supportedChains = getAllSupportedChainsForModal();
        if (supportedChains.length > 0 && WALLETCONNECT_PROJECT_ID) {
            const modal = createWeb3Modal({
                ethersConfig: { metadata: { name: "Pioracle.online", /* ... */ } },
                chains: supportedChains,
                projectId: WALLETCONNECT_PROJECT_ID,
            });
            setWeb3Modal(modal);
        }
    }, []);

    // The single source of truth for setting up the app's state
    const setupState = useCallback(async (newChainId, walletProvider = null) => {
        const chainConfig = getConfigForChainId(newChainId);
        if (!chainConfig) {
            console.error(`Cannot setup state: No config for chainId ${newChainId}`);
            setIsInitialized(true); // Allow app to render, but in a 'disconnected' state
            return;
        }

        let currentProvider, currentSigner, currentAddress = null;

        if (walletProvider) { // A wallet is connected
            // --- THIS IS THE FIX ---
            // Wrap the wallet's provider with a standard Web3Provider first to get network info
            const tempProvider = new ethers.providers.Web3Provider(walletProvider, 'any');
            const network = await tempProvider.getNetwork();
            // NOW, create a StaticJsonRpcProvider to prevent ENS errors
            currentProvider = new ethers.providers.StaticJsonRpcProvider(walletProvider.rpcUrls[0] || chainConfig.rpcUrl, network);
            // Re-wrapping might be needed for the signer, or just use the direct provider
            const web3ProviderForSigner = new ethers.providers.Web3Provider(walletProvider, 'any');
            currentSigner = web3ProviderForSigner.getSigner();
            currentAddress = await currentSigner.getAddress();
        } else { // No wallet, setup read-only
            currentProvider = new ethers.providers.StaticJsonRpcProvider(chainConfig.rpcUrl, newChainId);
        }

        setProvider(currentProvider);
        setSigner(currentSigner);
        setWalletAddress(currentAddress);
        setChainId(newChainId);
        setNativeTokenSymbol(chainConfig.symbol);
        
        // Initialize contract
        const contractAddress = chainConfig.predictionMarketContractAddress;
        if(contractAddress){
            setContract(new ethers.Contract(contractAddress, getContractAbi(), currentSigner || currentProvider));
        } else {
            setContract(null);
        }
        
        setIsInitialized(true);
    }, []);


    // Initial Setup Effect
    useEffect(() => {
        if (!web3Modal || isInitialized) return;
        const defaultChain = parseInt(getTargetChainIdHex(), 16);
        setDefaultChainId(defaultChain);
        if (defaultChain) {
            setupState(defaultChain);
        } else {
             setIsInitialized(true);
        }
    }, [web3Modal, isInitialized, setupState]);

    // Web3Modal Subscription Effect
    useEffect(() => {
        if (!web3Modal) return;
        const unsubscribe = web3Modal.subscribeProvider(async ({ provider, isConnected }) => {
            if (isConnected && provider) {
                await setupState(web3Modal.getChainId(), provider);
            } else if (!isConnected) {
                await setupState(defaultChainId);
            }
        });
        return () => unsubscribe();
    }, [web3Modal, defaultChainId, setupState]);
    
    const contextValue = useMemo(() => ({
        walletAddress, signer, contract, chainId, provider, isInitialized, nativeTokenSymbol,
        connectWallet: () => web3Modal?.open(),
        disconnectWallet: () => web3Modal?.disconnect(),
    }), [walletAddress, signer, contract, chainId, provider, isInitialized, nativeTokenSymbol, web3Modal]);
    
    return (
        <WalletContext.Provider value={contextValue}>
            {isInitialized ? children : (<div>Initializing PiOracle...</div>)}
        </WalletContext.Provider>
    );
}