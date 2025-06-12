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
    console.log("MOB_DEBUG: WalletProvider START RENDER");
    const [uiDebugMessages, setUiDebugMessages] = useState(["Provider Init..."]); // For UI debugging
    const addUiDebug = useCallback((msg) => { // Wrapped in useCallback
        setUiDebugMessages(prev => [...prev.slice(-10), `${new Date().toLocaleTimeString()}: ${msg}`]);
        console.log("MOB_DEBUG_UI_LOG:", msg); // Also log to console for easier debugging if possible
    }, []);


    useEffect(() => {
        addUiDebug("WalletProvider rendered. WC_ID: " + (WALLETCONNECT_PROJECT_ID ? "Present" : "MISSING!"));
        if (!WALLETCONNECT_PROJECT_ID) {
            console.error("MOB_DEBUG: FATAL - VITE_WALLETCONNECT_PROJECT_ID is MISSING. WalletConnect WILL NOT WORK.");
        }
    }, [addUiDebug]); // addUiDebug is a dependency now

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

    // Effect 1: Load dynamic configuration
    useEffect(() => {
        addUiDebug("Effect 1: ConfigLoad START");
        console.log("MOB_DEBUG: Effect 1 (ConfigLoad) - Loading dynamic configuration...");
        const addr = getContractAddress();
        const rpc = getRpcUrl();
        const targetChainHex = getTargetChainIdHex();
        console.log("MOB_DEBUG: Raw Env Values Used by Config:", {
            VITE_NETWORK_TARGET: import.meta.env.VITE_NETWORK_TARGET,
            VITE_WALLETCONNECT_PROJECT_ID_IN_CONFIG_EFFECT: import.meta.env.VITE_WALLETCONNECT_PROJECT_ID, // Log it here too
            // ... other env vars you log ...
        });

        setLoadedContractAddress(addr);
        setLoadedReadOnlyRpcUrl(rpc);
        setLoadedTargetChainIdHex(targetChainHex);

        if (!addr || !rpc || !targetChainHex) {
            const errorMsg = `ConfigLoad FAILED: Missing Contract/RPC/Chain. Target: ${import.meta.env.VITE_NETWORK_TARGET}`;
            console.error("MOB_DEBUG:", errorMsg); addUiDebug(errorMsg);
            setConnectionStatus({ type: 'error', message: `Critical DApp config missing.` });
        } else {
            addUiDebug(`Effect 1: Config Loaded. RPC: ${!!rpc}, Addr: ${!!addr}, ChainHex: ${!!targetChainHex}`);
            console.log("MOB_DEBUG: Effect 1 (ConfigLoad) - Dynamic configuration loaded:", { addr, rpc, targetChainHex });
            setLoadedTargetChainIdNum(parseInt(targetChainHex, 16));
        }
    }, [addUiDebug]); // addUiDebug is a dependency

    // Effect 1.5: Initialize Web3Modal
    useEffect(() => {
        // ... (This effect remains the same as the last good version that successfully initialized Web3Modal) ...
        // ... using createWeb3Modal and defaultConfig ...
        // ... ensure it calls addUiDebug appropriately ...
        console.log("MOB_DEBUG: Effect 1.5 (Web3ModalInit) - Evaluating conditions.");
        const conditions = { /* ... */ }; console.log("MOB_DEBUG: Effect 1.5 (Web3ModalInit) - Conditions:", conditions);
        if (loadedReadOnlyRpcUrl && loadedTargetChainIdNum && WALLETCONNECT_PROJECT_ID && !web3ModalInstance && !web3ModalInitError) {
            addUiDebug("Effect 1.5: Conditions MET. Initializing Web3Modal...");
            // ... (try-catch block for createWeb3Modal) ...
            // On success:
            // setWeb3ModalInstance(modalInstance);
            // addUiDebug("Effect 1.5: Web3Modal INIT SUCCESS!");
            // console.log("MOB_DEBUG: Effect 1.5 (Web3ModalInit) - Web3Modal initialized successfully. YAY_MODAL_INIT_SUCCESS");
            // On error:
            // setWeb3ModalInitError(errorMsg);
            // addUiDebug(errorMsg);
        } // ... else conditions for skipping ...
    }, [loadedReadOnlyRpcUrl, loadedTargetChainIdNum, web3ModalInstance, web3ModalInitError, addUiDebug]);


    // --- START OF NEW EAGER CONNECTION useEffect ---
    useEffect(() => {
        const effectCanRun = WALLETCONNECT_PROJECT_ID && web3ModalInstance && !walletAddress && loadedTargetChainIdNum && !isConnecting && !web3ModalInitError;
        addUiDebug(`EagerConnect Effect: Check. CanRun: ${effectCanRun}. Modal: ${!!web3ModalInstance}, Wallet: ${!!walletAddress}, Configured: ${!!loadedTargetChainIdNum}, Connecting: ${isConnecting}, ModalError: ${!!web3ModalInitError}`);

        if (!effectCanRun) {
            if (!WALLETCONNECT_PROJECT_ID) addUiDebug("EagerConnect: Skipped - No WC Project ID.");
            if (!web3ModalInstance) addUiDebug("EagerConnect: Skipped - Modal instance not ready.");
            if (walletAddress) addUiDebug("EagerConnect: Skipped - Wallet already connected.");
            if (!loadedTargetChainIdNum) addUiDebug("EagerConnect: Skipped - Target chain config not loaded.");
            if (isConnecting) addUiDebug("EagerConnect: Skipped - Connection in progress.");
            if (web3ModalInitError) addUiDebug("EagerConnect: Skipped - Modal init error present.");
            return;
        }

        const checkForExistingConnection = async () => {
            addUiDebug("EagerConnect: Checking for existing injected provider connection...");
            if (window.ethereum && typeof window.ethereum.request === 'function') {
                try {
                    // `eth_accounts` returns accounts if site is already approved by user.
                    // It does NOT open MetaMask popup if not approved.
                    const accounts = await window.ethereum.request({ method: 'eth_accounts' });
                    if (accounts && accounts.length > 0) {
                        addUiDebug(`EagerConnect: Found accounts: ${accounts[0]}. Re-establishing connection.`);
                        
                        const rawEip1193Provider = window.ethereum;
                        setEip1193ProviderState(rawEip1193Provider); // For event listeners

                        const newWeb3Provider = new ethers.providers.Web3Provider(rawEip1193Provider, "any");
                        setProvider(newWeb3Provider);

                        const currentAddress = ethers.utils.getAddress(accounts[0]);
                        setWalletAddress(currentAddress);

                        const network = await newWeb3Provider.getNetwork();
                        setChainId(network.chainId);

                        if (network.chainId === loadedTargetChainIdNum) {
                            setConnectionStatus({ type: 'success', message: `Reconnected: ${currentAddress.substring(0,6)}...` });
                            addUiDebug(`EagerConnect: RECONNECTED to ${currentAddress.substring(0,6)} on chain ${network.chainId}`);
                            // Effect 3 will set the signer
                        } else {
                            setConnectionStatus({ type: 'error', message: `Reconnected to ${currentAddress.substring(0,6)}, but WRONG NET (Chain ${network.chainId}). Target: ${loadedTargetChainIdNum}.` });
                            addUiDebug(`EagerConnect: Reconnected but WRONG NET: ${network.chainId}. Need to clear signer.`);
                            setSigner(null); // Important: clear signer if on wrong network
                        }
                    } else {
                        addUiDebug("EagerConnect: No accounts found via eth_accounts. Not auto-connecting.");
                        // No existing approval or user disconnected from all accounts for this site in MetaMask
                        // Let Effect 2.5 handle setting up read-only if provider isn't already set.
                    }
                } catch (err) {
                    console.error("MOB_DEBUG: EagerConnect - Error during eth_accounts or setup:", err);
                    addUiDebug(`EagerConnect: Error - ${err.message}`);
                }
            } else {
                addUiDebug("EagerConnect: No window.ethereum. Not an injected provider environment.");
            }
        };

        checkForExistingConnection();

    }, [
        web3ModalInstance, // Run when modal is ready
        walletAddress,     // Don't run if already connected by other means (e.g. user click)
        loadedTargetChainIdNum, // Need this for network comparison
        isConnecting, // Don't run if a connection is already in progress
        web3ModalInitError, // Don't run if modal had an init error
        addUiDebug // To allow logging from within
        // We don't need provider, loadedReadOnlyRpcUrl, loadedContractAddress as direct deps here
        // because this effect is for re-establishing a *wallet* connection, not read-only.
    ]);
    // --- END OF NEW EAGER CONNECTION useEffect ---


    const initializeContract = useCallback((currentSignerOrProvider, addressToUse) => { /* ... as before ... */ }, [addUiDebug]);
    const disconnectWalletF = useCallback(async () => { /* ... as before ... */ }, [eip1193ProviderState, loadedReadOnlyRpcUrl, loadedContractAddress, addUiDebug]);
    const handleAccountsChanged = useCallback(async (accounts) => { /* ... as before ... */ }, [provider, disconnectWalletF, loadedTargetChainIdNum, addUiDebug]);
    const handleChainChanged = useCallback(async (newChainIdHex) => { /* ... as before ... */ }, [provider, walletAddress, loadedTargetChainIdNum, addUiDebug]);

    // Effect 2: EIP-1193 Event Listeners
    useEffect(() => { /* ... as before ... */ }, [eip1193ProviderState, handleAccountsChanged, handleChainChanged, disconnectWalletF, addUiDebug]);

    // Effect 2.5: Initial Read-Only Provider Setup
    useEffect(() => { /* ... as before, ensure it checks !walletAddress so eager connect takes precedence if it finds an account ... */
        const canSetupReadOnly = loadedReadOnlyRpcUrl && loadedContractAddress && !provider && !walletAddress && !isConnecting && !web3ModalInitError;
        // ...
    }, [loadedReadOnlyRpcUrl, loadedContractAddress, provider, walletAddress, isConnecting, web3ModalInitError, addUiDebug]);

    // Effect 3: Setup signer and contract
    useEffect(() => { /* ... as before ... */ }, [provider, walletAddress, loadedContractAddress, initializeContract, signer, contract, chainId, loadedTargetChainIdNum, addUiDebug]);

    const connectWallet = useCallback(async () => { /* ... as before ... */ }, [ /* ... your large dep array for connectWallet ... */ addUiDebug]);

    const contextValue = useMemo(() => ({ /* ... as before, including uiDebugMessages ... */ }), [ /* ... all contextValue deps ... */ addUiDebug]);

    console.log("MOB_DEBUG: WalletProvider END RENDER. ModalInstanceSet:", !!web3ModalInstance, "ModalError:", web3ModalInitError, "ProviderType:", provider?.constructor.name, "Wallet:", walletAddress);

    return (
        <WalletContext.Provider value={contextValue}>
            {children}
        </WalletContext.Provider>
    );
};