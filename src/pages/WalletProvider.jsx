// src/pages/WalletProvider.jsx
import React, {
    createContext,
    useState,
    useEffect,
    useCallback,
    useMemo
} from 'react';
import { ethers } from 'ethers';
import { createWeb3Modal, defaultConfig } from '@web3modal/ethers5';

import {
    getContractAddress, getContractAbi, getRpcUrl, getTargetChainIdHex,
    getChainName, getCurrencySymbol, getExplorerUrl
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
    const [isProviderInitialized, setIsProviderInitialized] = useState(false);
    const [uiDebugMessages, setUiDebugMessages] = useState([]);
    const addUiDebug = useCallback((msg) => {
        setUiDebugMessages(prev => [...prev.slice(-10), `${new Date().toLocaleTimeString()}: ${msg}`]);
    }, []);

    const [walletAddress, setWalletAddress] = useState(null);
    const [provider, setProvider] = useState(null);
    const [signer, setSigner] = useState(null);
    const [contract, setContract] = useState(null);
    const [isConnecting, setIsConnecting] = useState(false);
    const [chainId, setChainId] = useState(null);
    const [loadedContractAddress, setLoadedContractAddress] = useState(null);
    const [loadedReadOnlyRpcUrl, setLoadedReadOnlyRpcUrl] = useState(null);
    const [loadedTargetChainIdNum, setLoadedTargetChainIdNum] = useState(null);
    const [web3ModalInstance, setWeb3ModalInstance] = useState(null);
    const [eip1193ProviderState, setEip1193ProviderState] = useState(null);
    const [web3ModalInitError, setWeb3ModalInitError] = useState(null);

    useEffect(() => {
        const addr = getContractAddress();
        const rpc = getRpcUrl();
        const targetChainHex = getTargetChainIdHex();
        setLoadedContractAddress(addr);
        setLoadedReadOnlyRpcUrl(rpc);
        if (targetChainHex) setLoadedTargetChainIdNum(parseInt(targetChainHex, 16));
    }, []);

    useEffect(() => {
        if (loadedReadOnlyRpcUrl && loadedTargetChainIdNum && WALLETCONNECT_PROJECT_ID && !web3ModalInstance && !web3ModalInitError) {
            try {
                const modal = createWeb3Modal({
                    ethersConfig: defaultConfig({ metadata }),
                    chains: [{ chainId: loadedTargetChainIdNum, name: getChainName(), currency: getCurrencySymbol(), explorerUrl: getExplorerUrl(), rpcUrl: loadedReadOnlyRpcUrl }],
                    projectId: WALLETCONNECT_PROJECT_ID,
                    enableAnalytics: false,
                });
                setWeb3ModalInstance(modal);
            } catch (error) { setWeb3ModalInitError(error.message); }
        }
    }, [loadedReadOnlyRpcUrl, loadedTargetChainIdNum, web3ModalInstance, web3ModalInitError]);

    useEffect(() => {
        if (!isProviderInitialized && loadedReadOnlyRpcUrl && web3ModalInstance) {
            const initialSetup = async () => {
                try {
                    if (window.ethereum) {
                        const accounts = await window.ethereum.request({ method: 'eth_accounts' });
                        if (accounts && accounts.length > 0) {
                            const newWeb3Provider = new ethers.providers.Web3Provider(window.ethereum, "any");
                            const network = await newWeb3Provider.getNetwork();
                            setEip1193ProviderState(window.ethereum);
                            setProvider(newWeb3Provider);
                            setWalletAddress(ethers.utils.getAddress(accounts[0]));
                            setChainId(network.chainId);
                            return;
                        }
                    }
                    const defaultProvider = new ethers.providers.JsonRpcProvider(loadedReadOnlyRpcUrl);
                    const network = await defaultProvider.getNetwork();
                    setProvider(defaultProvider);
                    setChainId(network?.chainId || null);
                } catch (err) { console.error("Initial setup failed:", err); }
                finally { setIsProviderInitialized(true); }
            };
            initialSetup();
        }
    }, [isProviderInitialized, loadedReadOnlyRpcUrl, web3ModalInstance]);

    const initializeContract = useCallback((currentSignerOrProvider, addressToUse) => {
        try {
            const instance = new ethers.Contract(addressToUse, getContractAbi(), currentSignerOrProvider);
            setContract(instance);
        } catch (e) { setContract(null); }
    }, []);

    const disconnectWalletF = useCallback(() => {
        setWalletAddress(null); setSigner(null); setChainId(null);
        setIsProviderInitialized(false);
        const defaultProvider = new ethers.providers.JsonRpcProvider(loadedReadOnlyRpcUrl);
        setProvider(defaultProvider);
        defaultProvider.getNetwork().then(net => setChainId(net?.chainId || null));
    }, [loadedReadOnlyRpcUrl]);
    
    const handleAccountsChanged = useCallback((accounts) => {
        if (accounts.length === 0) { disconnectWalletF(); }
        else { setWalletAddress(ethers.utils.getAddress(accounts[0])); }
    }, [disconnectWalletF]);

    const handleChainChanged = useCallback((newChainIdHex) => {
        setChainId(parseInt(newChainIdHex, 16));
    }, []);

    useEffect(() => {
        if (eip1193ProviderState?.on) {
            eip1193ProviderState.on('accountsChanged', handleAccountsChanged);
            eip1193ProviderState.on('chainChanged', handleChainChanged);
            eip1193ProviderState.on('disconnect', disconnectWalletF);
            return () => {
                eip1193ProviderState.removeListener('accountsChanged', handleAccountsChanged);
                eip1193ProviderState.removeListener('chainChanged', handleChainChanged);
                eip1193ProviderState.removeListener('disconnect', disconnectWalletF);
            };
        }
    }, [eip1193ProviderState, handleAccountsChanged, handleChainChanged, disconnectWalletF]);
    
    // --- THIS IS THE NEW, SUPERIOR PATTERN ---
    const connectionStatus = useMemo(() => {
        if (!isProviderInitialized) return { type: 'info', message: 'Initializing...' };
        if (walletAddress) {
            if (chainId === loadedTargetChainIdNum) return { type: 'success', message: `Connected: ${walletAddress.substring(0, 6)}...` };
            if (chainId) return { type: 'error', message: `Wrong Net (Chain ${chainId})` };
            return { type: 'info', message: 'Verifying network...' };
        }
        return { type: 'info', message: 'ReadOnly Mode' };
    }, [isProviderInitialized, walletAddress, chainId, loadedTargetChainIdNum]);

    useEffect(() => {
        if (provider && walletAddress && chainId === loadedTargetChainIdNum) {
            const currentSigner = provider.getSigner();
            setSigner(currentSigner);
            initializeContract(currentSigner, loadedContractAddress);
        } else if (provider) {
            setSigner(null);
            initializeContract(provider, loadedContractAddress);
        }
    }, [provider, walletAddress, chainId, loadedTargetChainIdNum, loadedContractAddress, initializeContract]);
    
    const connectWallet = useCallback(async () => {
       // ... (connectWallet function remains unchanged from the previous version)
    }, [web3ModalInstance, web3ModalInitError, isConnecting, walletAddress, addUiDebug]);
    
    const contextValue = useMemo(() => ({
        // ... (contextValue remains unchanged)
    }), [/* ... */]);

    return (
        <WalletContext.Provider value={contextValue}>
            {isProviderInitialized ? children : (
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
                    Initializing PiOracle...
                </div>
            )}
        </WalletContext.Provider>
    );
}