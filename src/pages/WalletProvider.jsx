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

// Create the modal instance once, outside the component.
const web3Modal = createWeb3Modal({
    ethersConfig: { metadata: { name: "Pioracle.online", description: "...", url: "https://pioracle.online" } },
    chains: getAllSupportedChainsForModal(), // Assumes this function runs correctly on initial load
    projectId: WALLETCONNECT_PROJECT_ID,
});


export function WalletProvider({ children }) {
    const [isInitialized, setIsInitialized] = useState(false);
    const [provider, setProvider] = useState(null);
    const [signer, setSigner] = useState(null);
    const [contract, setContract] = useState(null);
    const [chainId, setChainId] = useState(null);
    const [walletAddress, setWalletAddress] = useState(null);
    const [nativeTokenSymbol, setNativeTokenSymbol] = useState(null);

    const setupState = useCallback(async (newProvider, newChainId) => {
        const chainConfig = getConfigForChainId(newChainId);
        if (!chainConfig) {
            console.error(`WalletProvider: No config for chainId ${newChainId}.`);
            return;
        }

        let currentSigner = null;
        let currentAddress = null;

        try {
            const accounts = await newProvider.listAccounts();
            if (accounts.length > 0) {
                currentSigner = newProvider.getSigner();
                currentAddress = await currentSigner.getAddress();
            }
        } catch (e) {
            console.warn("Could not get signer or address:", e);
        }

        // --- THE DEFINITIVE ENS FIX ---
        // Get the network object. It's a promise, so we must await it.
        const network = await newProvider.getNetwork();
        // Now that we have the network object, we can safely modify it.
        if (network.chainId !== 1) { // 1 is Ethereum Mainnet
            network.ensAddress = null;
        }
        // --- END OF FIX ---

        setProvider(newProvider);
        setSigner(currentSigner);
        setWalletAddress(currentAddress);
        setChainId(newChainId);
        setNativeTokenSymbol(chainConfig.symbol);
        
        const contractAddress = chainConfig.predictionMarketContractAddress;
        if (contractAddress) {
            setContract(new ethers.Contract(contractAddress, getContractAbi(), currentSigner || newProvider));
        } else {
            setContract(null);
        }

        if (!isInitialized) setIsInitialized(true);
    }, [isInitialized]);

    const disconnectWalletAndReset = useCallback(async () => {
        // The modal's disconnect handles WalletConnect sessions.
        await web3Modal.disconnect(); 
        
        // We also manually reset our state to the read-only default
        setWalletAddress(null);
        setSigner(null);
        const defaultChainId = parseInt(getTargetChainIdHex(), 16);
        if (defaultChainId) {
            const defaultConfig = getConfigForChainId(defaultChainId);
            if(defaultConfig?.rpcUrl) {
                const readOnlyProvider = new ethers.providers.StaticJsonRpcProvider(defaultConfig.rpcUrl, defaultChainId);
                await setupState(defaultChainId, readOnlyProvider);
            }
        }
    }, [setupState]);

    // This is the core listener for Web3Modal events
    useEffect(() => {
        const unsubscribe = web3Modal.subscribeProvider(async ({ provider, address, chainId, isConnected }) => {
            if (isConnected && provider && chainId) {
                const web3Provider = new ethers.providers.Web3Provider(provider, 'any');
                await setupState(chainId, web3Provider);
            } else if (!isConnected) {
                await disconnectWalletAndReset();
            }
        });
        return () => unsubscribe();
    }, [disconnectWalletAndReset, setupState]);

    // Initial setup to handle page load with pre-connected wallets (like MetaMask)
    useEffect(() => {
        const checkInitialConnection = async () => {
            if (!isInitialized) {
                const { address, chainId, isConnected } = web3Modal.getState();
                if (isConnected && address && chainId) {
                     // If modal state says we are connected, use its provider
                    const provider = web3Modal.getWalletProvider();
                    if(provider){
                        await setupState(chainId, provider);
                    }
                } else {
                    // Otherwise, set up the default read-only provider
                    const defaultChainId = parseInt(getTargetChainIdHex(), 16);
                    if (defaultChainId) {
                        const defaultConfig = getConfigForChainId(defaultChainId);
                        if(defaultConfig?.rpcUrl){
                             const readOnlyProvider = new ethers.providers.StaticJsonRpcProvider(defaultConfig.rpcUrl, defaultChainId);
                             await setupState(defaultChainId, readOnlyProvider);
                        }
                    }
                }
                setIsInitialized(true);
            }
        };
        checkInitialConnection();
    }, [isInitialized, setupState]);

    const contextValue = useMemo(() => ({
        walletAddress, signer, contract, chainId, provider, isInitialized, nativeTokenSymbol,
        connectWallet: () => web3Modal?.open(),
        disconnectWallet: disconnectWalletAndReset,
    }), [walletAddress, signer, contract, chainId, provider, isInitialized, nativeTokenSymbol, disconnectWalletAndReset]);
    
    return (
        <WalletContext.Provider value={contextValue}>
            {isInitialized ? children : (<div>Initializing PiOracle...</div>)}
        </WalletContext.Provider>
    );
}