// src/pages/WalletProvider.jsx
import React, { createContext, useState, useEffect, useCallback, useMemo } from 'react';
import { ethers } from 'ethers';
import { createWeb3Modal } from '@web3modal/ethers5'; // Only import createWeb3Modal
import { 
    getAllSupportedChainsForModal,
    getConfigForChainId,
    getContractAbi,
    getTargetChainIdHex
} from '../config/contractConfig';

export const WalletContext = createContext(null);

const WALLETCONNECT_PROJECT_ID = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID;

const metadata = {
    name: "Pioracle.online",
    description: "Decentralized Prediction Markets",
    url: "https://pioracle.online",
    // Add your icons array if you have it
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

    // This useEffect initializes Web3Modal ONCE on client mount.
    useEffect(() => {
        const supportedChains = getAllSupportedChainsForModal();
        
        if (supportedChains.length > 0 && WALLETCONNECT_PROJECT_ID) {
            // --- NEW MANUAL CONFIGURATION APPROACH ---
            const modal = createWeb3Modal({
                ethersConfig: { // Manually define the config object
                    metadata,
                    // No default provider needed here, as we handle it
                },
                chains: supportedChains, // Pass the chains array
                projectId: WALLETCONNECT_PROJECT_ID,
                enableOnramp: true, // Example of another option
            });
            // --- END OF NEW APPROACH ---
            
            setWeb3Modal(modal);
        } else {
            console.error("[WalletProvider] Cannot initialize Web3Modal: Missing supported chains or Project ID.");
        }
    }, []);

    const setupProviderForChain = useCallback(async (newChainId, newProvider = null, newSigner = null) => {
        const chainConfig = getConfigForChainId(newChainId);
        if (!chainConfig) { return; }
        
        const providerToUse = newProvider || new ethers.providers.JsonRpcProvider(chainConfig.rpcUrl);
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

    const disconnectWalletAndReset = useCallback(async () => {
        if (web3Modal?.isOpen?.()) { await web3Modal.closeModal(); }
        if (provider?.provider?.disconnect) { await provider.provider.disconnect(); }

        setWalletAddress(null);
        setSigner(null);
        
        const defaultChainId = parseInt(getTargetChainIdHex(), 16);
        if (defaultChainId) {
            await setupProviderForChain(defaultChainId);
        }
    }, [web3Modal, provider, setupProviderForChain]);

    useEffect(() => {
        if (!web3Modal || isInitialized) return;

        const defaultChainId = parseInt(getTargetChainIdHex(), 16);
        if (defaultChainId) {
            setupProviderForChain(defaultChainId).finally(() => setIsInitialized(true));
        } else {
            setIsInitialized(true);
        }
        useEffect(() => {
        // This function will check for an existing provider like MetaMask
        const initializeConnection = async () => {
            // EIP-6963 compatible wallets announce themselves. We also check window.ethereum for MetaMask.
            if (typeof window.ethereum !== 'undefined') {
                try {
                    // Check if we are already connected by seeing if accounts are available
                    const accounts = await window.ethereum.request({ method: 'eth_accounts' });

                    if (accounts.length > 0) {
                        console.log("WalletProvider: Found existing connected session via window.ethereum.");
                        // If accounts are found, it means the user is already connected.
                        // We call setProviderState to update our entire app context.
                        await setProviderState(window.ethereum);
                    } else {
                        console.log("WalletProvider: No active session found. Setting default read-only provider.");
                        const defaultChainId = parseInt(getTargetChainIdHex(), 16);
                        if (defaultChainId) {
                            await setupProviderForChain(defaultChainId);
                        }
                    }
                } catch (error) {
                    console.error("WalletProvider: Error checking for existing connection:", error);
                    // Fallback to default state on error
                    const defaultChainId = parseInt(getTargetChainIdHex(), 16);
                    if (defaultChainId) await setupProviderForChain(defaultChainId);
                }
            } else {
                 console.log("WalletProvider: No window.ethereum provider found. Setting default read-only provider.");
                 const defaultChainId = parseInt(getTargetChainIdHex(), 16);
                 if (defaultChainId) await setupProviderForChain(defaultChainId);
            }
            setIsInitialized(true); // Mark initialization as complete
        };

        // We only run this initialization logic once, after Web3Modal is ready.
        if (web3Modal && !isInitialized) {
            initializeConnection();
        }
    }, [web3Modal, isInitialized, setProviderState, setupProviderForChain]);
    // --- END OF CORRECTED LOGIC ---


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