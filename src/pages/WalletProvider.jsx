// src/pages/WalletProvider.jsx
import React, { createContext, useState, useEffect, useCallback, useMemo } from 'react';
import { ethers } from 'ethers'; // v5
import { createWeb3Modal, defaultConfig } from '@web3modal/ethers5';
import { 
    getAllSupportedChainsForModal,
    getConfigForChainId,
    getPredictionMarketAbi, // Assuming this is your primary contract ABI
    getContractAbi,         // Generic getter if needed
    getTargetChainIdHex
} from '../config/contractConfig';

export const WalletContext = createContext(null);

const WALLETCONNECT_PROJECT_ID = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID;

const metadata = {
    name: "Pioracle.online",
    description: "Decentralized Prediction Markets",
    url: "https://pioracle.online",
    icons: ["https://pioracle.online/pioracle_logo_eyes_only_192.png"],
};

// Initialize Web3Modal once, outside the component, as it's a singleton
const supportedChainsForModal = getAllSupportedChainsForModal();
const ethersConfig = defaultConfig({ metadata });
const web3Modal = createWeb3Modal({
    ethersConfig,
    chains: supportedChainsForModal,
    projectId: WALLETCONNECT_PROJECT_ID,
});

export function WalletProvider({ children }) {
    const [isInitialized, setIsInitialized] = useState(false);
    const [provider, setProvider] = useState(null);
    const [signer, setSigner] = useState(null);
    const [contract, setContract] = useState(null); // This is your primary PredictionMarket contract
    const [chainId, setChainId] = useState(null);
    const [walletAddress, setWalletAddress] = useState(null);
    const [nativeTokenSymbol, setNativeTokenSymbol] = useState("ETH");

    // This function is the new engine of your provider.
    // It configures the entire context for a specific chainId.
    const setupProviderForChain = useCallback(async (newChainId, newProvider = null, newSigner = null) => {
        console.log(`Setting up provider for chainId: ${newChainId}`);
        const chainConfig = getConfigForChainId(newChainId);

        if (!chainConfig) {
            console.error(`WalletProvider: No configuration found for chainId: ${newChainId}. Cannot set up provider.`);
            // Reset state to avoid using stale data
            setProvider(null); setSigner(null); setContract(null); setChainId(null); setNativeTokenSymbol("ETH");
            return;
        }

        // Use the new provider if it's from a wallet, otherwise create a read-only one from RPC URL
        const providerToUse = newProvider || new ethers.providers.JsonRpcProvider(chainConfig.rpcUrl);
        const contractAddress = chainConfig.predictionMarketContractAddress; // Or your primary contract address
        
        // Ensure a contract can be initialized
        if (contractAddress) {
            const abi = getPredictionMarketAbi(); // Or a more generic getContractAbi('predictionMarket')
            const contractInstance = new ethers.Contract(contractAddress, abi, newSigner || providerToUse);
            setContract(contractInstance);
             console.log(`WalletProvider: Contract initialized for ${contractAddress} on chain ${newChainId}`);
        } else {
            setContract(null);
            console.log(`WalletProvider: No contract address for chainId ${newChainId}, contract set to null.`);
        }

        setChainId(newChainId);
        setProvider(providerToUse);
        setSigner(newSigner);
        setNativeTokenSymbol(chainConfig.symbol);
    }, []);

    // Effect for initial setup and listening to Web3Modal events
    useEffect(() => {
        // Set up a read-only provider for the default network on initial load
        const defaultChainId = parseInt(getTargetChainIdHex(), 16);
        if (!isInitialized) {
             console.log("WalletProvider: Initializing with default read-only provider for chainId:", defaultChainId);
            setupProviderForChain(defaultChainId).finally(() => setIsInitialized(true));
        }

        const unsubscribe = web3Modal.subscribeProvider(async ({ provider, address, chainId, isConnected }) => {
            console.log("WalletProvider: Web3Modal state changed:", { isConnected, address, chainId });
            if (isConnected && provider && address && chainId) {
                const web3Provider = new ethers.providers.Web3Provider(provider, 'any');
                const currentSigner = web3Provider.getSigner();
                setWalletAddress(ethers.utils.getAddress(address));
                // Re-configure the entire context for the connected wallet's chain
                await setupProviderForChain(chainId, web3Provider, currentSigner);
            } else if (!isConnected) {
                // When user disconnects via modal, revert to the default read-only provider
                console.log("WalletProvider: Web3Modal disconnected. Reverting to default state.");
                setWalletAddress(null);
                await setupProviderForChain(defaultChainId);
            }
        });

        // Cleanup subscription on component unmount
        return () => {
            unsubscribe();
        };
    // The dependency array ensures this runs once and sets up the listener correctly.
    }, [isInitialized, setupProviderForChain]); 

    const contextValue = useMemo(() => ({
        walletAddress, signer, contract, chainId, provider, isInitialized, nativeTokenSymbol,
        connectWallet: () => web3Modal.open(),
        disconnectWallet: () => web3Modal.disconnect(),
    }), [walletAddress, signer, contract, chainId, provider, isInitialized, nativeTokenSymbol]);
    
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