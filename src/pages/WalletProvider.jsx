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
                ethersConfig: { metadata: { name: "Pioracle.online", description: "Decentralized Prediction Markets", url: "https://pioracle.online" } },
                chains: supportedChains,
                projectId: WALLETCONNECT_PROJECT_ID,
            });
            setWeb3Modal(modal);
        }
    }, []);

    // This is the core function for setting up the provider and all related state
    const setupProviderForChain = useCallback(async (newChainId, walletProvider = null) => {
        const chainConfig = getConfigForChainId(newChainId);
        if (!chainConfig) {
            console.error(`WalletProvider: No configuration for chainId ${newChainId}.`);
            setProvider(null); setSigner(null); setContract(null); setChainId(null); setWalletAddress(null);
            return;
        }

        let currentProvider, currentSigner = null, currentAddress = null;

        if (walletProvider) { // A wallet IS connected
            currentProvider = new ethers.providers.Web3Provider(walletProvider, 'any');
            
            // --- THIS IS THE DEFINITIVE FIX FOR THE ENS ERROR ---
            // If the connected network is not Ethereum mainnet (chainId 1),
            // manually nullify the ENS address on the provider's network object.
            // This prevents ethers.js from making unsupported 'getResolver' calls on chains like BNB and Polygon.
            if (newChainId !== 1) {
                currentProvider.network.ensAddress = null;
            }
            // --- END OF FIX ---
            
            currentSigner = currentProvider.getSigner();
            currentAddress = await currentSigner.getAddress();

        } else { // No wallet connected, setup a read-only provider
            // StaticJsonRpcProvider is best for read-only to avoid any network detection overhead
            currentProvider = new ethers.providers.StaticJsonRpcProvider(chainConfig.rpcUrl, newChainId);
        }

        setProvider(currentProvider);
        setSigner(currentSigner);
        setWalletAddress(currentAddress);
        setChainId(newChainId);
        setNativeTokenSymbol(chainConfig.symbol);
        
        // Initialize the primary contract instance (e.g., PredictionMarket)
        const contractAddress = chainConfig.predictionMarketContractAddress;
        if(contractAddress){
            setContract(new ethers.Contract(contractAddress, getContractAbi(), currentSigner || currentProvider));
        } else {
            setContract(null);
        }
        
        if(!isInitialized) setIsInitialized(true);
    }, [isInitialized]); // isInitialized is a dependency to avoid re-running after initial setup

    const disconnectWalletAndReset = useCallback(async () => {
        if (web3Modal?.isOpen?.()) await web3Modal.closeModal();
        setWalletAddress(null);
        setSigner(null);
        if (defaultChainId) {
            await setupProviderForChain(defaultChainId);
        }
    }, [web3Modal, defaultChainId, setupProviderForChain]);

    // Initial Setup Effect
    useEffect(() => {
        if (!isInitialized && !defaultChainId) {
            const initialDefaultChainId = parseInt(getTargetChainIdHex(), 16);
            if (initialDefaultChainId) {
                setDefaultChainId(initialDefaultChainId);
                setupProviderForChain(initialDefaultChainId);
            } else {
                setIsInitialized(true); // Mark initialized even if no default is found
            }
        }
    }, [isInitialized, defaultChainId, setupProviderForChain]);

    // Web3Modal Subscription Effect
    useEffect(() => {
        if (!web3Modal) return;
        const unsubscribe = web3Modal.subscribeProvider(async ({ provider, address, chainId, isConnected }) => {
            if (isConnected && provider && chainId) {
                await setupProviderForChain(chainId, provider);
            } else if (!isConnected) {
                await disconnectWalletAndReset();
            }
        });
        return () => unsubscribe();
    }, [web3Modal, disconnectWalletAndReset, setupProviderForChain]);

    const contextValue = useMemo(() => ({
        walletAddress, signer, contract, chainId, provider, isInitialized, nativeTokenSymbol,
        connectWallet: () => web3Modal?.open(),
        disconnectWallet: disconnectWalletAndReset,
    }), [walletAddress, signer, contract, chainId, provider, isInitialized, nativeTokenSymbol, web3Modal, disconnectWalletAndReset]);
    
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