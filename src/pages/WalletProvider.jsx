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
    getContractAddress,
    getContractAbi,
    getRpcUrl,
    getTargetChainIdHex,
    getChainName,
    getCurrencySymbol,
    getExplorerUrl,
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
    // --- CHANGE 1: ADD INITIALIZATION STATE ---
    const [isProviderInitialized, setIsProviderInitialized] = useState(false);

    // All other state hooks remain the same
    const [uiDebugMessages, setUiDebugMessages] = useState(["Provider Init..."]);
    const addUiDebug = useCallback((msg) => {
        setUiDebugMessages(prev => [...prev.slice(-10), `${new Date().toLocaleTimeString()}: ${msg}`]);
        console.log("MOB_DEBUG_UI_LOG:", msg);
    }, []);

    const [walletAddress, setWalletAddress] = useState(null);
    const [provider, setProvider] = useState(null);
    const [signer, setSigner] = useState(null);
    const [contract, setContract] = useState(null);
    const [isConnecting, setIsConnecting] = useState(false);
    const [connectionStatus, setConnectionStatus] = useState({ type: 'info', message: 'Initializing...' });
    const [chainId, setChainId] = useState(null);

    const [loadedContractAddress, setLoadedContractAddress] = useState(null);
    const [loadedReadOnlyRpcUrl, setLoadedReadOnlyRpcUrl] = useState(null);
    const [loadedTargetChainIdHex, setLoadedTargetChainIdHex] = useState(null);
    const [loadedTargetChainIdNum, setLoadedTargetChainIdNum] = useState(null);

    const [web3ModalInstance, setWeb3ModalInstance] = useState(null);
    const [eip1193ProviderState, setEip1193ProviderState] = useState(null);
    const [web3ModalInitError, setWeb3ModalInitError] = useState(null);

    // --- ALL HOOKS NOW EXIST AT THE TOP LEVEL ---
    
    // Effect 1: Load dynamic configuration
    useEffect(() => {
        addUiDebug("Effect 1: ConfigLoad START");
        const addr = getContractAddress();
        const rpc = getRpcUrl();
        const targetChainHex = getTargetChainIdHex();
        
        setLoadedContractAddress(addr);
        setLoadedReadOnlyRpcUrl(rpc);
        setLoadedTargetChainIdHex(targetChainHex);

        if (addr && rpc && targetChainHex) {
            setLoadedTargetChainIdNum(parseInt(targetChainHex, 16));
            addUiDebug(`Effect 1: Config Loaded.`);
        }
    }, [addUiDebug]);

    // Effect 1.5: Initialize Web3Modal
    useEffect(() => {
        const canInitModal = loadedReadOnlyRpcUrl && loadedTargetChainIdNum && WALLETCONNECT_PROJECT_ID && !web3ModalInstance && !web3ModalInitError;
        if (canInitModal) {
            addUiDebug("Effect 1.5: Conditions MET. Initializing Web3Modal...");
            try {
                const targetChainConfig = {
                    chainId: loadedTargetChainIdNum,
                    name: getChainName() || `Chain ${loadedTargetChainIdNum}`,
                    currency: getCurrencySymbol() || 'ETH',
                    explorerUrl: getExplorerUrl() || '',
                    rpcUrl: loadedReadOnlyRpcUrl,
                };
                const ethersConfigForModal = defaultConfig({ metadata });
                const modal = createWeb3Modal({
                    ethersConfig: ethersConfigForModal,
                    chains: [targetChainConfig],
                    projectId: WALLETCONNECT_PROJECT_ID,
                    enableAnalytics: false,
                });
                setWeb3ModalInstance(modal);
                addUiDebug("Effect 1.5: Web3Modal INIT SUCCESS!");
            } catch (error) {
                const errorMsg = `Modal Init FAILED: ${error.message}`;
                addUiDebug(errorMsg);
                setWeb3ModalInitError(errorMsg);
            }
        }
    }, [addUiDebug, loadedReadOnlyRpcUrl, loadedTargetChainIdNum, web3ModalInstance, web3ModalInitError]);

    // Effect 2: Initial Provider Setup (Handles Eager Connection & Read-Only Fallback)
    useEffect(() => {
        const canRunInitialSetup = loadedReadOnlyRpcUrl && loadedContractAddress && !provider && !walletAddress && !isConnecting && web3ModalInstance && !web3ModalInitError;
        if (!canRunInitialSetup) return;

        const initialSetup = async () => {
            addUiDebug("Effect 2: Starting initial provider setup...");
            try {
                if (window.ethereum && typeof window.ethereum.request === 'function') {
                    const accounts = await window.ethereum.request({ method: 'eth_accounts' });
                    if (accounts && accounts.length > 0) {
                        addUiDebug(`EagerConnect: Found accounts. Reconnecting...`);
                        const rawEip1193Provider = window.ethereum;
                        setEip1193ProviderState(rawEip1193Provider);
                        const newWeb3Provider = new ethers.providers.Web3Provider(rawEip1193Provider, "any");
                        setProvider(newWeb3Provider);
                        setWalletAddress(ethers.utils.getAddress(accounts[0]));
                        const network = await newWeb3Provider.getNetwork();
                        setChainId(network.chainId);
                        return;
                    }
                }
                addUiDebug("Effect 2: Eager connect did not complete. Setting up ReadOnly provider.");
                const defaultProvider = new ethers.providers.JsonRpcProvider(loadedReadOnlyRpcUrl);
                setProvider(defaultProvider);
                defaultProvider.getNetwork().then(net => setChainId(net?.chainId || null));
            } catch (err) {
                console.error("MOB_DEBUG: Eager/ReadOnly Setup failed:", err);
                addUiDebug(`Initial Setup Error: ${err.message}`);
            } finally {
                // --- CHANGE 2: SET INITIALIZATION TO TRUE AFTER SETUP ---
                addUiDebug("Effect 2: Initial setup finished. Rendering app.");
                setIsProviderInitialized(true);
            }
        };
        initialSetup();
    }, [addUiDebug, loadedReadOnlyRpcUrl, loadedContractAddress, provider, walletAddress, isConnecting, web3ModalInstance, web3ModalInitError]);

    // All other functions and effects (initializeContract, disconnectWalletF, event listeners, etc.)
    // remain here, unchanged.
    const initializeContract = useCallback((currentSignerOrProvider, addressToUse) => {
        const abiToUse = getContractAbi();
        if (!currentSignerOrProvider || !addressToUse || !ethers.utils.isAddress(addressToUse) || !abiToUse || abiToUse.length === 0) {
            setContract(null); return false;
        }
        try {
            const instance = new ethers.Contract(addressToUse, abiToUse, currentSignerOrProvider);
            setContract(instance);
            return true;
        } catch (e) {
            setContract(null); return false;
        }
    }, []);

    const disconnectWalletF = useCallback(async () => {
        if (eip1193ProviderState && typeof eip1193ProviderState.disconnect === 'function') {
           try { await eip1193ProviderState.disconnect(); } catch (e) { console.error(e); }
        }
        setWalletAddress(null); setSigner(null); setProvider(null);
        setEip1193ProviderState(null); setChainId(null);
        setIsProviderInitialized(false); // Re-trigger initialization on disconnect
    }, [eip1193ProviderState]);

    const handleAccountsChanged = useCallback(async (accounts) => {
        if (provider instanceof ethers.providers.Web3Provider && accounts.length > 0 && ethers.utils.isAddress(accounts[0])) {
            setWalletAddress(ethers.utils.getAddress(accounts[0]));
        } else {
            disconnectWalletF();
        }
    }, [provider, disconnectWalletF]);

    const handleChainChanged = useCallback(async (newChainIdHex) => {
        setChainId(parseInt(newChainIdHex, 16));
    }, []);

    useEffect(() => {
        if (eip1193ProviderState?.on) {
            eip1193ProviderState.on('accountsChanged', handleAccountsChanged);
            eip1193ProviderState.on('chainChanged', handleChainChanged);
            eip1193ProviderState.on('disconnect', disconnectWalletF);
            return () => {
                if (eip1193ProviderState?.removeListener) {
                    eip1193ProviderState.removeListener('accountsChanged', handleAccountsChanged);
                    eip1193ProviderState.removeListener('chainChanged', handleChainChanged);
                    eip1193ProviderState.removeListener('disconnect', disconnectWalletF);
                }
            };
        }
    }, [eip1193ProviderState, handleAccountsChanged, handleChainChanged, disconnectWalletF]);

    useEffect(() => {
        if (provider instanceof ethers.providers.Web3Provider && walletAddress) {
            if (chainId === loadedTargetChainIdNum) {
                const currentSigner = provider.getSigner();
                setSigner(currentSigner);
                initializeContract(currentSigner, loadedContractAddress);
                setConnectionStatus({ type: 'success', message: `Connected: ${walletAddress.substring(0,6)}...` });
            } else {
                setSigner(null);
                initializeContract(provider, loadedContractAddress);
                setConnectionStatus({ type: 'error', message: `Wrong Net (Chain ${chainId}).` });
            }
        } else if (provider) {
            setSigner(null);
            initializeContract(provider, loadedContractAddress);
            setConnectionStatus({ type: 'info', message: `ReadOnly Mode` });
        } else {
            setSigner(null); setContract(null);
        }
    }, [provider, walletAddress, loadedContractAddress, initializeContract, chainId, loadedTargetChainIdNum]);

    const connectWallet = useCallback(async () => {
        if (web3ModalInitError || !web3ModalInstance || isConnecting || walletAddress) return;
        setIsConnecting(true);
        try {
            await web3ModalInstance.open();
            const rawEip1193Provider = web3ModalInstance.getWalletProvider();
            if (rawEip1193Provider) {
                setEip1193ProviderState(rawEip1193Provider);
                const newWeb3Provider = new ethers.providers.Web3Provider(rawEip1193Provider, "any");
                setProvider(newWeb3Provider);
                const accounts = await newWeb3Provider.listAccounts();
                if (accounts.length > 0) {
                    setWalletAddress(ethers.utils.getAddress(accounts[0]));
                    const network = await newWeb3Provider.getNetwork();
                    setChainId(network.chainId);
                }
            }
        } catch (error) {
            console.error("Connect Wallet Error:", error);
        } finally {
            setIsConnecting(false);
        }
    }, [web3ModalInstance, web3ModalInitError, isConnecting, walletAddress]);

    const contextValue = useMemo(() => ({
        walletAddress, provider, signer, contract,
        chainId, loadedTargetChainIdNum,
        isConnecting, connectionStatus,
        web3ModalInitError,
        web3ModalInstanceExists: !!web3ModalInstance,
        uiDebugMessages,
        connectWallet,
        disconnectWallet: disconnectWalletF
    }), [
        walletAddress, provider, signer, contract, chainId, loadedTargetChainIdNum,
        isConnecting, connectionStatus, web3ModalInitError, web3ModalInstance, uiDebugMessages, connectWallet, disconnectWalletF
    ]);

    // --- CHANGE 3: CONDITIONAL RENDERING MOVED TO THE RETURN JSX ---
    return (
        <WalletContext.Provider value={contextValue}>
            {isProviderInitialized ? (
                // If initialized, render the actual app
                children
            ) : (
                // Otherwise, render the loading screen
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: '#282c34', color: 'white', fontSize: '1.5rem' }}>
                    Initializing PiOracle...
                </div>
            )}
        </WalletContext.Provider>
    );
}