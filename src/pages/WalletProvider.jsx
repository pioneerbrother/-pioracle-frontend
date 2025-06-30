// src/pages/WalletProvider.jsx
import React, { createContext, useState, useEffect, useCallback, useMemo } from 'react';
import { ethers } from 'ethers';
import { createWeb3Modal, defaultConfig } from '@web3modal/ethers5';
import { 
    getAllSupportedChainsForModal,
    getConfigForChainId,
    getContractAbi, // Assuming this is now your generic ABI getter
    getTargetChainIdHex
} from '../config/contractConfig';

export const WalletContext = createContext(null);

const WALLETCONNECT_PROJECT_ID = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID;

const metadata = {
    name: "Pioracle.online",
    description: "Decentralized Prediction Markets",
    url: "https://pioracle.online",
};

export function WalletProvider({ children }) {
    const [web3Modal, setWeb3Modal] = useState(null);
    const [isInitialized, setIsInitialized] = useState(false);
    const [provider, setProvider] = useState(null);
    const [signer, setSigner] = useState(null);
    const [contract, setContract] = useState(null);
    const [chainId, setChainId] = useState(null);
    const [walletAddress, setWalletAddress] = useState(null);
    const [nativeTokenSymbol, setNativeTokenSymbol] = useState("ETH");

    useEffect(() => {
        // This useEffect initializes Web3Modal once on client mount.
        const supportedChains = getAllSupportedChainsForModal();
        const ethersConfig = defaultConfig({ metadata });
        
        if (supportedChains.length > 0 && WALLETCONNECT_PROJECT_ID) {
            const modal = createWeb3Modal({
                ethersConfig,
                chains: supportedChains,
                projectId: WALLETCONNECT_PROJECT_ID,
            });
            setWeb3Modal(modal);
        }
    }, []);

    const setupProviderForChain = useCallback(async (newChainId, newProvider = null, newSigner = null) => {
        const chainConfig = getConfigForChainId(newChainId);
        if (!chainConfig) { return; }
        
        const providerToUse = newProvider || new ethers.providers.JsonRpcProvider(chainConfig.rpcUrl);
        // Using a generic key name for demonstration. Adjust to your config.
        const contractAddress = chainConfig.predictionMarketContractAddress; 
        
        if (contractAddress) {
            const contractInstance = new ethers.Contract(contractAddress, getContractAbi(), newSigner || providerToUse);
            setContract(contractInstance);
        } else {
            setContract(null);
        }

        setChainId(newChainId);
        setProvider(providerToUse);
        setSigner(newSigner);
        setNativeTokenSymbol(chainConfig.symbol);
    }, []);
    
    // --- THIS FUNCTION MUST BE DEFINED WITH useCallback BEFORE useMemo USES IT ---
    const disconnectWalletAndReset = useCallback(async () => {
        console.log("WalletProvider: disconnectWalletAndReset called.");
        if (web3Modal?.isOpen?.()) { await web3Modal.closeModal(); }
        if (provider && provider.provider && typeof provider.provider.disconnect === 'function') {
            await provider.provider.disconnect();
        }

        setWalletAddress(null);
        setSigner(null);
        
        const defaultChainId = parseInt(getTargetChainIdHex(), 16);
        if (defaultChainId) {
            await setupProviderForChain(defaultChainId);
        }
    }, [web3Modal, provider, setupProviderForChain]); // Dependencies for this function
    
    useEffect(() => {
        if (!web3Modal || isInitialized) return;

        const defaultChainId = parseInt(getTargetChainIdHex(), 16);
        if (defaultChainId) {
            setupProviderForChain(defaultChainId).finally(() => setIsInitialized(true));
        } else {
            setIsInitialized(true);
        }

        const unsubscribe = web3Modal.subscribeProvider(async ({ provider, address, chainId, isConnected }) => {
            if (isConnected && provider && address && chainId) {
                const web3Provider = new ethers.providers.Web3Provider(provider, 'any');
                const currentSigner = web3Provider.getSigner();
                setWalletAddress(ethers.utils.getAddress(address));
                await setupProviderForChain(chainId, web3Provider, currentSigner);
            } else if (!isConnected) {
                await disconnectWalletAndReset();
            }
        });

        return () => unsubscribe();
    }, [web3Modal, isInitialized, setupProviderForChain, disconnectWalletAndReset]);


    // --- THIS IS THE FIX ---
    // The disconnectWalletAndReset function is now included in the dependency array of useMemo.
    const contextValue = useMemo(() => ({
        walletAddress, signer, contract, chainId, provider, isInitialized, nativeTokenSymbol,
        connectWallet: () => web3Modal?.open(),
        disconnectWallet: disconnectWalletAndReset, // This is now correctly defined in scope
    }), [
        walletAddress, signer, contract, chainId, provider, isInitialized, 
        nativeTokenSymbol, web3Modal, disconnectWalletAndReset // Added to dependency array
    ]);
    
    return (
        <WalletContext.Provider value={contextValue}>
            {isInitialized ? children : (
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
                    Initializing PiOracle...
                </div>
            )}
        </WalletContext.Provider>
    );
}