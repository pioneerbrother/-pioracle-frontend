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
    getContractAbi, 
    getTargetChainIdHex,      // For Web3Modal's defaultChainId
    getAllSupportedChainsForModal, // For Web3Modal's `chains` array
    getConfigForChainId         // For dynamic contract address and RPC
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
    const [isInitialized, setIsInitialized] = useState(false);
    const [walletAddress, setWalletAddress] = useState(null);
    const [provider, setProvider] = useState(null); // This will be the ethers.Web3Provider
    const [signer, setSigner] = useState(null);
    const [contract, setContract] = useState(null); // This contract instance will be dynamic
    const [currentChainId, setCurrentChainId] = useState(null); // The actual connected chainId
    const [web3Modal, setWeb3Modal] = useState(null);
    const [nativeTokenSymbol, setNativeTokenSymbol] = useState("ETH"); // Default, updates on connection

    // Default chainId based on VITE_NETWORK_TARGET (for Web3Modal default and initial read-only state)
    const defaultTargetChainIdNum = useMemo(() => {
        const hex = getTargetChainIdHex();
        return hex ? parseInt(hex, 16) : null;
    }, []);

    const getSymbolForChain = useCallback((id) => {
        if (!id) return "ETH"; 
        const numId = Number(id); // Ensure it's a number for comparison
        if (numId === 56 || numId === 97) return "BNB";    // BNB Mainnet & Testnet
        if (numId === 137 || numId === 80002) return "MATIC"; // Polygon Mainnet & Amoy
        return "ETH"; // Fallback
    }, []);

    // Effect 1: Initialize Web3Modal instance
    useEffect(() => {
        if (WALLETCONNECT_PROJECT_ID) {
            const supportedChains = getAllSupportedChainsForModal();
            if (supportedChains.length === 0) {
                console.error("WalletProvider: No supported chains configured for Web3Modal.");
                return;
            }

            const ethersConfig = defaultConfig({
                metadata,
                defaultChainId: defaultTargetChainIdNum || supportedChains[0].chainId,
            });

            const modal = createWeb3Modal({
                ethersConfig,
                chains: supportedChains,
                projectId: WALLETCONNECT_PROJECT_ID,
                enableAnalytics: false,
                // recommendedChains: [137, 56] // Optional: guide user to Polygon or BNB
            });
            setWeb3Modal(modal);
            console.log("WalletProvider: Web3Modal initialized with chains:", supportedChains);
        }
    }, [defaultTargetChainIdNum]); // Only needs to run once based on initial config

    // Initialize a contract instance based on the ACTUAL connected network
    const initializeContractForActualNetwork = useCallback((signerOrProvider, actualChainId) => {
        if (!actualChainId) {
            setContract(null);
            console.log("WalletProvider: No actualChainId provided, contract set to null.");
            return;
        }
        const currentNetworkConfig = getConfigForChainId(actualChainId);
        
        if (signerOrProvider && currentNetworkConfig && currentNetworkConfig.contractAddress) {
            try {
                const newContract = new ethers.Contract(currentNetworkConfig.contractAddress, getContractAbi(), signerOrProvider);
                setContract(newContract);
                console.log(`WalletProvider: Contract INITIALIZED for address ${currentNetworkConfig.contractAddress} on chain ${actualChainId}`);
            } catch (e) {
                 console.error(`WalletProvider: Error initializing contract for chain ${actualChainId}`, e);
                 setContract(null);
            }
        } else {
            setContract(null);
            console.log(`WalletProvider: Contract set to null. Conditions not met. Provider/Signer: ${!!signerOrProvider}, Config: ${!!currentNetworkConfig}, Address: ${currentNetworkConfig?.contractAddress}`);
        }
    }, []); // getContractAbi is stable

    // Sets provider, signer, address, chainId, symbol, and initializes contract
    const setProviderState = useCallback(async (eip1193Provider) => {
        try {
            const web3Provider = new ethers.providers.Web3Provider(eip1193Provider, 'any');
            const network = await web3Provider.getNetwork(); // Get network first
            const accounts = await web3Provider.listAccounts();
            const connectedAddress = accounts.length > 0 ? ethers.utils.getAddress(accounts[0]) : null;

            console.log(`WalletProvider: setProviderState - Detected Chain: ${network.chainId}, Accounts:`, accounts);

            setProvider(web3Provider);
            setCurrentChainId(network.chainId);
            setNativeTokenSymbol(getSymbolForChain(network.chainId));
            setWalletAddress(connectedAddress);

            if (connectedAddress) {
                const currentSigner = web3Provider.getSigner();
                setSigner(currentSigner);
                initializeContractForActualNetwork(currentSigner, network.chainId);
            } else {
                setSigner(null);
                // If no account connected, setup read-only provider for the current network (if known)
                // or fallback to the default target network.
                const activeChainIdForReadOnly = network.chainId || defaultTargetChainIdNum;
                const currentNetworkConfig = getConfigForChainId(activeChainIdForReadOnly);
                if (currentNetworkConfig && currentNetworkConfig.rpcUrl) {
                    const readOnlyProvider = new ethers.providers.JsonRpcProvider(currentNetworkConfig.rpcUrl);
                    initializeContractForActualNetwork(readOnlyProvider, activeChainIdForReadOnly);
                } else {
                     initializeContractForActualNetwork(null, null);
                }
            }
        } catch (error) {
            console.error("WalletProvider: Error in setProviderState:", error);
            // Fallback or error state
            setWalletAddress(null);
            setSigner(null);
            setCurrentChainId(null);
            setNativeTokenSymbol("ETH");
            setContract(null);
        }
    }, [initializeContractForActualNetwork, getSymbolForChain, defaultTargetChainIdNum]);

    // Handles disconnecting the wallet and resetting to a default read-only state
    const disconnectWalletAndReset = useCallback(async () => {
        console.log("WalletProvider: disconnectWalletAndReset called.");
        try {
            if (web3Modal?.isOpen?.()) {
                await web3Modal.closeModal();
            }
            // Ethers v5 Web3Provider doesn't have a direct disconnect.
            // WalletConnect provider (if used via Web3Modal) might be inside `provider.provider`.
            if (provider && provider.provider && typeof provider.provider.disconnect === 'function') {
                await provider.provider.disconnect();
                console.log("WalletProvider: Called disconnect on provider.provider");
            }
        } catch (e) {
            console.warn("WalletProvider: Error during Web3Modal/provider disconnect attempt:", e);
        }

        setWalletAddress(null);
        setSigner(null);
        
        // Fallback to a default read-only provider for the VITE_NETWORK_TARGET
        const defaultChainConfig = getConfigForChainId(defaultTargetChainIdNum);
        if (defaultChainConfig && defaultChainConfig.rpcUrl) {
            try {
                const defaultJsonRpcProvider = new ethers.providers.JsonRpcProvider(defaultChainConfig.rpcUrl);
                setProvider(defaultJsonRpcProvider);
                const net = await defaultJsonRpcProvider.getNetwork();
                setCurrentChainId(net.chainId);
                setNativeTokenSymbol(getSymbolForChain(net.chainId));
                initializeContractForActualNetwork(defaultJsonRpcProvider, net.chainId);
                 console.log("WalletProvider: Reset to default read-only provider for chainId:", net.chainId);
            } catch (e) {
                console.error("WalletProvider: Error setting up default provider on disconnect:", e);
                 setProvider(null); setCurrentChainId(null); setNativeTokenSymbol("ETH"); initializeContractForActualNetwork(null, null);
            }
        } else {
            console.warn("WalletProvider: No default RPC URL found for disconnect fallback.");
            setProvider(null); setCurrentChainId(null); setNativeTokenSymbol("ETH"); initializeContractForActualNetwork(null, null);
        }
    }, [web3Modal, provider, defaultTargetChainIdNum, initializeContractForActualNetwork, getSymbolForChain]);

    // Initial setup effect to check for existing EIP-1193 provider (like MetaMask)
    useEffect(() => {
        const setup = async () => {
            console.log("WalletProvider: Initial setup effect.");
            if (typeof window.ethereum !== 'undefined') {
                try {
                    const accounts = await window.ethereum.request({ method: 'eth_accounts' });
                    if (accounts.length > 0) {
                        console.log("WalletProvider: Found existing EIP-1193 provider session (e.g., MetaMask).");
                        await setProviderState(window.ethereum);
                    } else {
                        console.log("WalletProvider: No active EIP-1193 session. Setting default read-only state.");
                        await disconnectWalletAndReset(); // Sets up default provider
                    }
                } catch (e) {
                    console.error("WalletProvider: Error during window.ethereum initial check:", e);
                    await disconnectWalletAndReset();
                }
            } else {
                console.log("WalletProvider: No window.ethereum. Setting default read-only state.");
                await disconnectWalletAndReset(); // Sets up default provider
            }
            setIsInitialized(true);
            console.log("WalletProvider: Initialization sequence complete.");
        };
        
        if (!isInitialized && web3Modal) { // Run only once after Web3Modal is ready
            setup();
        }
    }, [isInitialized, web3Modal, setProviderState, disconnectWalletAndReset]);
    
    // Event listeners for EIP-1193 provider (MetaMask etc.)
    useEffect(() => {
        if (typeof window.ethereum === 'undefined') return;

        const handleAccountsChanged = (accounts) => {
            console.log("WalletProvider: window.ethereum accountsChanged", accounts);
            if (accounts.length === 0) {
                disconnectWalletAndReset();
            } else {
                // This will re-trigger provider state update
                setProviderState(window.ethereum); 
            }
        };
        const handleChainChanged = (_chainIdHex) => {
            console.log("WalletProvider: window.ethereum chainChanged", _chainIdHex);
            // This will re-trigger provider state update
            setProviderState(window.ethereum); 
        };

        window.ethereum.on('accountsChanged', handleAccountsChanged);
        window.ethereum.on('chainChanged', handleChainChanged);

        return () => {
            window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
            window.ethereum.removeListener('chainChanged', handleChainChanged);
        };
    }, [setProviderState, disconnectWalletAndReset]); // Include all dependencies

    // Web3Modal provider subscription
    useEffect(() => {
        let unsubscribeModal;
        if (web3Modal) {
            unsubscribeModal = web3Modal.subscribeProvider(async ({ provider: modalProvider, isConnected }) => {
                console.log("WalletProvider: Web3Modal subscribeProvider update:", { isConnected, modalProviderExists: !!modalProvider });
                if (isConnected && modalProvider) {
                    await setProviderState(modalProvider); // modalProvider is an EIP-1193 provider
                } else if (!isConnected && !walletAddress && !signer) { 
                    // Only fully disconnect if we are not already connected via window.ethereum
                    // and if Web3Modal signals a true disconnect (no address).
                    console.log("WalletProvider: Web3Modal signaled disconnect, and no active walletAddress.");
                    await disconnectWalletAndReset();
                }
            });
        }
        return () => unsubscribeModal?.();
    }, [web3Modal, setProviderState, disconnectWalletAndReset, walletAddress, signer]); // Added walletAddress and signer to dependencies
    
    const connectWallet = useCallback(async () => {
        if (!web3Modal) {
            console.error("WalletProvider: Web3Modal not initialized. Cannot open.");
            return;
        }
        console.log("WalletProvider: Opening Web3Modal.");
        await web3Modal.open();
        // The subscribeProvider effect will handle the connection state
    }, [web3Modal]);

    const contextValue = useMemo(() => ({
        walletAddress, 
        signer, 
        contract, 
        chainId: currentChainId, 
        provider,
        isInitialized, 
        loadedTargetChainIdNum: defaultTargetChainIdNum,
        web3ModalInstanceExists: !!web3Modal,
        connectWallet, 
        disconnectWallet: disconnectWalletAndReset, // Use the renamed function
        nativeTokenSymbol
    }), [
        walletAddress, signer, contract, currentChainId, provider, 
        isInitialized, defaultTargetChainIdNum, web3Modal, connectWallet, 
        disconnectWalletAndReset, nativeTokenSymbol
    ]);
    
    return (
        <WalletContext.Provider value={contextValue}>
            {isInitialized ? children : (
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: '#282c34', color: 'white', fontSize: '1.5rem' }}>
                    Initializing PiOracle...
                </div>
            )}
        </WalletContext.Provider>
    );
}