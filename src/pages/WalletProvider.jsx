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

// --- Import the CORRECT specific ABI getter and other necessary functions ---
import { 
    getPredictionMarketAbi,     // CORRECTED: Was getContractAbi
    getTargetChainIdHex,
    getAllSupportedChainsForModal,
    getConfigForChainId
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
    const [provider, setProvider] = useState(null);
    const [signer, setSigner] = useState(null);
    const [contract, setContract] = useState(null); // This will be the PredictionMarket contract
    const [currentChainId, setCurrentChainId] = useState(null);
    const [web3Modal, setWeb3Modal] = useState(null);
    const [nativeTokenSymbol, setNativeTokenSymbol] = useState("ETH");

    const defaultTargetChainIdNum = useMemo(() => {
        const hex = getTargetChainIdHex();
        return hex ? parseInt(hex, 16) : null;
    }, []);

    const getSymbolForChain = useCallback((id) => {
        if (!id) return "ETH"; 
        const numId = Number(id);
        if (numId === 56 || numId === 97) return "BNB";
        if (numId === 137 || numId === 80002) return "MATIC";
        return "ETH"; 
    }, []);

    useEffect(() => {
        if (WALLETCONNECT_PROJECT_ID) {
            const supportedChains = getAllSupportedChainsForModal();
            if (supportedChains.length === 0) {
                console.error("WalletProvider: No supported chains for Web3Modal.");
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
    }, [defaultTargetChainIdNum]);

    // THIS FUNCTION NOW INITIALIZES THE *PREDICTION MARKET* CONTRACT
    const initializePredictionMarketContract = useCallback((signerOrProvider, actualChainId) => {
        if (!actualChainId) {
            setContract(null);
            console.log("WalletProvider: No actualChainId, PredictionMarket contract set to null.");
            return;
        }
        const currentNetworkConfig = getConfigForChainId(actualChainId);
        
        // --- USE predictionMarketContractAddress and getPredictionMarketAbi ---
        if (signerOrProvider && currentNetworkConfig && currentNetworkConfig.predictionMarketContractAddress) {
            try {
                const newContract = new ethers.Contract(
                    currentNetworkConfig.predictionMarketContractAddress, // Address for PredictionMarket
                    getPredictionMarketAbi(),                             // ABI for PredictionMarket
                    signerOrProvider
                );
                setContract(newContract);
                console.log(`WalletProvider: PredictionMarket Contract INITIALIZED for address ${currentNetworkConfig.predictionMarketContractAddress} on chain ${actualChainId}`);
            } catch (e) {
                 console.error(`WalletProvider: Error initializing PredictionMarket contract for chain ${actualChainId}`, e);
                 setContract(null);
            }
        } else {
            setContract(null);
            console.log(`WalletProvider: PredictionMarket Contract set to null. Conditions not met. Provider/Signer: ${!!signerOrProvider}, Config: ${!!currentNetworkConfig}, PM Address: ${currentNetworkConfig?.predictionMarketContractAddress}`);
        }
    }, []); // getPredictionMarketAbi is stable

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
                initializePredictionMarketContract(currentSigner, network.chainId); // Initialize PM contract
            } else {
                setSigner(null);
                const activeChainIdForReadOnly = network.chainId || defaultTargetChainIdNum;
                const currentNetworkConfig = getConfigForChainId(activeChainIdForReadOnly);
                if (currentNetworkConfig && currentNetworkConfig.rpcUrl) {
                    const readOnlyProvider = new ethers.providers.JsonRpcProvider(currentNetworkConfig.rpcUrl);
                    initializePredictionMarketContract(readOnlyProvider, activeChainIdForReadOnly); // Initialize PM contract
                } else {
                     initializePredictionMarketContract(null, null);
                }
            }
        } catch (error) {
            console.error("WalletProvider: Error in setProviderState:", error);
            setWalletAddress(null); setSigner(null); setCurrentChainId(null); setNativeTokenSymbol("ETH"); setContract(null);
        }
    }, [initializePredictionMarketContract, getSymbolForChain, defaultTargetChainIdNum]);

    const disconnectWalletAndReset = useCallback(async () => {
        console.log("WalletProvider: disconnectWalletAndReset called.");
        try {
            if (web3Modal?.isOpen?.()) await web3Modal.closeModal();
            if (provider?.provider?.disconnect) await provider.provider.disconnect();
        } catch (e) { console.warn("WalletProvider: Error during disconnect attempt:", e); }

        setWalletAddress(null); setSigner(null);
        
        const defaultChainConfig = getConfigForChainId(defaultTargetChainIdNum);
        if (defaultChainConfig && defaultChainConfig.rpcUrl) {
            try {
                const defaultJsonRpcProvider = new ethers.providers.JsonRpcProvider(defaultChainConfig.rpcUrl);
                setProvider(defaultJsonRpcProvider);
                const net = await defaultJsonRpcProvider.getNetwork();
                setCurrentChainId(net.chainId);
                setNativeTokenSymbol(getSymbolForChain(net.chainId));
                initializePredictionMarketContract(defaultJsonRpcProvider, net.chainId); // Initialize PM contract
                 console.log("WalletProvider: Reset to default read-only provider for PM contract on chainId:", net.chainId);
            } catch (e) {
                console.error("WalletProvider: Error setting up default provider on disconnect:", e);
                 setProvider(null); setCurrentChainId(null); setNativeTokenSymbol("ETH"); initializePredictionMarketContract(null, null);
            }
        } else {
            console.warn("WalletProvider: No default RPC/Config for disconnect fallback.");
            setProvider(null); setCurrentChainId(null); setNativeTokenSymbol("ETH"); initializePredictionMarketContract(null, null);
        }
    }, [web3Modal, provider, defaultTargetChainIdNum, initializePredictionMarketContract, getSymbolForChain]);

    useEffect(() => {
        const setup = async () => {
            console.log("WalletProvider: Initial setup effect.");
            if (typeof window.ethereum !== 'undefined') {
                try {
                    const accounts = await window.ethereum.request({ method: 'eth_accounts' });
                    if (accounts.length > 0) {
                        await setProviderState(window.ethereum);
                    } else {
                        await disconnectWalletAndReset();
                    }
                } catch (e) { await disconnectWalletAndReset(); }
            } else { await disconnectWalletAndReset(); }
            setIsInitialized(true);
            console.log("WalletProvider: Initialization sequence complete.");
        };
        if (!isInitialized && web3Modal) { setup(); }
    }, [isInitialized, web3Modal, setProviderState, disconnectWalletAndReset]);
    
    useEffect(() => {
        if (typeof window.ethereum === 'undefined') return;
        const handleAccountsChanged = (accounts) => accounts.length === 0 ? disconnectWalletAndReset() : setProviderState(window.ethereum);
        const handleChainChanged = () => setProviderState(window.ethereum);
        window.ethereum.on('accountsChanged', handleAccountsChanged);
        window.ethereum.on('chainChanged', handleChainChanged);
        return () => {
            window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
            window.ethereum.removeListener('chainChanged', handleChainChanged);
        };
    }, [setProviderState, disconnectWalletAndReset]);

    useEffect(() => {
        let unsubscribeModal;
        if (web3Modal) {
            unsubscribeModal = web3Modal.subscribeProvider(async ({ provider: modalProvider, isConnected }) => {
                if (isConnected && modalProvider) {
                    await setProviderState(modalProvider);
                } else if (!isConnected && !walletAddress && !signer) { 
                    await disconnectWalletAndReset();
                }
            });
        }
        return () => unsubscribeModal?.();
    }, [web3Modal, setProviderState, disconnectWalletAndReset, walletAddress, signer]);
    
    const connectWallet = useCallback(async () => {
        if (!web3Modal) return;
        await web3Modal.open();
    }, [web3Modal]);

    const contextValue = useMemo(() => ({
        walletAddress, signer, contract, chainId: currentChainId, provider,
        isInitialized, loadedTargetChainIdNum: defaultTargetChainIdNum,
        web3ModalInstanceExists: !!web3Modal,
        connectWallet, disconnectWallet: disconnectWalletAndReset,
        nativeTokenSymbol
    }), [
        walletAddress, signer, contract, currentChainId, provider, 
        isInitialized, defaultTargetChainIdNum, web3Modal, connectWallet, 
        disconnectWalletAndReset, nativeTokenSymbol
    ]);
    
    return (
        <WalletContext.Provider value={contextValue}>
            {isInitialized ? children : (
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', /* ... */ }}>
                    Initializing PiOracle...
                </div>
            )}
        </WalletContext.Provider>
    );
}