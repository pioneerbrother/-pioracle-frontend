
// src/pages/WalletProvider.jsx
import React, { createContext, useState, useEffect, useCallback, useMemo } from 'react';
import { ethers } from 'ethers';
import { createWeb3Modal, defaultConfig } from '@web3modal/ethers5';
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
        const supportedChains = getAllSupportedChainsForModal();
        const ethersConfig = defaultConfig({ metadata });
        if (supportedChains.length > 0 && WALLETCONNECT_PROJECT_ID) {
            const modal = createWeb3Modal({ ethersConfig, chains: supportedChains, projectId: WALLETCONNECT_PROJECT_ID });
            setWeb3Modal(modal);
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
    
    const setProviderState = useCallback(async (eip1193Provider) => {
        try {
            const web3Provider = new ethers.providers.Web3Provider(eip1193Provider, 'any');
            const network = await web3Provider.getNetwork();
            const accounts = await web3Provider.listAccounts();
            const connectedAddress = accounts.length > 0 ? ethers.utils.getAddress(accounts[0]) : null;

            setWalletAddress(connectedAddress);
            if (connectedAddress) {
                const currentSigner = web3Provider.getSigner();
                await setupProviderForChain(network.chainId, web3Provider, currentSigner);
            } else {
                await setupProviderForChain(network.chainId, web3Provider, null);
            }
        } catch (error) {
            console.error("Error setting provider state:", error);
        }
    }, [setupProviderForChain]);

    const disconnectWalletAndReset = useCallback(async () => {
        if (web3Modal?.isOpen?.()) { await web3Modal.closeModal(); }
        if (provider?.provider?.disconnect) { await provider.provider.disconnect(); }
        setWalletAddress(null);
        setSigner(null);
        const defaultChainId = parseInt(getTargetChainIdHex(), 16);
        if (defaultChainId) await setupProviderForChain(defaultChainId);
    }, [web3Modal, provider, setupProviderForChain]);

    // Initial Setup
    useEffect(() => {
        const initializeConnection = async () => {
            if (typeof window.ethereum !== 'undefined') {
                try {
                    const accounts = await window.ethereum.request({ method: 'eth_accounts' });
                    if (accounts.length > 0) {
                        await setProviderState(window.ethereum);
                    } else {
                        const defaultChainId = parseInt(getTargetChainIdHex(), 16);
                        if (defaultChainId) await setupProviderForChain(defaultChainId);
                    }
                } catch (error) { console.error("Error on initial connection check:", error); }
            } else {
                const defaultChainId = parseInt(getTargetChainIdHex(), 16);
                if (defaultChainId) await setupProviderForChain(defaultChainId);
            }
            setIsInitialized(true);
        };
        if (web3Modal && !isInitialized) {
            initializeConnection();
        }
    }, [web3Modal, isInitialized, setProviderState, setupProviderForChain]);

    // Wallet Event Listeners
    useEffect(() => {
        if (typeof window.ethereum === 'undefined') return;

        const handleAccountsChanged = (accounts) => {
            if (accounts.length === 0) {
                disconnectWalletAndReset();
            } else {
                setProviderState(window.ethereum);
            }
        };
        const handleChainChanged = () => setProviderState(window.ethereum);

        window.ethereum.on('accountsChanged', handleAccountsChanged);
        window.ethereum.on('chainChanged', handleChainChanged);

        return () => {
            window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
            window.ethereum.removeListener('chainChanged', handleChainChanged);
        };
    }, [setProviderState, disconnectWalletAndReset]); // <-- THIS IS THE KEY FIX

    // Web3Modal Subscription
    useEffect(() => {
        if (!web3Modal) return;
        const unsubscribe = web3Modal.subscribeProvider(async ({ provider, address, chainId, isConnected }) => {
            if (isConnected && provider && address && chainId) {
                await setProviderState(provider);
            } else if (!isConnected) {
                await disconnectWalletAndReset();
            }
        });
        return () => unsubscribe();
    }, [web3Modal, setProviderState, disconnectWalletAndReset]);


    const contextValue = useMemo(() => ({
        walletAddress, signer, contract, chainId, provider, isInitialized, nativeTokenSymbol,
        connectWallet: () => web3Modal?.open(),
        disconnectWallet: disconnectWalletAndReset,
    }), [
        walletAddress, signer, contract, chainId, provider, isInitialized, 
        nativeTokenSymbol, web3Modal, disconnectWalletAndReset
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