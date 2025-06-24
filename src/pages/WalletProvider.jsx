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

// --- Import the NEW function and existing getters ---
import { 
    getContractAddress, 
    getContractAbi, 
    getTargetChainIdHex, // For defaultChainId
    getAllSupportedChainsForModal // NEWLY IMPORTED
} from '../config/contractConfig'; // Assuming contractConfig is in this path

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
    const [provider, setProvider] = useState(null);
    const [signer, setSigner] = useState(null);
    const [contract, setContract] = useState(null);
    const [currentChainId, setCurrentChainId] = useState(null); // Renamed from chainId for clarity
    const [web3Modal, setWeb3Modal] = useState(null);
    const [nativeTokenSymbol, setNativeTokenSymbol] = useState("ETH"); // Will be updated

    // This is the default chainId based on VITE_NETWORK_TARGET
    const defaultTargetChainIdNum = useMemo(() => {
        const hex = getTargetChainIdHex();
        return hex ? parseInt(hex, 16) : null;
    }, []);

    const getSymbolForChain = useCallback((id) => { // Made it useCallback
        if (!id) return "ETH"; 
        if (id === 56 || id === 97) return "BNB";
        if (id === 137 || id === 80002) return "MATIC";
        return "ETH"; 
    }, []);

    // Effect 1: Initialize Web3Modal instance
    useEffect(() => {
        if (WALLETCONNECT_PROJECT_ID) {
            const supportedChains = getAllSupportedChainsForModal();
            if (supportedChains.length === 0) {
                console.error("WalletProvider: No supported chains found for Web3Modal from contractConfig.");
                return;
            }

            const ethersConfig = defaultConfig({
                metadata,
                defaultChainId: defaultTargetChainIdNum || supportedChains[0].chainId, 
            });

            const modal = createWeb3Modal({
                ethersConfig,
                chains: supportedChains, // <-- USE THE ARRAY OF ALL SUPPORTED CHAINS
                projectId: WALLETCONNECT_PROJECT_ID,
                enableAnalytics: false,
                // You can define which chains are "recommended" if a user lands on an unsupported one
                // recommendedChains: [137, 56] // Example: Polygon Mainnet, BNB Mainnet
            });
            setWeb3Modal(modal);
            console.log("WalletProvider: Web3Modal initialized with chains:", supportedChains);
        }
    }, [defaultTargetChainIdNum]); // Re-run if default target changes, though WALLETCONNECT_PROJECT_ID is main trigger

    // Initialize contract based on the CURRENT connected provider/signer's network
    const initializeContractForCurrentNetwork = useCallback((signerOrProvider, actualChainId) => {
        // We need to get the contract address for the SPECIFIC connected chain,
        // not just the VITE_NETWORK_TARGET.
        // This requires a modification to contractConfig.js or a new approach.

        // TEMPORARY: For now, this still uses getContractAddress() which is tied to VITE_NETWORK_TARGET.
        // This part needs refinement if you want the 'contract' object to dynamically switch
        // based on MetaMask's network. For now, it will always be the contract of VITE_NETWORK_TARGET.
        // A more robust solution involves a contract address map in contractConfig.
        const address = getContractAddress(); // THIS WILL BE THE ADDRESS OF VITE_NETWORK_TARGET

        // A better approach for a truly dynamic contract object:
        // const allConfigs = getAllSupportedChainsForModal();
        // const currentNetworkConfig = allConfigs.find(c => c.chainId === actualChainId);
        // const address = currentNetworkConfig ? currentNetworkConfig.contractAddress : null; 
        // (This would require contractAddress to be part of getAllSupportedChainsForModal items)


        if (signerOrProvider && address) {
            setContract(new ethers.Contract(address, getContractAbi(), signerOrProvider));
            console.log(`WalletProvider: Contract initialized for address ${address} on chain ${actualChainId}`);
        } else {
            setContract(null);
            console.log("WalletProvider: Contract set to null (no provider/signer or address).");
        }
    }, []); // Removed dependency on getContractAddress, getContractAbi for stability

    const setProviderState = useCallback(async (eip1193Provider) => {
        try {
            const web3Provider = new ethers.providers.Web3Provider(eip1193Provider, 'any');
            const accounts = await web3Provider.listAccounts();
            const network = await web3Provider.getNetwork();
            const connectedAddress = accounts.length > 0 ? ethers.utils.getAddress(accounts[0]) : null;

            setProvider(web3Provider);
            setCurrentChainId(network.chainId);
            setNativeTokenSymbol(getSymbolForChain(network.chainId));
            setWalletAddress(connectedAddress);

            if (connectedAddress) {
                const currentSigner = web3Provider.getSigner();
                setSigner(currentSigner);
                initializeContractForCurrentNetwork(currentSigner, network.chainId);
            } else {
                setSigner(null);
                // Initialize with a read-only provider for the default network if no account connected
                const rpcForDefault = getAllSupportedChainsForModal().find(c=>c.chainId === defaultTargetChainIdNum)?.rpcUrl || getAllSupportedChainsForModal()[0]?.rpcUrl;
                if(rpcForDefault) {
                    const defaultJsonRpcProvider = new ethers.providers.JsonRpcProvider(rpcForDefault);
                    initializeContractForCurrentNetwork(defaultJsonRpcProvider, defaultTargetChainIdNum || getAllSupportedChainsForModal()[0]?.chainId);
                } else {
                    initializeContractForCurrentNetwork(null, null);
                }
            }
            console.log(`WalletProvider: Provider state set. Chain: ${network.chainId}, Address: ${connectedAddress}`);
        } catch (error) {
            console.error("WalletProvider: Error in setProviderState:", error);
            // Handle error, perhaps by disconnecting
        }
    }, [initializeContractForCurrentNetwork, getSymbolForChain, defaultTargetChainIdNum]);

    const disconnectWalletAndReset = useCallback(() => { // Renamed for clarity
        console.log("WalletProvider: Disconnecting wallet and resetting state.");
        web3Modal?.disconnect(); // If Web3Modal has a disconnect method
        setWalletAddress(null);
        setSigner(null);
        // Keep provider for read-only on default network, or set to null if preferred
        // For now, let's re-initialize with a default read-only provider
        const rpcForDefault = getAllSupportedChainsForModal().find(c=>c.chainId === defaultTargetChainIdNum)?.rpcUrl || getAllSupportedChainsForModal()[0]?.rpcUrl;
        if(rpcForDefault) {
            const defaultJsonRpcProvider = new ethers.providers.JsonRpcProvider(rpcForDefault);
            setProvider(defaultJsonRpcProvider);
            defaultJsonRpcProvider.getNetwork().then(net => {
                setCurrentChainId(net.chainId);
                setNativeTokenSymbol(getSymbolForChain(net.chainId));
                initializeContractForCurrentNetwork(defaultJsonRpcProvider, net.chainId);
            });
        } else {
            setProvider(null);
            setCurrentChainId(null);
            setNativeTokenSymbol("ETH");
            initializeContractForCurrentNetwork(null, null);
        }
    }, [web3Modal, initializeContractForCurrentNetwork, getSymbolForChain, defaultTargetChainIdNum]);

    // Initial setup effect
    useEffect(() => {
        const setup = async () => {
            console.log("WalletProvider: Initial setup effect running.");
            try {
                // EIP-6963: WalletConnect and other providers announce themselves here
                // For initial load, we can try to use an existing provider if one was already connected
                // or if MetaMask is the only provider (window.ethereum)
                if (window.ethereum) { // Check if MetaMask or similar EIP-1193 provider exists
                    // Attempt to get accounts. If user was previously connected, this might return accounts.
                    const accounts = await window.ethereum.request({ method: 'eth_accounts' });
                    if (accounts.length > 0) {
                        console.log("WalletProvider: Found existing connected accounts via window.ethereum.");
                        await setProviderState(window.ethereum);
                    } else {
                        console.log("WalletProvider: No pre-connected accounts found. Setting up default read-only provider.");
                        disconnectWalletAndReset(); // Sets up default provider
                    }
                } else {
                    console.log("WalletProvider: No window.ethereum. Setting up default read-only provider.");
                    disconnectWalletAndReset(); // Sets up default provider
                }
            } catch (e) {
                console.error("WalletProvider: Error during initial setup:", e);
                disconnectWalletAndReset(); // Fallback to default
            } finally {
                setIsInitialized(true);
                console.log("WalletProvider: Initialization complete.");
            }
        };
        if (web3Modal) { // Only run setup if Web3Modal is ready
            setup();
        }
    }, [web3Modal, setProviderState, disconnectWalletAndReset]); // Depend on web3Modal
    
    // Event listeners for wallet changes
    useEffect(() => {
        if (window.ethereum) { // Or your specific EIP-1193 provider from Web3Modal
            const handleAccountsChanged = (accounts) => {
                console.log("WalletProvider: accountsChanged event", accounts);
                if (accounts.length === 0) {
                    disconnectWalletAndReset();
                } else {
                    setProviderState(window.ethereum); // Re-initialize with the new account
                }
            };
            const handleChainChanged = (_chainIdHex) => {
                console.log("WalletProvider: chainChanged event", _chainIdHex);
                setProviderState(window.ethereum); // Re-initialize with the new chain
            };
            const handleDisconnect = () => { // Some wallets emit this
                console.log("WalletProvider: disconnect event");
                disconnectWalletAndReset();
            };

            window.ethereum.on('accountsChanged', handleAccountsChanged);
            window.ethereum.on('chainChanged', handleChainChanged);
            window.ethereum.on('disconnect', handleDisconnect); // For providers like MetaMask

            return () => {
                window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
                window.ethereum.removeListener('chainChanged', handleChainChanged);
                window.ethereum.removeListener('disconnect', handleDisconnect);
            };
        }
    }, [setProviderState, disconnectWalletAndReset]); // Dependencies

    // This effect is for when Web3Modal itself provides a provider
    // (e.g., after user selects WalletConnect)
    useEffect(() => {
        let unsubscribe;
        if (web3Modal) {
            unsubscribe = web3Modal.subscribeProvider(async ({ provider: modalProvider, chainId: modalChainId, address: modalAddress, isConnected }) => {
                console.log("WalletProvider: Web3Modal subscribeProvider event", { modalProvider, modalChainId, modalAddress, isConnected });
                if (isConnected && modalProvider && modalAddress && modalChainId) {
                    // Wrap the EIP-1193 provider from Web3Modal with ethers.Web3Provider
                    await setProviderState(modalProvider);
                } else if (!isConnected && !modalAddress) {
                    // This means the user disconnected via Web3Modal
                    disconnectWalletAndReset();
                }
            });
        }
        return () => unsubscribe?.();
    }, [web3Modal, setProviderState, disconnectWalletAndReset]);
    
    const connectWallet = useCallback(async () => {
        if (!web3Modal) {
            console.error("WalletProvider: Web3Modal not initialized. Cannot connect.");
            return;
        }
        console.log("WalletProvider: Opening Web3Modal for connection.");
        await web3Modal.open();
        // The subscription above will handle setting provider state
    }, [web3Modal]);

    const contextValue = useMemo(() => ({
        walletAddress, 
        signer, 
        contract, 
        chainId: currentChainId, // Use the state variable that reflects the actual connected chain
        provider,
        isInitialized, 
        loadedTargetChainIdNum: defaultTargetChainIdNum, // This is the default target
        web3ModalInstanceExists: !!web3Modal,
        connectWallet, 
        disconnectWallet: disconnectWalletAndReset,
        nativeTokenSymbol
    }), [walletAddress, signer, contract, currentChainId, provider, isInitialized, defaultTargetChainIdNum, web3Modal, connectWallet, disconnectWalletAndReset, nativeTokenSymbol]);
    
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