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
        const defaultChain = parseInt(getTargetChainIdHex(), 16);
        setDefaultChainId(defaultChain);
        
        if (supportedChains.length > 0 && WALLETCONNECT_PROJECT_ID) {
            const modal = createWeb3Modal({
                // We manually construct the ethersConfig to avoid the buggy defaultConfig helper
                ethersConfig: {
                    metadata: {
                        name: "Pioracle.online",
                        description: "Decentralized Prediction Markets",
                        url: "https://pioracle.online",
                        icons: ["https://pioracle.online/pioracle_logo_eyes_only_192.png"]
                    }
                },
                chains: supportedChains,
                projectId: WALLETCONNECT_PROJECT_ID,
            });
            setWeb3Modal(modal);
        }
    }, []); // Empty dependency array ensures it runs only once.

    const setupProviderForChain = useCallback(async (newChainId, walletProvider = null) => {
        const chainConfig = getConfigForChainId(newChainId);
        if (!chainConfig) {
            console.error(`WalletProvider: No config for chainId ${newChainId}.`);
            setProvider(null); setSigner(null); setContract(null); setChainId(null); setWalletAddress(null);
            return;
        }

        const currentProvider = walletProvider || new ethers.providers.JsonRpcProvider(chainConfig.rpcUrl);
        setProvider(currentProvider);
        setChainId(newChainId);
        setNativeTokenSymbol(chainConfig.symbol);
        
        if (walletProvider) { // If a wallet is connected
            const web3Signer = currentProvider.getSigner();
            setSigner(web3Signer);
            const address = await web3Signer.getAddress();
            setWalletAddress(address);
            
            const contractAddress = chainConfig.predictionMarketContractAddress;
            if(contractAddress){
                setContract(new ethers.Contract(contractAddress, getContractAbi(), web3Signer));
            } else {
                setContract(null);
            }
        } else { // If no wallet, setup read-only
            setSigner(null);
            setWalletAddress(null);
            const contractAddress = chainConfig.predictionMarketContractAddress;
            if(contractAddress){
                setContract(new ethers.Contract(contractAddress, getContractAbi(), currentProvider));
            } else {
                setContract(null);
            }
        }
    }, []);

    // Effect to set up the initial (read-only) provider state
    useEffect(() => {
        if (defaultChainId && !isInitialized) {
            setupProviderForChain(defaultChainId).finally(() => setIsInitialized(true));
        }
    }, [defaultChainId, isInitialized, setupProviderForChain]);

    // Effect to subscribe to Web3Modal events
    useEffect(() => {
        if (!web3Modal) return;

        const unsubscribe = web3Modal.subscribeProvider(async ({ provider, address, chainId, isConnected }) => {
            if (isConnected && provider && address && chainId) {
                const web3Provider = new ethers.providers.Web3Provider(provider, 'any');
                await setupProviderForChain(chainId, web3Provider);
            } else if (!isConnected) {
                setWalletAddress(null);
                setSigner(null);
                // Revert to default read-only provider
                if(defaultChainId) await setupProviderForChain(defaultChainId);
            }
        });
        return () => unsubscribe();
    }, [web3Modal, defaultChainId, setupProviderForChain]);

    const contextValue = useMemo(() => ({
        walletAddress, signer, contract, chainId, provider, isInitialized, nativeTokenSymbol,
        connectWallet: () => web3Modal?.open(),
        disconnectWallet: () => web3Modal?.disconnect(),
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