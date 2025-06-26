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

// Assuming these functions are correctly defined in your contractConfig.js
import { 
    getPredictionMarketAbi,     // Specific ABI for PredictionMarketP2P
    getTargetChainIdHex,        // For Web3Modal's defaultChainId
    getAllSupportedChainsForModal, // For Web3Modal's `chains` array
    getConfigForChainId,        // To get chain-specific RPC and contract addresses
    getTippingJarAbi,           // ABI for TippingJar (if you need a tippingJar context)
    getBadgeAbi                 // ABI for Badge (if you need a badge context)
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
    const [provider, setProvider] = useState(null); // ethers.Web3Provider instance
    const [signer, setSigner] = useState(null);
    const [predictionMarketContract, setPredictionMarketContract] = useState(null); // Explicitly for PredictionMarket
    // Add states for other contract types if needed, e.g.:
    // const [tippingJarContract, setTippingJarContract] = useState(null);
    const [currentChainId, setCurrentChainId] = useState(null);
    const [web3Modal, setWeb3Modal] = useState(null);
    const [nativeTokenSymbol, setNativeTokenSymbol] = useState("ETH"); // Default

    const defaultTargetChainIdNum = useMemo(() => {
        const hex = getTargetChainIdHex(); // From VITE_NETWORK_TARGET
        return hex ? parseInt(hex, 16) : null;
    }, []);

    const getSymbolForChain = useCallback((id) => {
        if (!id) return "ETH"; 
        const numId = Number(id);
        if (numId === 56 || numId === 97) return "BNB";    // BNB Mainnet & Testnet
        if (numId === 137 || numId === 80002) return "MATIC"; // Polygon Mainnet & Amoy
        return "ETH"; 
    }, []);

    // Initialize Web3Modal
    useEffect(() => {
        if (WALLETCONNECT_PROJECT_ID) {
            const supportedChains = getAllSupportedChainsForModal();
            if (!supportedChains || supportedChains.length === 0) {
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
            });
            setWeb3Modal(modal);
            console.log("WalletProvider: Web3Modal initialized.");
        }
    }, [defaultTargetChainIdNum]); // Runs once based on initial config

    // Initializes the PredictionMarket contract instance for the ACTUAL connected network
    const initializePredictionMarketContract = useCallback((signerOrProvider, actualChainId) => {
        if (!actualChainId) {
            setPredictionMarketContract(null);
            console.log("WalletProvider: No actualChainId, PredictionMarket contract set to null.");
            return;
        }
        const currentNetworkConfig = getConfigForChainId(actualChainId);
        console.log(`WalletProvider: initializePredictionMarketContract - For chain ${actualChainId}, Config found:`, currentNetworkConfig); // Log the whole config
const pmContractAddress = currentNetworkConfig?.predictionMarketContractAddress;
console.log(`WalletProvider: initializePredictionMarketContract - PM Address to use: ${pmContractAddress}`);

        
        if (signerOrProvider && currentNetworkConfig && currentNetworkConfig.predictionMarketContractAddress) {
            try {
                const newPmContract = new ethers.Contract(
                    currentNetworkConfig.predictionMarketContractAddress,
                    getPredictionMarketAbi(),
                    signerOrProvider
                );
                setPredictionMarketContract(newPmContract);
                console.log(`WalletProvider: PredictionMarket Contract INITIALIZED for address ${currentNetworkConfig.predictionMarketContractAddress} on chain ${actualChainId}`);
            } catch (e) {
                 console.error(`WalletProvider: Error initializing PredictionMarket contract for chain ${actualChainId}`, e);
                 setPredictionMarketContract(null);
            }
        } else {
            setPredictionMarketContract(null);
            console.log(`WalletProvider: PredictionMarket Contract set to null. Conditions not met. Provider/Signer: ${!!signerOrProvider}, Config: ${!!currentNetworkConfig}, PM Address: ${currentNetworkConfig?.predictionMarketContractAddress}`);
        }
    }, []); // getPredictionMarketAbi is stable

    // Function to initialize TippingJar contract (example)
    // const initializeTippingJarContract = useCallback((signerOrProvider, actualChainId) => {
    //     if (!actualChainId) { setTippingJarContract(null); return; }
    //     const config = getConfigForChainId(actualChainId);
    //     if (signerOrProvider && config && config.tippingJarContractAddress) {
    //         setTippingJarContract(new ethers.Contract(config.tippingJarContractAddress, getTippingJarAbi(), signerOrProvider));
    //         console.log(`WalletProvider: TippingJar Contract INITIALIZED for ${config.tippingJarContractAddress} on chain ${actualChainId}`);
    //     } else {
    //         setTippingJarContract(null);
    //     }
    // }, []);


    // Sets provider, signer, address, chainId, symbol, and initializes contracts
    const setProviderState = useCallback(async (eip1193Provider) => {
        try {
            const web3Provider = new ethers.providers.Web3Provider(eip1193Provider, 'any');
            const network = await web3Provider.getNetwork();
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
                initializePredictionMarketContract(currentSigner, network.chainId);
                // initializeTippingJarContract(currentSigner, network.chainId); // If you add tipping jar context
            } else {
                setSigner(null);
                const activeChainIdForReadOnly = network.chainId || defaultTargetChainIdNum;
                const currentNetworkConfig = getConfigForChainId(activeChainIdForReadOnly);
                if (currentNetworkConfig && currentNetworkConfig.rpcUrl) {
                    const readOnlyProvider = new ethers.providers.JsonRpcProvider(currentNetworkConfig.rpcUrl);
                    initializePredictionMarketContract(readOnlyProvider, activeChainIdForReadOnly);
                    // initializeTippingJarContract(readOnlyProvider, activeChainIdForReadOnly);
                } else {
                     initializePredictionMarketContract(null, null);
                     // initializeTippingJarContract(null, null);
                }
            }
        } catch (error) {
            console.error("WalletProvider: Error in setProviderState:", error);
            setWalletAddress(null); setSigner(null); setCurrentChainId(null); setNativeTokenSymbol("ETH"); 
            setPredictionMarketContract(null); 
            // setTippingJarContract(null);
        }
    }, [initializePredictionMarketContract, getSymbolForChain, defaultTargetChainIdNum]); // Added initializeTippingJarContract if used

    // Handles disconnecting the wallet and resetting to a default read-only state
    const disconnectWalletAndReset = useCallback(async () => {
        console.log("WalletProvider: disconnectWalletAndReset called.");
        try {
            const modalProvider = web3Modal?.getWalletProvider?.();
            if (modalProvider && typeof modalProvider.disconnect === 'function') {
                await modalProvider.disconnect();
                console.log("WalletProvider: Called disconnect on Web3Modal's wallet provider.");
            } else if (provider?.provider && typeof provider.provider.disconnect === 'function') {
                await provider.provider.disconnect();
                console.log("WalletProvider: Called disconnect on provider.provider (fallback).");
            }
            
            if (web3Modal && typeof web3Modal.disconnect === 'function') { // For newer W3M standalone
                 await web3Modal.disconnect();
                 console.log("WalletProvider: Called disconnect on web3Modal instance itself.");
            }

            if (web3Modal?.isOpen?.()) { // Check if function exists before calling
                 await web3Modal.closeModal();
                 console.log("WalletProvider: Attempted to close Web3Modal.");
            }
        } catch (e) {
            console.warn("WalletProvider: Error during disconnect/reset attempt:", e);
        }

        setWalletAddress(null);
        setSigner(null);
        
        const defaultChainConfig = getConfigForChainId(defaultTargetChainIdNum);
        if (defaultChainConfig && defaultChainConfig.rpcUrl) {
            try {
                const defaultJsonRpcProvider = new ethers.providers.JsonRpcProvider(defaultChainConfig.rpcUrl);
                setProvider(defaultJsonRpcProvider); // Set the main provider
                const net = await defaultJsonRpcProvider.getNetwork();
                setCurrentChainId(net.chainId);
                setNativeTokenSymbol(getSymbolForChain(net.chainId));
                initializePredictionMarketContract(defaultJsonRpcProvider, net.chainId); 
                // initializeTippingJarContract(defaultJsonRpcProvider, net.chainId);
                console.log("WalletProvider: Reset to default read-only provider for chainId:", net.chainId);
            } catch (e) {
                console.error("WalletProvider: Error setting up default provider on disconnect:", e);
                setProvider(null); setCurrentChainId(null); setNativeTokenSymbol("ETH"); 
                initializePredictionMarketContract(null, null);
                // initializeTippingJarContract(null, null);
            }
        } else {
            console.warn("WalletProvider: No default RPC/Config for disconnect fallback.");
            setProvider(null); setCurrentChainId(null); setNativeTokenSymbol("ETH"); 
            initializePredictionMarketContract(null, null);
            // initializeTippingJarContract(null, null);
        }
    }, [web3Modal, provider, defaultTargetChainIdNum, initializePredictionMarketContract, getSymbolForChain]);


    // Initial setup effect
    useEffect(() => {
        const setup = async () => {
            console.log("WalletProvider: Initial setup effect running.");
            if (typeof window.ethereum !== 'undefined') {
                try {
                    const accounts = await window.ethereum.request({ method: 'eth_accounts' });
                    if (accounts.length > 0) {
                        await setProviderState(window.ethereum);
                    } else {
                        await disconnectWalletAndReset();
                    }
                } catch (e) { 
                    console.error("WalletProvider: Error during window.ethereum initial check:", e);
                    await disconnectWalletAndReset(); 
                }
            } else {
                await disconnectWalletAndReset();
            }
            setIsInitialized(true);
            console.log("WalletProvider: Initialization sequence complete.");
        };
        
        if (!isInitialized && web3Modal) { 
            setup();
        } else if (!web3Modal && WALLETCONNECT_PROJECT_ID && !isInitialized) {
            // If Web3Modal didn't initialize (e.g. no defaultTargetChainIdNum initially)
            // and we expect it, this might indicate an issue. For now, just log.
             console.warn("WalletProvider: Web3Modal not yet initialized in setup effect, but project ID exists.");
        } else if (!isInitialized && !WALLETCONNECT_PROJECT_ID) {
            // If no WC Project ID, we might still want to init with window.ethereum
            console.log("WalletProvider: No WalletConnect Project ID, attempting setup with window.ethereum if available.");
            setup();
        }

    }, [isInitialized, web3Modal, setProviderState, disconnectWalletAndReset]);
    
    // Event listeners for EIP-1193 provider (MetaMask etc.)
    useEffect(() => {
        if (typeof window.ethereum === 'undefined' || !window.ethereum.on) return; // Check for .on

        const handleAccountsChanged = (accounts) => {
            console.log("WalletProvider: window.ethereum accountsChanged", accounts);
            // If user disconnects all accounts from site via MetaMask
            if (accounts.length === 0) { 
                disconnectWalletAndReset();
            } else {
                // If accounts change, re-run setProviderState with the (potentially new) provider
                setProviderState(window.ethereum); 
            }
        };
        const handleChainChanged = (_chainIdHex) => {
            console.log("WalletProvider: window.ethereum chainChanged", _chainIdHex);
            // Chain changed, re-run setProviderState to update everything
            setProviderState(window.ethereum); 
        };

        window.ethereum.on('accountsChanged', handleAccountsChanged);
        window.ethereum.on('chainChanged', handleChainChanged);

        return () => {
            if (window.ethereum.removeListener) { // Check for removeListener
                window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
                window.ethereum.removeListener('chainChanged', handleChainChanged);
            }
        };
    }, [setProviderState, disconnectWalletAndReset]);

    // Web3Modal provider subscription
    useEffect(() => {
        let unsubscribeModal;
        if (web3Modal) {
            console.log("WalletProvider: Subscribing to Web3Modal provider updates.");
            unsubscribeModal = web3Modal.subscribeProvider(async ({ provider: modalProvider, isConnected, chainId: modalChainId, address: modalAddress }) => {
                console.log("WalletProvider: Web3Modal subscribeProvider update:", { isConnected, modalProviderExists: !!modalProvider, modalChainId, modalAddress });
                if (isConnected && modalProvider) {
                    // When Web3Modal provides a new provider (e.g., WalletConnect session starts, or EIP-6963 provider selected)
                    await setProviderState(modalProvider); 
                } else if (!isConnected && !walletAddress) { 
                    // Only trigger a full reset if we are truly disconnected and not just modal closed
                    console.log("WalletProvider: Web3Modal signaled disconnect AND no walletAddress, resetting.");
                    await disconnectWalletAndReset();
                } else if (!isConnected && walletAddress) {
                    console.log("WalletProvider: Web3Modal signaled isConnected:false, but walletAddress still exists. Modal might have just closed.");
                    // Potentially do nothing here, or check if provider is still valid.
                    // If `window.ethereum` was the source, it might still be connected.
                }
            });
        }
        return () => {
            if (unsubscribeModal) {
                unsubscribeModal();
                console.log("WalletProvider: Unsubscribed from Web3Modal provider updates.");
            }
        };
    }, [web3Modal, setProviderState, disconnectWalletAndReset, walletAddress]); // Added walletAddress
    
    const connectWallet = useCallback(async () => {
        if (!web3Modal) {
            console.error("WalletProvider: Web3Modal not initialized. Cannot open modal.");
            return;
        }
        console.log("WalletProvider: Opening Web3Modal for wallet connection.");
        await web3Modal.open();
    }, [web3Modal]);

    // This is the main contract instance passed to the app, currently PredictionMarket
    const mainContract = predictionMarketContract; 

    const contextValue = useMemo(() => ({
        walletAddress, 
        signer, 
        contract: mainContract, // Pass the specific contract instance
        // If you need other contracts, add them here:
        // tippingJarContract, 
        chainId: currentChainId, 
        provider,
        isInitialized, 
        loadedTargetChainIdNum: defaultTargetChainIdNum,
        web3ModalInstanceExists: !!web3Modal,
        connectWallet, 
        disconnectWallet: disconnectWalletAndReset,
        nativeTokenSymbol
    }), [
        walletAddress, signer, mainContract, /* tippingJarContract, */ currentChainId, provider, 
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