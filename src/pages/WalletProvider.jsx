// src/pages/WalletProvider.jsx
import React, { createContext, useState, useEffect, useCallback, useMemo } from 'react';
import { ethers } from 'ethers';
import { createWeb3Modal, defaultConfig } from '@web3modal/ethers5';
import { 
    getAllSupportedChainsForModal,
    getConfigForChainId,
    getPredictionMarketAbi,
    getTargetChainIdHex
} from '../config/contractConfig';

export const WalletContext = createContext(null);

const WALLETCONNECT_PROJECT_ID = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID;

const metadata = {
    name: "Pioracle.online",
    description: "Decentralized Prediction Markets",
    url: "https://pioracle.online",
};

// Initialize Web3Modal once, outside the component
const supportedChainsForModal = getAllSupportedChainsForModal();
const ethersConfig = defaultConfig({ metadata });
const web3Modal = createWeb3Modal({
    ethersConfig,
    chains: supportedChainsForModal,
    projectId: WALLETCONNECT_PROJECT_ID,
});

export function WalletProvider({ children }) {
    const [isInitialized, setIsInitialized] = useState(false);
    const [provider, setProvider] = useState(null);
    const [signer, setSigner] = useState(null);
    const [contract, setContract] = useState(null);
    const [chainId, setChainId] = useState(null);
    const [walletAddress, setWalletAddress] = useState(null);
    const [nativeTokenSymbol, setNativeTokenSymbol] = useState("ETH");

    const setupProviderForChain = useCallback(async (newChainId, newProvider = null, newSigner = null) => {
        // ... (this function is already correct and does not need changes)
        console.log(`Setting up provider for chainId: ${newChainId}`);
        const chainConfig = getConfigForChainId(newChainId);

        if (!chainConfig) {
            console.error(`WalletProvider: No configuration found for chainId: ${newChainId}. Cannot set up provider.`);
            setProvider(null); setSigner(null); setContract(null); setChainId(null); setNativeTokenSymbol("ETH");
            return;
        }
        
        const providerToUse = newProvider || new ethers.providers.JsonRpcProvider(chainConfig.rpcUrl);
        const contractAddress = chainConfig.predictionMarketContractAddress;
        
        if (contractAddress) {
            const abi = getPredictionMarketAbi();
            const contractInstance = new ethers.Contract(contractAddress, abi, newSigner || providerToUse);
            setContract(contractInstance);
             console.log(`WalletProvider: Contract initialized for ${contractAddress} on chain ${newChainId}`);
        } else {
            setContract(null);
            console.log(`WalletProvider: No contract address for chainId ${newChainId}, contract set to null.`);
        }
        setChainId(newChainId);
        setProvider(providerToUse);
        setSigner(newSigner);
        setNativeTokenSymbol(chainConfig.symbol);
    }, []);

    // Effect for initial setup and listening to Web3Modal events
    useEffect(() => {
        const defaultChainIdHex = getTargetChainIdHex();
        // --- THIS IS THE FIX ---
        // Ensure the defaultChainId is a valid number before using it.
        const defaultChainId = defaultChainIdHex ? parseInt(defaultChainIdHex, 16) : null;

        if (!isInitialized && defaultChainId !== null && !isNaN(defaultChainId)) {
             console.log("WalletProvider: Initializing with default read-only provider for chainId:", defaultChainId);
            setupProviderForChain(defaultChainId).finally(() => setIsInitialized(true));
        } else if (!isInitialized) {
            // If the default chain ID isn't ready for any reason,
            // we still need to set isInitialized to true so the app can render.
            console.warn("WalletProvider: Could not determine default chainId on initial load. App initialized without a default provider.");
            setIsInitialized(true);
        }
        // --- END OF FIX ---

        const unsubscribe = web3Modal.subscribeProvider(async ({ provider, address, chainId, isConnected }) => {
            console.log("WalletProvider: Web3Modal state changed:", { isConnected, address, chainId });
            if (isConnected && provider && address && chainId) {
                const web3Provider = new ethers.providers.Web3Provider(provider, 'any');
                const currentSigner = web3Provider.getSigner();
                setWalletAddress(ethers.utils.getAddress(address));
                await setupProviderForChain(chainId, web3Provider, currentSigner);
            } else if (!isConnected && defaultChainId !== null && !isNaN(defaultChainId)) {
                // When user disconnects, revert to the valid default read-only provider
                console.log("WalletProvider: Web3Modal disconnected. Reverting to default state.");
                setWalletAddress(null);
                await setupProviderForChain(defaultChainId);
            }
        });

        return () => {
            unsubscribe();
        };
    }, [isInitialized, setupProviderForChain]); // dependency array is correct

    const contextValue = useMemo(() => ({
        walletAddress, signer, contract, chainId, provider, isInitialized, nativeTokenSymbol,
        connectWallet: () => web3Modal.open(),
        disconnectWallet: () => web3Modal.disconnect(),
    }), [walletAddress, signer, contract, chainId, provider, isInitialized, nativeTokenSymbol]);
    
    return (
        <WalletContext.Provider value={contextValue}>
            {isInitialized ? children : (
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: '#282c34', color: 'white', fontSize: '1.5rem' }}>
                    Initializing PiOracle...
                </div>
            )}
        </WalletContext.Provider>
    );
}