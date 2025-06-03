// src/contexts/WalletProvider.jsx
import React, {
    createContext,
    useState,
    useEffect,
    useCallback,
    useMemo,
    // useRef // Not currently used directly, can be removed if not needed later
} from 'react';
import { ethers } from 'ethers';
import * as Web3ModalEthers from '@web3modal/ethers5';

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

// Moved the check inside the component to log it during render cycle if needed
// if (!WALLETCONNECT_PROJECT_ID) {
//     console.error("PiOracle WalletProvider: VITE_WALLETCONNECT_PROJECT_ID is not set. WalletConnect will not work.");
// }

const metadata = {
    name: "Pioracle.online",
    description: "Decentralized Prediction Markets",
    url: "https://pioracle.online",
    icons: ["https://pioracle.online/pioracle_logo_eyes_only_192.png"],
};

export const WalletProvider = ({ children }) => {
    console.log("MOB_DEBUG: WalletProvider START RENDER");
    if (!WALLETCONNECT_PROJECT_ID) {
        console.error("MOB_DEBUG: FATAL - VITE_WALLETCONNECT_PROJECT_ID is MISSING in .env. WalletConnect WILL NOT WORK.");
    }

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
    const [web3ModalInitError, setWeb3ModalInitError] = useState(null); // New state for specific error

    // Effect 1: Load dynamic configuration ONCE on mount
    useEffect(() => {
        console.log("MOB_DEBUG: Effect 1 (ConfigLoad) - Loading dynamic configuration...");
        const addr = getContractAddress();
        const rpc = getRpcUrl();
        const targetChainHex = getTargetChainIdHex();

        // Log raw values from import.meta.env for Netlify debugging
        console.log("MOB_DEBUG: Raw Env Values Used by Config:", {
            VITE_NETWORK_TARGET: import.meta.env.VITE_NETWORK_TARGET,
            VITE_LOCAL_CONTRACT_ADDRESS: import.meta.env.VITE_LOCAL_PREDICTION_MARKET_CONTRACT_ADDRESS,
            VITE_LOCALHOST_RPC_URL: import.meta.env.VITE_LOCALHOST_RPC_URL,
            VITE_LOCAL_CHAIN_ID_HEX: import.meta.env.VITE_LOCAL_CHAIN_ID_HEX,
            VITE_AMOY_CONTRACT_ADDRESS: import.meta.env.VITE_AMOY_PREDICTION_MARKET_CONTRACT_ADDRESS,
            VITE_AMOY_RPC_URL: import.meta.env.VITE_AMOY_RPC_URL,
            VITE_AMOY_CHAIN_ID_HEX: import.meta.env.VITE_AMOY_CHAIN_ID_HEX,
            VITE_POLYGON_MAINNET_CONTRACT_ADDRESS: import.meta.env.VITE_POLYGON_MAINNET_PREDICTION_MARKET_CONTRACT_ADDRESS,
            VITE_POLYGON_MAINNET_RPC_URL: import.meta.env.VITE_POLYGON_MAINNET_RPC_URL,
            VITE_POLYGON_MAINNET_CHAIN_ID_HEX: import.meta.env.VITE_POLYGON_MAINNET_CHAIN_ID_HEX,
        });


        setLoadedContractAddress(addr);
        setLoadedReadOnlyRpcUrl(rpc);
        setLoadedTargetChainIdHex(targetChainHex);

        if (!addr || !rpc || !targetChainHex) {
            const missing = [!addr && "Contract Address", !rpc && "RPC URL", !targetChainHex && "Target Chain ID"].filter(Boolean).join(", ");
            console.error(`MOB_DEBUG: Effect 1 (ConfigLoad) - Critical DApp configuration missing: ${missing}. Used target: ${import.meta.env.VITE_NETWORK_TARGET}`);
            setConnectionStatus({ type: 'error', message: `Critical DApp configuration missing: ${missing}. Please check Netlify env vars.` });
        } else {
            console.log("MOB_DEBUG: Effect 1 (ConfigLoad) - Dynamic configuration loaded:", { addr, rpc, targetChainHex });
            setLoadedTargetChainIdNum(parseInt(targetChainHex, 16));
        }
    }, []);

    // Effect 1.5: Initialize Web3Modal Instance once config is loaded
       // Effect 1.5: Initialize Web3Modal Instance once config is loaded
    useEffect(() => {
        console.log("MOB_DEBUG: Effect 1.5 (Web3ModalInit) - Evaluating conditions.");
        const conditions = {
            loadedReadOnlyRpcUrl: !!loadedReadOnlyRpcUrl,
            loadedTargetChainIdNum: !!loadedTargetChainIdNum,
            WALLETCONNECT_PROJECT_ID: !!WALLETCONNECT_PROJECT_ID, // This is the constant from module scope
            web3ModalInstanceExists: !!web3ModalInstance,
        };
        console.log("MOB_DEBUG: Effect 1.5 (Web3ModalInit) - Conditions:", conditions);

        if (loadedReadOnlyRpcUrl && loadedTargetChainIdNum && WALLETCONNECT_PROJECT_ID && !web3ModalInstance) {
            console.log("MOB_DEBUG: Effect 1.5 (Web3ModalInit) - ALL CONDITIONS MET. Initializing Web3Modal...");
            setWeb3ModalInitError(null); // Clear previous init error

            // VVVV ADD THESE NEW LOGS HERE VVVV
            console.log("MOB_DEBUG: Effect 1.5 (Web3ModalInit) - Web3ModalEthers imported object:", Web3ModalEthers);
            if (Web3ModalEthers && typeof Web3ModalEthers === 'object') {
    console.log("MOB_DEBUG: Effect 1.5 (Web3ModalInit) - Keys of Web3ModalEthers:", Object.keys(Web3ModalEthers));
}
console.log("MOB_DEBUG: Effect 1.5 (Web3ModalInit) - Type of Web3ModalEthers.EthereumWeb3Modal:", typeof Web3ModalEthers.EthereumWeb3Modal);
console.log("MOB_DEBUG: Effect 1.5 (Web3ModalInit) - Value of Web3ModalEthers.EthereumWeb3Modal:", Web3ModalEthers.EthereumWeb3Modal); // Log the value too
            console.log("MOB_DEBUG: Effect 1.5 (Web3ModalInit) - Type of Web3ModalEthers.EthereumWeb3Modal:", typeof Web3ModalEthers.EthereumWeb3Modal);
            // ^^^^ END OF NEW LOGS ^^^^

            try {
                // VVVV ADD THIS CHECK HERE VVVV
                if (typeof Web3ModalEthers.EthereumWeb3Modal !== 'function') {
                    console.error("MOB_DEBUG: FATAL - Web3ModalEthers.EthereumWeb3Modal is NOT a function/constructor! Value is:", Web3ModalEthers.EthereumWeb3Modal);
                    setWeb3ModalInitError("Modal Error: EthereumWeb3Modal component not found in library. Check import.");
                    return; // Exit early if it's not a function, no point in trying `new`
                }
                // ^^^^ END OF NEW CHECK ^^^^

                const targetChainConfig = {
                    chainId: loadedTargetChainIdNum,
                    name: getChainName() || `Chain ${loadedTargetChainIdNum}`,
                    currency: getCurrencySymbol() || 'ETH',
                    explorerUrl: getExplorerUrl() || '',
                    rpcUrl: loadedReadOnlyRpcUrl,
                };
                console.log("MOB_DEBUG: Effect 1.5 (Web3ModalInit) - targetChainConfig:", JSON.stringify(targetChainConfig));

                const ethersConfig = ethers.providers.getDefaultProvider(loadedReadOnlyRpcUrl);
                console.log("MOB_DEBUG: Effect 1.5 (Web3ModalInit) - ethersConfig for modal created using RPC:", loadedReadOnlyRpcUrl);

                // Ensure you're using the namespaced import here
                const modal = new Web3ModalEthers.EthereumWeb3Modal(
                    {
                        ethersConfig: ethersConfig,
                        chains: [targetChainConfig],
                        projectId: WALLETCONNECT_PROJECT_ID,
                        enableAnalytics: false,
                    },
                    metadata // metadata was defined at the top of WalletProvider.jsx
                );
                setWeb3ModalInstance(modal);
                console.log("MOB_DEBUG: Effect 1.5 (Web3ModalInit) - Web3Modal initialized successfully. YAY_MODAL_INIT_SUCCESS");
            } catch (error) {
                console.error("MOB_DEBUG: Effect 1.5 (Web3ModalInit) - FAILED to initialize Web3Modal:", error);
                setWeb3ModalInitError(`Modal Error: ${error.message || 'Unknown error during modal init'}`);
            }
        } else {
            console.log("MOB_DEBUG: Effect 1.5 (Web3ModalInit) - SKIPPED (conditions not met or already initialized).");
        }
    }, [loadedReadOnlyRpcUrl, loadedTargetChainIdNum, web3ModalInstance]); // WALLETCONNECT_PROJECT_ID is stable, metadata is stable

    // initializeContract: Removed connectionStatus from dependencies.
    // The function's ability to create a contract instance doesn't depend on the current connection message.
    // It *sets* connectionStatus on error, but shouldn't re-run because of it.
    const initializeContract = useCallback((currentSignerOrProvider, addressToUse) => {
        const abiToUse = getContractAbi(); // This is stable as it's from a static import
        console.log("MOB_DEBUG: initializeContract - Attempting with address:", addressToUse, "Provider/Signer:", currentSignerOrProvider ? currentSignerOrProvider.constructor.name : 'null');

        if (!currentSignerOrProvider) {
            console.warn("MOB_DEBUG: initializeContract - No provider/signer.");
            setContract(null); return false;
        }
        if (!addressToUse || !ethers.utils.isAddress(addressToUse)) {
            console.error("MOB_DEBUG: initializeContract - Invalid or missing contract address:", addressToUse);
            setContract(null);
            setConnectionStatus({ type: 'error', message: "Contract address configuration error." });
            return false;
        }
        if (!abiToUse || abiToUse.length === 0) {
            console.error("MOB_DEBUG: initializeContract - Contract ABI missing or empty.");
            setContract(null);
            setConnectionStatus({ type: 'error', message: "Contract ABI configuration error." });
            return false;
        }

        try {
            const instance = new ethers.Contract(addressToUse, abiToUse, currentSignerOrProvider);
            setContract(instance);
            console.log(`MOB_DEBUG: initializeContract - Contract instance INITIALIZED at ${addressToUse} with ${currentSignerOrProvider.constructor.name}.`);
            // Clearing status only if it was an error related to contract/RPC/signer
            // This check needs to be careful not to cause loops if initializeContract is called frequently
            // It's generally safer for the calling code (effects) to manage clearing status messages upon success.
            // if (connectionStatus.type === 'error' && (connectionStatus.message.includes('contract') || connectionStatus.message.includes('RPC') || connectionStatus.message.includes('signer'))) {
            //      setConnectionStatus({ type: null, message: '' });
            // }
            return true;
        } catch (e) {
            console.error("MOB_DEBUG: initializeContract - ERROR INITIALIZING CONTRACT INSTANCE:", e);
            setContract(null);
            setConnectionStatus({ type: 'error', message: `Failed to initialize contract: ${e.message}` });
            return false;
        }
    }, []); // getContractAbi is from module scope, ethers.utils.isAddress and ethers.Contract are stable.

    const disconnectWalletF = useCallback(async () => {
        console.log('MOB_DEBUG: disconnectWalletF called.');
        if (web3ModalInstance && eip1193ProviderState) { // Check eip1193ProviderState to ensure session was active
            try {
                console.log("MOB_DEBUG: disconnectWalletF - Attempting to disconnect Web3Modal session.");
                await web3ModalInstance.disconnect();
            } catch (e) {
                console.error("MOB_DEBUG: disconnectWalletF - Error during Web3Modal disconnect:", e);
            }
        }
        setWalletAddress(null);
        setSigner(null);
        setEip1193ProviderState(null);
        setChainId(null); // Clear chainId on disconnect

        // Revert to read-only provider and contract
        if (loadedReadOnlyRpcUrl && loadedContractAddress) {
            console.log("MOB_DEBUG: disconnectWalletF - Re-initializing read-only provider with RPC:", loadedReadOnlyRpcUrl);
            try {
                const defaultProvider = new ethers.providers.JsonRpcProvider(loadedReadOnlyRpcUrl);
                setProvider(defaultProvider);
                // initializeContract will be called by Effect 3 due to provider change and walletAddress being null
                defaultProvider.getNetwork().then(net => {
                    if (net?.chainId) {
                        setChainId(net.chainId); // Set chainId for read-only provider
                        setConnectionStatus({ type: 'info', message: `Wallet disconnected. Using read-only mode (Network: ${net.chainId}).` });
                    } else {
                        setConnectionStatus({ type: 'info', message: 'Wallet disconnected. Using read-only mode.' });
                    }
                }).catch(err => {
                    console.error("MOB_DEBUG: disconnectWalletF - Error getting network for new read-only provider:", err);
                    setConnectionStatus({ type: 'info', message: 'Wallet disconnected. Read-only network info unavailable.' });
                });
            } catch (e) {
                console.error("MOB_DEBUG: disconnectWalletF - Error re-initializing read-only provider:", e);
                setProvider(null); setContract(null); // Ensure contract is also nulled
                setConnectionStatus({ type: 'error', message: 'Failed to restore read-only access.' });
            }
        } else {
            console.warn("MOB_DEBUG: disconnectWalletF - Cannot re-init read-only, config (RPC/Address) not loaded.");
            setProvider(null); setContract(null);
            setConnectionStatus({ type: 'info', message: 'Wallet disconnected. Read-only config missing.' });
        }
    }, [initializeContract, loadedReadOnlyRpcUrl, loadedContractAddress, web3ModalInstance, eip1193ProviderState, loadedTargetChainIdNum]); // loadedTargetChainIdNum added to deps

    const handleAccountsChanged = useCallback(async (accounts) => {
        console.log('MOB_DEBUG: handleAccountsChanged (from EIP-1193). Accounts:', accounts);
        const firstAccount = accounts?.[0];

        if (provider instanceof ethers.providers.Web3Provider && firstAccount && ethers.utils.isAddress(firstAccount)) {
            const validAddress = ethers.utils.getAddress(firstAccount);
            console.log("MOB_DEBUG: handleAccountsChanged - Valid account detected/changed to:", validAddress);
            setWalletAddress(validAddress);
            // Chain ID and connection status will be updated by Effect 3 reacting to provider and new walletAddress
            // Or can optimistically try to set connection status here
            const network = await provider.getNetwork(); // Re-fetch network as context might change
            setChainId(network.chainId);
            if (network.chainId === loadedTargetChainIdNum) {
                setConnectionStatus({ type: 'success', message: `Account switched to ${validAddress.substring(0, 6)}... on target network.` });
            } else {
                setConnectionStatus({ type: 'error', message: `Account ${validAddress.substring(0, 6)}... but on wrong network (Chain ${network.chainId}). Target: ${loadedTargetChainIdNum}.` });
                setSigner(null); // Critical: Invalidate signer if on wrong chain
            }
        } else {
            console.log('MOB_DEBUG: handleAccountsChanged - No valid account from EIP-1193 provider or provider not Web3Provider. Disconnecting.');
            disconnectWalletF();
        }
    }, [provider, disconnectWalletF, loadedTargetChainIdNum]);

    const handleChainChanged = useCallback(async (newChainIdHex) => {
        console.log(`MOB_DEBUG: handleChainChanged (from EIP-1193). New Chain ID (hex): ${newChainIdHex}`);
        const newChainIdNum = parseInt(newChainIdHex, 16);
        setChainId(newChainIdNum); // Update chainId state immediately

        if (provider instanceof ethers.providers.Web3Provider && walletAddress) { // Only if connected
            if (newChainIdNum === loadedTargetChainIdNum) {
                setConnectionStatus({ type: 'success', message: `Switched to target network (Chain ${newChainIdNum}). Re-evaluating signer...` });
                // Effect 3 will attempt to re-create signer because chainId changed and it's a dependency.
                // Forcing signer to null ensures Effect 3 re-runs its signer logic for the new chain.
                setSigner(null);
            } else {
                setConnectionStatus({ type: 'error', message: `Switched to wrong network (Chain ${newChainIdNum}). Target: ${loadedTargetChainIdNum}.` });
                setSigner(null); // Invalidate signer if on wrong chain
            }
        } else if (!walletAddress) {
            console.log("MOB_DEBUG: handleChainChanged - Chain changed but no wallet connected. New chain:", newChainIdNum);
            // Update status only if it makes sense for read-only or initial state
            // This can be noisy if a user has MM and frequently changes networks without being connected to the dapp
        }
    }, [provider, walletAddress, loadedTargetChainIdNum]); // Removed signer, initializeContract. Let Effect 3 handle contract.


    // Effect 2: Setup EIP-1193 Event Listeners
    useEffect(() => {
        console.log("MOB_DEBUG: Effect 2 (EIP1193 Listeners) - Checking for eip1193ProviderState to attach/detach listeners.");
        if (eip1193ProviderState?.on) {
            console.log("MOB_DEBUG: Effect 2 (EIP1193 Listeners) - Attaching listeners.");
            const accountsChangedWrapper = (accounts) => { console.log("MOB_DEBUG: EIP-1193 event: 'accountsChanged'"); handleAccountsChanged(accounts); };
            const chainChangedWrapper = (chainIdHex) => { console.log("MOB_DEBUG: EIP-1193 event: 'chainChanged'"); handleChainChanged(chainIdHex); };
            const disconnectWrapper = (error) => { console.log("MOB_DEBUG: EIP-1193 event: 'disconnect'", error); disconnectWalletF(); };

            eip1193ProviderState.on('accountsChanged', accountsChangedWrapper);
            eip1193ProviderState.on('chainChanged', chainChangedWrapper);
            eip1193ProviderState.on('disconnect', disconnectWrapper);

            return () => {
                console.log("MOB_DEBUG: Effect 2 (EIP1193 Listeners) - Removing listeners.");
                if (eip1193ProviderState?.removeListener) {
                    eip1193ProviderState.removeListener('accountsChanged', accountsChangedWrapper);
                    eip1193ProviderState.removeListener('chainChanged', chainChangedWrapper);
                    eip1193ProviderState.removeListener('disconnect', disconnectWrapper);
                }
            };
        }
    }, [eip1193ProviderState, handleAccountsChanged, handleChainChanged, disconnectWalletF]);

    // Effect 2.5: Initial Read-Only Provider Setup
    useEffect(() => {
        console.log("MOB_DEBUG: Effect 2.5 (ReadOnlySetup) - Evaluating conditions.");
        const conditions = {
            loadedReadOnlyRpcUrl: !!loadedReadOnlyRpcUrl,
            loadedContractAddress: !!loadedContractAddress,
            providerExists: !!provider,
            walletAddressExists: !!walletAddress,
            isConnecting: isConnecting,
        };
        console.log("MOB_DEBUG: Effect 2.5 (ReadOnlySetup) - Conditions:", conditions);

        if (loadedReadOnlyRpcUrl && loadedContractAddress && !provider && !walletAddress && !isConnecting) {
            console.log("MOB_DEBUG: Effect 2.5 (ReadOnlySetup) - ALL CONDITIONS MET. Setting up initial read-only provider.");
            try {
                const defaultJsonRpcProvider = new ethers.providers.JsonRpcProvider(loadedReadOnlyRpcUrl);
                setProvider(defaultJsonRpcProvider);
                defaultJsonRpcProvider.getNetwork().then(net => {
                    if (net?.chainId) {
                        setChainId(net.chainId);
                        setConnectionStatus({ type: 'info', message: `Using read-only mode. Connect wallet to interact. (Network: ${net.chainId})` });
                    } else {
                         setConnectionStatus({ type: 'info', message: `Using read-only mode. Connect wallet to interact.` });
                    }
                }).catch(e => {
                    console.error("MOB_DEBUG: Effect 2.5 (ReadOnlySetup) - Error getting network for read-only provider:", e);
                    setConnectionStatus({ type: 'error', message: 'Could not connect to read-only network.' });
                });
            } catch (jsonRpcErr) {
                console.error("MOB_DEBUG: Effect 2.5 (ReadOnlySetup) - Error creating JsonRpcProvider:", jsonRpcErr);
                setConnectionStatus({ type: 'error', message: 'Could not create read-only provider.' });
            }
        } else {
            console.log("MOB_DEBUG: Effect 2.5 (ReadOnlySetup) - SKIPPED (conditions not met).");
        }
    }, [loadedReadOnlyRpcUrl, loadedContractAddress, provider, walletAddress, isConnecting]); // Removed initializeContract, Effect 3 will handle it.

    // Effect 3: Setup signer and contract
    // Removed connectionStatus.message from deps to prevent loops if status is set within this effect's path.
    useEffect(() => {
        console.log(
            "MOB_DEBUG: Effect 3 (SignerContractSetup) - FIRING.",
            "Provider type:", provider?.constructor.name,
            "Wallet Address:", walletAddress,
            "Signer exists?", !!signer,
            "Loaded Contract Address:", loadedContractAddress,
            "Chain ID:", chainId, "Target Chain ID:", loadedTargetChainIdNum
        );

        if (provider instanceof ethers.providers.Web3Provider && walletAddress && loadedContractAddress && chainId === loadedTargetChainIdNum) {
            if (!signer) {
                console.log("MOB_DEBUG: Effect 3 (SignerContractSetup) - CONDITIONS MET for NEW signer.");
                try {
                    const currentSigner = provider.getSigner();
                    setSigner(currentSigner);
                    initializeContract(currentSigner, loadedContractAddress); // Init contract with new signer
                    // setConnectionStatus already handled by connectWallet or handleAccountsChanged
                } catch (e) {
                    console.error("MOB_DEBUG: Effect 3 (SignerContractSetup) - Error getting new signer:", e);
                    setConnectionStatus({ type: 'error', message: `Could not get signer: ${e.message}` });
                    setSigner(null);
                    setContract(null); // Ensure contract is cleared if signer fails
                }
            } else if (signer && (!contract || contract.signer !== signer || contract.provider !== provider)) {
                // Signer exists, but contract might be missing or mismatched
                console.log("MOB_DEBUG: Effect 3 (SignerContractSetup) - Signer exists, re-initializing contract.");
                initializeContract(signer, loadedContractAddress);
            } else {
                 console.log("MOB_DEBUG: Effect 3 (SignerContractSetup) - Signer exists and contract likely okay, or other conditions not met for new signer.");
            }
        } else if (provider && !walletAddress && loadedContractAddress) { // Read-only mode
            console.log("MOB_DEBUG: Effect 3 (SignerContractSetup) - Read-only mode. Ensuring contract with provider:", provider.constructor.name);
            setSigner(null); // Ensure no signer in read-only mode
            if (!contract || contract.provider !== provider || contract.signer) {
                initializeContract(provider, loadedContractAddress);
            }
        } else if (provider instanceof ethers.providers.Web3Provider && walletAddress && loadedContractAddress && chainId !== loadedTargetChainIdNum) {
            console.log("MOB_DEBUG: Effect 3 (SignerContractSetup) - Connected but on WRONG network. Setting contract to read-only with current provider.");
            setSigner(null);
            if (!contract || contract.provider !== provider || contract.signer) {
                initializeContract(provider, loadedContractAddress);
            }
        } else {
            console.log("MOB_DEBUG: Effect 3 (SignerContractSetup) - Conditions for active signer/contract NOT MET. Clearing signer if address lost.");
            if (!walletAddress && signer) setSigner(null);
            if (!provider && contract) setContract(null); // Clear contract if provider is lost
        }
    }, [provider, walletAddress, loadedContractAddress, initializeContract, signer, contract, chainId, loadedTargetChainIdNum]);


    const connectWallet = useCallback(async () => {
        console.log("MOB_DEBUG: connectWallet - CALLED.");
        if (web3ModalInitError) {
            setConnectionStatus({ type: 'error', message: `Wallet connection service error: ${web3ModalInitError}. Please refresh.` });
            console.error("MOB_DEBUG: connectWallet - Web3Modal init previously failed:", web3ModalInitError);
            return;
        }
        if (!web3ModalInstance) {
            setConnectionStatus({ type: 'error', message: 'Wallet connection service not ready. Please wait or refresh.' });
            console.error("MOB_DEBUG: connectWallet - Web3Modal not initialized. web3ModalInstance is null.");
            return;
        }
        if (!loadedContractAddress || !loadedTargetChainIdNum) { // Simpler check
            setConnectionStatus({ type: 'error', message: 'DApp configuration not ready. Please refresh.' });
            console.error("MOB_DEBUG: connectWallet - DApp config not ready.");
            return;
        }
        if (isConnecting) {
            console.log("MOB_DEBUG: connectWallet - Connection already in progress."); return;
        }
        if (walletAddress && signer && chainId === loadedTargetChainIdNum) {
            console.log("MOB_DEBUG: connectWallet - Already connected with signer on the correct chain.");
            setConnectionStatus({ type: 'success', message: `Already connected: ${walletAddress.substring(0, 6)}...` });
            return;
        }

        setIsConnecting(true);
        setConnectionStatus({ type: 'info', message: 'Opening wallet modal...' });

        try {
            await web3ModalInstance.openModal();
            const rawEip1193Provider = web3ModalInstance.getWalletProvider();

            if (rawEip1193Provider) {
                console.log("MOB_DEBUG: connectWallet - Wallet provider obtained from modal.");
                setEip1193ProviderState(rawEip1193Provider);

                const newWeb3Provider = new ethers.providers.Web3Provider(rawEip1193Provider, "any");
                setProvider(newWeb3Provider);

                const accounts = await newWeb3Provider.listAccounts();
                if (accounts.length > 0 && ethers.utils.isAddress(accounts[0])) {
                    const currentAddress = ethers.utils.getAddress(accounts[0]);
                    setWalletAddress(currentAddress);

                    const network = await newWeb3Provider.getNetwork();
                    setChainId(network.chainId);

                    if (network.chainId === loadedTargetChainIdNum) {
                        setConnectionStatus({ type: 'success', message: `Connected: ${currentAddress.substring(0, 6)}... on target network.` });
                        // Effect 3 will set the signer
                    } else {
                        setConnectionStatus({ type: 'error', message: `Connected to ${currentAddress.substring(0, 6)}... but on wrong network (Chain ${network.chainId}). Target: ${loadedTargetChainIdNum}.` });
                        setSigner(null);
                    }
                    console.log(`MOB_DEBUG: connectWallet - Connection successful for ${currentAddress} on chain ${network.chainId}`);
                } else {
                    console.warn("MOB_DEBUG: connectWallet - Provider obtained, but no accounts found or user rejected.");
                    // Don't call full disconnectWalletF if user just closed modal.
                    // Let current read-only state persist if it was there.
                    // Only reset to read-only if a connection was partially made and then failed.
                    // For now, just update status. If provider/walletAddress isn't set, Effect 3 will keep it read-only.
                    setConnectionStatus({ type: 'info', message: 'Connection cancelled or no account authorized.' });
                }
            } else {
                console.log("MOB_DEBUG: connectWallet - Modal closed without selecting a wallet provider.");
                // If user simply closes modal, don't change existing state unless it was error.
                // If `provider` is already JsonRpcProvider, this means we are in read-only and no action needed.
                if (!(provider instanceof ethers.providers.JsonRpcProvider)) {
                    // If provider was something else (e.g. from a previous failed Web3Provider attempt) or null, ensure clean disconnect.
                     disconnectWalletF(); // This might be too aggressive if they just closed modal without action
                } else {
                    setConnectionStatus({ type: 'info', message: 'Wallet connection modal closed. Using read-only mode.' });
                }
            }
        } catch (error) {
            console.error("MOB_DEBUG: connectWallet - Error during connection process:", error);
            let message = 'Failed to connect wallet.';
            if (error.message?.includes('User closed modal') || error.message?.includes('User rejected')) {
                message = 'Connection request rejected or modal closed.';
            }
            setConnectionStatus({ type: 'error', message });
            // disconnectWalletF(); // Revert to read-only on major error, but maybe not for user closing modal
        } finally { // Always run this
            setIsConnecting(false);
        }
    }, [
        web3ModalInstance, web3ModalInitError, // Added web3ModalInitError
        loadedContractAddress, loadedTargetChainIdNum, // Simplified config check
        isConnecting, walletAddress, signer, chainId, provider, // provider added
        // initializeContract, // connectWallet doesn't call initializeContract directly
        disconnectWalletF
    ]);


    const contextValue = useMemo(() => {
        return {
            walletAddress, provider, signer, contract, chainId,
            loadedTargetChainIdHex,
            loadedTargetChainIdNum,
            isConnecting, connectionStatus,
            web3ModalInitError, // Expose this error for UI if needed
            connectWallet,
            disconnectWallet: disconnectWalletF
        };
    }, [
        walletAddress, provider, signer, contract, chainId, loadedTargetChainIdHex, loadedTargetChainIdNum,
        isConnecting, connectionStatus, web3ModalInitError, connectWallet, disconnectWalletF
    ]);

    console.log(
        "MOB_DEBUG: WalletProvider END RENDER. WalletAddress:", contextValue.walletAddress,
        "Signer:", !!contextValue.signer, "Contract:", !!contextValue.contract,
        "ChainID:", contextValue.chainId, "TargetChainID:", contextValue.loadedTargetChainIdNum,
        "web3ModalInstance exists:", !!web3ModalInstance,
        "Provider type:", provider?.constructor.name
    );

    return (
        <WalletContext.Provider value={contextValue}>
            {children}
        </WalletContext.Provider>
    );
};

export default WalletProvider;