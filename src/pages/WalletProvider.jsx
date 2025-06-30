// src/pages/WalletProvider.jsx
import React, { createContext, useState, useEffect, useCallback, useMemo } from 'react';
import { ethers } from 'ethers'; // v5
import { createWeb3Modal, defaultConfig } from '@web3modal/ethers5';
import { 
    getAllSupportedChainsForModal,
    getConfigForChainId,
    getContractAbi, // Generic ABI getter
    getTargetChainIdHex
} from '../config/contractConfig';

export const WalletContext = createContext(null);

const WALLETCONNECT_PROJECT_ID = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID;

const metadata = {
    name: "Pioracle.online",
    description: "Decentralized Prediction Markets",
    url: "https://pioracle.online",
    icons: ["https://pioracle.online/pioracle_logo_eyes_only_192.png"],
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

    // This useEffect initializes Web3Modal ONCE on client-side mount.
    useEffect(() => {
        const supportedChains = getAllSupportedChainsForModal();
        const ethersConfig = defaultConfig({ metadata });
        
        if (supportedChains.length > 0 && WALLETCONNECT_PROJECT_ID) {
            const modal = createWeb3Modal({
                ethersConfig,
                chains: supportedChains, // Use the full list of supported chains
                projectId: WALLETCONNECT_PROJECT_ID,
            });
            setWeb3Modal(modal);
        }
    }, []); // Empty array ensures this runs only once

    // This function configures the entire app state for a GIVEN chainId.
    const setupProviderForChain = useCallback(async (newChainId, newProvider = null, newSigner = null) => {
        const chainConfig = getConfigForChainId(newChainId);

        if (!chainConfig) {
            console.error(`WalletProvider: No configuration for chainId: ${newChainId}.`);
            setProvider(null); setSigner(null); setContract(null); setChainId(null);
            return;
        }

        const providerToUse = newProvider || new ethers.providers.JsonRpcProvider(chainConfig.rpcUrl);
        // Use a generic contract address key if your config supports different contracts
        const contractAddress = chainConfig.predictionMarketContractAddress; 
        
        if (contractAddress) {
            const contractInstance = new ethers.Contract(contractAddress, getContractAbi(), newSigner || providerToUse);
            setContract(contractInstance);
            console.log(`WalletProvider: Contract object initialized for ${contractAddress} on chain ${newChainId}`);
        } else {
            setContract(null);
        }

        setChainId(newChainId);
        setProvider(providerToUse);
        setSigner(newSigner);
        setNativeTokenSymbol(chainConfig.symbol);
    }, []);

    // This useEffect sets up the initial read-only state and subscribes to modal events.
    useEffect(() => {
        if (!web3Modal) return; // Wait for modal to be initialized

        // Initial setup for default chain (read-only)
        const defaultChainId = parseInt(getTargetChainIdHex(), 16);
        if (!isInitialized && defaultChainId) {
            setupProviderForChain(defaultChainId).finally(() => setIsInitialized(true));
        }

        // Subscribe to provider changes from Web3Modal
        const unsubscribe = web3Modal.subscribeProvider(async ({ provider, address, chainId, isConnected }) => {
            if (isConnected && provider && address && chainId) {
                const web3Provider = new ethers.providers.Web3Provider(provider, 'any');
                const currentSigner = web3Provider.getSigner();
                setWalletAddress(ethers.utils.getAddress(address));
                await setupProviderForChain(chainId, web3Provider, currentSigner);
            } else if (!isConnected) {
                setWalletAddress(null);
                await setupProviderForChain(defaultChainId);
            }
        });

        return () => unsubscribe(); // Cleanup subscription
    }, [web3Modal, isInitialized, setupProviderForChain]);


    const contextValue = useMemo(() => ({
        walletAddress, signer, contract, chainId, provider, isInitialized, nativeTokenSymbol,
        connectWallet: () => web3Modal?.open(),
          disconnectWallet: disconnectWalletAndReset,
    }), [walletAddress, signer, contract, chainId, provider, isInitialized, nativeTokenSymbol, web3Modal]);
    
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