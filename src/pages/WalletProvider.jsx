// src/pages/WalletProvider.jsx
import React, {
    createContext,
    useState,
    useEffect,
    useCallback,
    useMemo
} from 'react';
import { ethers } from 'ethers';
// --- CORRECT IMPORTS ---
import { createWeb3Modal, defaultConfig } from '@web3modal/ethers5';
import { getContractAddress, getContractAbi, getRpcUrl, getTargetChainIdHex, getChainName, getCurrencySymbol, getExplorerUrl } from '../config/contractConfig';

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
    const [chainId, setChainId] = useState(null);
    const [web3Modal, setWeb3Modal] = useState(null);
    const [nativeTokenSymbol, setNativeTokenSymbol] = useState("ETH");

    const loadedTargetChainIdNum = useMemo(() => {
        const hex = getTargetChainIdHex();
        return hex ? parseInt(hex, 16) : null;
    }, []);

    const getSymbolForChain = (id) => {
    if (!id) return "ETH"; 

    // BNB Chain (Mainnet and Testnet)
    if (id === 56 || id === 97) return "BNB";

    // Polygon (Mainnet and Amoy Testnet)
    if (id === 137 || id === 80002) return "MATIC";
    
    // Default for Ethereum, Localhost, etc.
    return "ETH"; 
};

    // Effect 1: Initialize Web3Modal instance - FINAL CORRECTED VERSION
    useEffect(() => {
        if (WALLETCONNECT_PROJECT_ID && loadedTargetChainIdNum) {
            
            // --- THIS IS THE CRITICAL FIX ---
            // We create the ethersConfig FIRST, ensuring it is not undefined.
            const ethersConfig = defaultConfig({
                metadata,
                // Add a fallback for defaultChainId to prevent crashes
                defaultChainId: loadedTargetChainIdNum || 1, 
            });

            const modal = createWeb3Modal({
                ethersConfig, // Pass the created config here
                chains: [{
                    chainId: loadedTargetChainIdNum,
                    name: getChainName(),
                    currency: getCurrencySymbol(),
                    explorerUrl: getExplorerUrl(),
                    rpcUrl: getRpcUrl()
                }],
                projectId: WALLETCONNECT_PROJECT_ID,
                enableAnalytics: false,
            });
            setWeb3Modal(modal);
        }
    }, [loadedTargetChainIdNum]);

    const initializeContract = useCallback((signerOrProvider) => {
        const address = getContractAddress();
        if (signerOrProvider && address) {
            setContract(new ethers.Contract(address, getContractAbi(), signerOrProvider));
        } else {
            setContract(null);
        }
    }, []);

    const setProviderState = useCallback(async (eip1193Provider) => {
        const web3Provider = new ethers.providers.Web3Provider(eip1193Provider, 'any');
        const accounts = await web3Provider.listAccounts();
        const network = await web3Provider.getNetwork();

        setProvider(web3Provider);
        setChainId(network.chainId);
        setNativeTokenSymbol(getSymbolForChain(network.chainId));

        if (accounts.length > 0) {
            setWalletAddress(ethers.utils.getAddress(accounts[0]));
        } else {
            setWalletAddress(null);
        }
    }, []);

    const disconnect = useCallback(() => {
        const rpcUrl = getRpcUrl();
        const defaultProvider = new ethers.providers.JsonRpcProvider(rpcUrl);
        setWalletAddress(null);
        setSigner(null);
        setProvider(defaultProvider);
        defaultProvider.getNetwork().then(net => {
            setChainId(net.chainId);
            setNativeTokenSymbol(getSymbolForChain(net.chainId));
        });
        initializeContract(defaultProvider);
    }, [initializeContract]);

    useEffect(() => {
        const setup = async () => {
            try {
                if (window.ethereum) {
                    const accounts = await window.ethereum.request({ method: 'eth_accounts' });
                    if (accounts.length > 0) {
                        await setProviderState(window.ethereum);
                    } else { disconnect(); }
                } else { disconnect(); }
            } catch (e) { disconnect(); }
            finally { setIsInitialized(true); }
        };
        setup();
    }, [setProviderState, disconnect]);
    
    useEffect(() => {
        const handleAccountsChanged = (accounts) => { accounts.length === 0 ? disconnect() : setProviderState(window.ethereum); };
        const handleChainChanged = () => setProviderState(window.ethereum);
        const handleDisconnect = () => disconnect();

        if (window.ethereum) {
            window.ethereum.on('accountsChanged', handleAccountsChanged);
            window.ethereum.on('chainChanged', handleChainChanged);
            window.ethereum.on('disconnect', handleDisconnect);
        }
        return () => {
            if (window.ethereum) {
                window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
                window.ethereum.removeListener('chainChanged', handleChainChanged);
                window.ethereum.removeListener('disconnect', handleDisconnect);
            }
        };
    }, [setProviderState, disconnect]);

    useEffect(() => {
        if (provider && walletAddress && chainId === loadedTargetChainIdNum) {
            const currentSigner = provider.getSigner();
            setSigner(currentSigner);
            initializeContract(currentSigner);
        } else if (provider) {
            setSigner(null);
            initializeContract(provider);
        }
    }, [provider, walletAddress, chainId, loadedTargetChainIdNum, initializeContract]);
    
    const connectWallet = useCallback(async () => {
        if (!web3Modal) return;
        await web3Modal.open();
    }, [web3Modal]);

    const contextValue = useMemo(() => ({
        walletAddress, signer, contract, chainId, provider,
        isInitialized, loadedTargetChainIdNum,
        web3ModalInstanceExists: !!web3Modal,
        connectWallet, disconnectWallet: disconnect,
        nativeTokenSymbol
    }), [walletAddress, signer, contract, chainId, provider, isInitialized, loadedTargetChainIdNum, web3Modal, connectWallet, disconnect, nativeTokenSymbol]);
    
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