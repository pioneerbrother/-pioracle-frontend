// src/pages/WalletProvider.jsx
import React, {
    createContext,
    useState,
    useEffect,
    useCallback,
    useMemo
} from 'react';
import { ethers } from 'ethers';
import { createWeb3Modal, defaultConfig } from '@web3modal/ethers5'; // Use createWeb3Modal pattern

import {
    getContractAddress,
    getContractAbi,
    getRpcUrl,
    getTargetChainIdHex,
    getChainName,
    getCurrencySymbol,
    getExplorerUrl,
} from '../config/contractConfig'; // Adjusted path: from ./pages/ up to src/ then down to config/

export const WalletContext = createContext(null);

const WALLETCONNECT_PROJECT_ID = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID;

const metadata = {
    name: "Pioracle.online",
    description: "Decentralized Prediction Markets",
    url: "https://pioracle.online",
    icons: ["https://pioracle.online/pioracle_logo_eyes_only_192.png"],
};

export const WalletProvider = ({ children }) => {
    // --- UI Debug State ---
    const [uiDebugMessages, setUiDebugMessages] = useState(["Provider Init..."]);
    const addUiDebug = (msg) => setUiDebugMessages(prev => [...prev.slice(-10), `${new Date().toLocaleTimeString()}: ${msg}`]); // Keep last 10 messages

    useEffect(() => { // Log initial render status
        addUiDebug("WalletProvider rendered. WC_ID: " + (WALLETCONNECT_PROJECT_ID ? "Present" : "MISSING!"));
        if (!WALLETCONNECT_PROJECT_ID) {
            console.error("MOB_DEBUG: FATAL - VITE_WALLETCONNECT_PROJECT_ID is MISSING. WalletConnect WILL NOT WORK.");
        }
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

    // Effect 1: Load dynamic configuration
    useEffect(() => {
        addUiDebug("Effect 1: ConfigLoad START");
        const addr = getContractAddress();
        const rpc = getRpcUrl();
        const targetChainHex = getTargetChainIdHex();

        setLoadedContractAddress(addr);
        setLoadedReadOnlyRpcUrl(rpc);
        setLoadedTargetChainIdHex(targetChainHex);

        if (!addr || !rpc || !targetChainHex) {
            const errorMsg = `ConfigLoad FAILED: Missing Contract/RPC/Chain. Target: ${import.meta.env.VITE_NETWORK_TARGET}`;
            console.error("MOB_DEBUG:", errorMsg);
            addUiDebug(errorMsg);
            setConnectionStatus({ type: 'error', message: `Critical DApp config missing.` });
        } else {
            addUiDebug(`Effect 1: Config Loaded. RPC: ${!!rpc}, Addr: ${!!addr}, ChainHex: ${!!targetChainHex}`);
            setLoadedTargetChainIdNum(parseInt(targetChainHex, 16));
        }
    }, []);

    // Effect 1.5: Initialize Web3Modal
    useEffect(() => {
        const canInitModal = loadedReadOnlyRpcUrl && loadedTargetChainIdNum && WALLETCONNECT_PROJECT_ID && !web3ModalInstance && !web3ModalInitError;
        addUiDebug(`Effect 1.5: Web3ModalInit Check. CanInit: ${canInitModal}. RPC: ${!!loadedReadOnlyRpcUrl}, TargetChainNum: ${!!loadedTargetChainIdNum}, WC_ID: ${!!WALLETCONNECT_PROJECT_ID}, InstanceExists: ${!!web3ModalInstance}, InitError: ${!!web3ModalInitError}`);

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
                
                const ethersConfigForModal = defaultConfig({ metadata }); // Using Web3Modal's defaultConfig

                const modal = createWeb3Modal({
                    ethersConfig: ethersConfigForModal,
                    chains: [targetChainConfig],
                    projectId: WALLETCONNECT_PROJECT_ID,
                    enableAnalytics: false,
                });
                setWeb3ModalInstance(modal);
                addUiDebug("Effect 1.5: Web3Modal INIT SUCCESS!");
                console.log("MOB_DEBUG: Effect 1.5 (Web3ModalInit) - Web3Modal initialized successfully. YAY_MODAL_INIT_SUCCESS");
            } catch (error) {
                const errorMsg = `Modal Init FAILED: ${error.message}`;
                console.error("MOB_DEBUG: Effect 1.5 (Web3ModalInit) - FAILED:", error);
                addUiDebug(errorMsg);
                setWeb3ModalInitError(errorMsg);
            }
        } else if (web3ModalInitError) {
            addUiDebug("Effect 1.5: SKIPPED (Web3Modal init previously failed).");
        } else if (web3ModalInstance) {
            addUiDebug("Effect 1.5: SKIPPED (Web3Modal already initialized).");
        } else {
            addUiDebug("Effect 1.5: SKIPPED (Prerequisites not met).");
        }
    }, [loadedReadOnlyRpcUrl, loadedTargetChainIdNum, web3ModalInstance, web3ModalInitError]); // WALLETCONNECT_PROJECT_ID is module scope

    const initializeContract = useCallback((currentSignerOrProvider, addressToUse) => {
        // ... (keep your existing initializeContract, ensure MOB_DEBUG prefixes in logs)
        // Example log: console.log("MOB_DEBUG: initializeContract - Attempting...");
        const abiToUse = getContractAbi();
        if (!currentSignerOrProvider || !addressToUse || !ethers.utils.isAddress(addressToUse) || !abiToUse || abiToUse.length === 0) {
            setContract(null); return false;
        }
        try {
            const instance = new ethers.Contract(addressToUse, abiToUse, currentSignerOrProvider);
            setContract(instance);
            addUiDebug(`Contract Initialized (${currentSignerOrProvider.constructor.name.slice(0,4)})`);
            return true;
        } catch (e) { setContract(null); addUiDebug(`Contract Init FAIL: ${e.message}`); return false; }
    }, []);


    const disconnectWalletF = useCallback(async () => {
        addUiDebug("disconnectWalletF called.");
        if (eip1193ProviderState && typeof eip1193ProviderState.disconnect === 'function') {
           try {
               await eip1193ProviderState.disconnect();
               addUiDebug("eip1193Provider.disconnect() called.");
           } catch (e) { addUiDebug(`Error eip1193.disconnect: ${e.message}`); }
        }
        setWalletAddress(null); setSigner(null); setProvider(null);
        setEip1193ProviderState(null); setChainId(null);

        if (loadedReadOnlyRpcUrl && loadedContractAddress) {
            addUiDebug("disconnectWalletF: Reverting to ReadOnly Provider.");
            try {
                const defaultProvider = new ethers.providers.JsonRpcProvider(loadedReadOnlyRpcUrl);
                setProvider(defaultProvider); // Triggers Effect 3
                defaultProvider.getNetwork().then(net => {
                    if (net?.chainId) { setChainId(net.chainId); setConnectionStatus({ type: 'info', message: `Disconnected. ReadOnly (Net: ${net.chainId})` }); }
                    else { setConnectionStatus({ type: 'info', message: 'Disconnected. ReadOnly.' }); }
                }).catch(err => { setConnectionStatus({ type: 'info', message: 'Disconnected. ReadOnly Network Error.' });});
            } catch (e) {
                addUiDebug(`ReadOnly Re-init FAIL: ${e.message}`);
                setProvider(null); setContract(null);
                setConnectionStatus({ type: 'error', message: 'Failed to restore read-only.' });
            }
        } else { addUiDebug("disconnectWalletF: Cannot re-init ReadOnly (config missing)."); /* ... */ }
    }, [eip1193ProviderState, loadedReadOnlyRpcUrl, loadedContractAddress]);


    const handleAccountsChanged = useCallback(async (accounts) => {
        addUiDebug(`accountsChanged: ${accounts.length > 0 ? accounts[0] : 'EMPTY'}`);
        if (provider instanceof ethers.providers.Web3Provider && accounts.length > 0 && ethers.utils.isAddress(accounts[0])) {
            // ... (logic to setWalletAddress, setChainId, setConnectionStatus, setSigner(null)) ...
            const validAddress = ethers.utils.getAddress(accounts[0]);
            setWalletAddress(validAddress);
            const network = await provider.getNetwork();
            setChainId(network.chainId);
            if (network.chainId === loadedTargetChainIdNum) {
                 setConnectionStatus({ type: 'success', message: `Account Switched: ${validAddress.substring(0,6)}...`});
            } else {
                setConnectionStatus({ type: 'error', message: `Wrong Net (Chain ${network.chainId}). Need ${loadedTargetChainIdNum}.` });
                setSigner(null);
            }
        } else {
            disconnectWalletF();
        }
    }, [provider, disconnectWalletF, loadedTargetChainIdNum]);

    const handleChainChanged = useCallback(async (newChainIdHex) => {
        const newChainIdNum = parseInt(newChainIdHex, 16);
        addUiDebug(`chainChanged: ${newChainIdNum}`);
        setChainId(newChainIdNum);
        if (provider instanceof ethers.providers.Web3Provider && walletAddress) {
            if (newChainIdNum === loadedTargetChainIdNum) {
                setConnectionStatus({ type: 'success', message: `Network Switched: Now on target ${newChainIdNum}.` });
                setSigner(null); // Force re-evaluation of signer by Effect 3
            } else {
                setConnectionStatus({ type: 'error', message: `Wrong Net (Chain ${newChainIdNum}). Need ${loadedTargetChainIdNum}.` });
                setSigner(null);
            }
        }
    }, [provider, walletAddress, loadedTargetChainIdNum]);


    // Effect 2: EIP-1193 Event Listeners
    useEffect(() => {
        addUiDebug(`Effect 2: EIP1193 Listeners Setup. eip1193Provider: ${!!eip1193ProviderState}`);
        // ... (your existing Effect 2 logic for attaching/detaching listeners) ...
        // Ensure MOB_DEBUG prefixes in its logs
        if (eip1193ProviderState?.on) {
            const accountsChangedWrapper = (accounts) => { handleAccountsChanged(accounts); };
            const chainChangedWrapper = (chainIdHex) => { handleChainChanged(chainIdHex); };
            const disconnectWrapper = (error) => { disconnectWalletF(); };
            eip1193ProviderState.on('accountsChanged', accountsChangedWrapper);
            eip1193ProviderState.on('chainChanged', chainChangedWrapper);
            eip1193ProviderState.on('disconnect', disconnectWrapper);
            return () => {
                if (eip1193ProviderState?.removeListener) { /* ... remove listeners ... */ }
            };
        }
    }, [eip1193ProviderState, handleAccountsChanged, handleChainChanged, disconnectWalletF]);

    // Effect 2.5: Initial Read-Only Provider Setup
    useEffect(() => {
        const canSetupReadOnly = loadedReadOnlyRpcUrl && loadedContractAddress && !provider && !walletAddress && !isConnecting;
        addUiDebug(`Effect 2.5: ReadOnlySetup Check. CanSetup: ${canSetupReadOnly}. RPC: ${!!loadedReadOnlyRpcUrl}, Addr: ${!!loadedContractAddress}, Provider: ${!!provider}, Wallet: ${!!walletAddress}, Connecting: ${isConnecting}`);
        if (canSetupReadOnly) {
            addUiDebug("Effect 2.5: Setting up ReadOnly provider.");
            try {
                const defaultProvider = new ethers.providers.JsonRpcProvider(loadedReadOnlyRpcUrl);
                setProvider(defaultProvider);
                defaultProvider.getNetwork().then(net => {
                    if (net?.chainId) { setChainId(net.chainId); setConnectionStatus({ type: 'info', message: `ReadOnly Mode (Net: ${net.chainId})` }); }
                    else {setConnectionStatus({ type: 'info', message: `ReadOnly Mode` });}
                }).catch(e => setConnectionStatus({ type: 'error', message: 'ReadOnly Net Error' }));
            } catch (e) { addUiDebug(`ReadOnly Setup FAIL: ${e.message}`); setConnectionStatus({ type: 'error', message: 'ReadOnly Provider Error' });}
        }
    }, [loadedReadOnlyRpcUrl, loadedContractAddress, provider, walletAddress, isConnecting]);


    // Effect 3: Setup signer and contract
    useEffect(() => {
        addUiDebug(`Effect 3: SignerContractSetup. Provider: ${provider?.constructor.name?.slice(0,4)}, Wallet: ${!!walletAddress}, Signer: ${!!signer}, Chain: ${chainId}, Target: ${loadedTargetChainIdNum}`);
        // ... (your existing Effect 3 logic, ensure MOB_DEBUG prefixes in its logs) ...
        // Ensure it calls initializeContract correctly for read-only and signer states
        if (provider instanceof ethers.providers.Web3Provider && walletAddress && loadedContractAddress && chainId === loadedTargetChainIdNum) {
            if (!signer) {
                try {
                    const currentSigner = provider.getSigner(); setSigner(currentSigner);
                    initializeContract(currentSigner, loadedContractAddress);
                } catch (e) { setSigner(null); setContract(null); addUiDebug(`GetSigner FAIL: ${e.message}`); }
            } else if (signer && (!contract || contract.signer !== signer)) {
                initializeContract(signer, loadedContractAddress);
            }
        } else if (provider && !walletAddress && loadedContractAddress) { // Read-only
            setSigner(null);
            if (!contract || contract.provider !== provider || contract.signer) {
                initializeContract(provider, loadedContractAddress);
            }
        } else if (provider instanceof ethers.providers.Web3Provider && walletAddress && chainId !== loadedTargetChainIdNum) { // Wrong network
            setSigner(null);
            if (!contract || contract.provider !== provider || contract.signer) {
                initializeContract(provider, loadedContractAddress); // read-only on wrong network
            }
        } // ... other conditions ...
    }, [provider, walletAddress, loadedContractAddress, initializeContract, signer, contract, chainId, loadedTargetChainIdNum]);


    const connectWallet = useCallback(async () => {
        addUiDebug("connectWallet CALLED.");
        if (web3ModalInitError) { /* ... setConnectionStatus ... */ addUiDebug(`Connect FAIL: ModalInitError: ${web3ModalInitError}`); return; }
        if (!web3ModalInstance) { /* ... setConnectionStatus ... */ addUiDebug("Connect FAIL: No Modal Instance"); return; }
        // ... (other initial checks for config, isConnecting, already connected) ...

        setIsConnecting(true); setConnectionStatus({ type: 'info', message: 'Opening modal...' }); addUiDebug("Opening Modal...");
        try {
            await web3ModalInstance.open(); // Use .open()
            const rawEip1193Provider = web3ModalInstance.getWalletProvider();
            if (rawEip1193Provider) {
                addUiDebug("Modal: Provider Obtained.");
                setEip1193ProviderState(rawEip1193Provider);
                const newWeb3Provider = new ethers.providers.Web3Provider(rawEip1193Provider, "any");
                setProvider(newWeb3Provider);
                const accounts = await newWeb3Provider.listAccounts();
                if (accounts.length > 0) {
                    const currentAddress = ethers.utils.getAddress(accounts[0]);
                    setWalletAddress(currentAddress);
                    const network = await newWeb3Provider.getNetwork();
                    setChainId(network.chainId);
                    if (network.chainId === loadedTargetChainIdNum) {
                        setConnectionStatus({ type: 'success', message: `Connected: ${currentAddress.substring(0,6)}...` });
                        addUiDebug(`CONNECTED: ${currentAddress.substring(0,6)} on chain ${network.chainId}`);
                    } else {
                        setConnectionStatus({ type: 'error', message: `Wrong Net (Chain ${network.chainId}). Need ${loadedTargetChainIdNum}.` });
                        addUiDebug(`WRONG NET: Connected to ${network.chainId}`);
                        setSigner(null);
                    }
                } else { addUiDebug("Modal: No Accounts from provider."); setConnectionStatus({ type: 'info', message: 'No account auth.' });}
            } else { addUiDebug("Modal: Closed, no provider."); setConnectionStatus({ type: 'info', message: 'Modal closed.' });}
        } catch (error) { addUiDebug(`Connect CATCH FAIL: ${error.message}`); setConnectionStatus({ type: 'error', message: `Connect Error: ${error.message}` });
        } finally { setIsConnecting(false); addUiDebug("ConnectWallet FINALLY."); }
    }, [web3ModalInstance, web3ModalInitError, loadedContractAddress, loadedTargetChainIdNum, isConnecting, walletAddress, signer, chainId, disconnectWalletF]);


    const contextValue = useMemo(() => ({
        walletAddress, provider, signer, contract, chainId,
        loadedTargetChainIdHex, loadedTargetChainIdNum,
        isConnecting, connectionStatus,
        web3ModalInitError,
        web3ModalInstanceExists: !!web3ModalInstance, // For button disabling
        uiDebugMessages, // Pass for display
        connectWallet,
        disconnectWallet: disconnectWalletF
    }), [
        walletAddress, provider, signer, contract, chainId, loadedTargetChainIdHex, loadedTargetChainIdNum,
        isConnecting, connectionStatus, web3ModalInitError, web3ModalInstance, uiDebugMessages, connectWallet, disconnectWalletF
    ]);

    return (
        <WalletContext.Provider value={contextValue}>
            {children}
        </WalletContext.Provider>
    );
};