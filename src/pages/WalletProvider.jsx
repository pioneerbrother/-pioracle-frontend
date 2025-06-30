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

    // This useEffect initializes Web3Modal ONCE, only on the client-side.
    useEffect(() => {
        const supportedChains = getAllSupportedChainsForModal();
        const defaultChainIdNum = parseInt(getTargetChainIdHex(), 16);
        setDefaultChainId(defaultChainIdNum);

        if (supportedChains.length > 0 && WALLETCONNECT_PROJECT_ID) {
            try {
                const modal = createWeb3Modal({
                    ethersConfig: { metadata: { name: "Pioracle.online", description: "Decentralized Prediction Markets", url: "https://pioracle.online" } },
                    chains: supportedChains,
                    projectId: WALLETCONNECT_PROJECT_ID,
                });
                setWeb3Modal(modal);
            } catch (e) {
                console.error("Error creating Web3Modal instance:", e);
            }
        }
    }, []);

    // This function is the single source of truth for setting up the provider and related state.
    const setupProviderForChain = useCallback(async (newChainId, walletProvider = null) => {
        const chainConfig = getConfigForChainId(newChainId);
        if (!chainConfig) {
            console.error(`WalletProvider: No config for chainId ${newChainId}.`);
            setProvider(null); setSigner(null); setContract(null); setChainId(null); setWalletAddress(null);
            return;
        }

        let currentProvider, currentSigner = null, currentAddress = null;

        if (walletProvider) { // A wallet is connected (e.g., from MetaMask or WalletConnect)
            currentProvider = new ethers.providers.Web3Provider(walletProvider, 'any');
            currentSigner = currentProvider.getSigner();
            currentAddress = await currentSigner.getAddress();
        } else { // No wallet, setup a read-only provider using the RPC URL
            currentProvider = new ethers.providers.StaticJsonRpcProvider(chainConfig.rpcUrl, newChainId);
        }

        setProvider(currentProvider);
        setSigner(currentSigner);
        setWalletAddress(currentAddress);
        setChainId(newChainId);
        setNativeTokenSymbol(chainConfig.symbol);
        
        // Use a generic contract address key name. Adjust if your config uses different names.
        const contractAddress = chainConfig.predictionMarketContractAddress; 
        if(contractAddress){
            setContract(new ethers.Contract(contractAddress, getContractAbi(), currentSigner || currentProvider));
        } else {
            setContract(null);
        }
    }, []);

    const disconnectWalletAndReset = useCallback(async () => {
        console.log("WalletProvider: Disconnecting and resetting to default.");
        if (web3Modal?.isOpen?.()) await web3Modal.closeModal();
        
        setWalletAddress(null);
        setSigner(null);
        
        if (defaultChainId) {
            await setupProviderForChain(defaultChainId);
        }
    }, [web3Modal, defaultChainId, setupProviderForChain]);

    // This effect sets up the initial read-only state.
    useEffect(() => {
        if (!isInitialized && defaultChainId) {
            setupProviderForChain(defaultChainId).finally(() => setIsInitialized(true));
        } else if (!isInitialized && !defaultChainId) {
             // If defaultChainId isn't ready but we need to stop showing the loader
            setIsInitialized(true);
        }
    }, [defaultChainId, isInitialized, setupProviderForChain]);

    // This effect subscribes to Web3Modal for connect/disconnect events.
    useEffect(() => {
        if (!web3Modal) return;
        const unsubscribe = web3Modal.subscribeProvider(async ({ provider, address, chainId, isConnected }) => {
            if (isConnected && provider && address && chainId) {
                // When Web3Modal provides a provider, we re-setup our state with it.
                await setupProviderForChain(chainId, provider);
            } else if (!isConnected) {
                // When Web3Modal signals a disconnect.
                await disconnectWalletAndReset();
            }
        });
        return () => unsubscribe();
    }, [web3Modal, disconnectWalletAndReset, setupProviderForChain]);

    const contextValue = useMemo(() => ({
        walletAddress, signer, contract, chainId, provider, isInitialized, nativeTokenSymbol,
        connectWallet: () => web3Modal?.open(),
        disconnectWallet: disconnectWalletAndReset, // Pass the correctly defined function
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