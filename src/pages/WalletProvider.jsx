// src/pages/WalletProvider.jsx
import React, { createContext, useState, useEffect, useCallback, useMemo } from 'react';
import { ethers } from 'ethers';
import { createWeb3Modal } from '@web3modal/ethers5';
import { 
    getAllSupportedChainsForModal,
    getConfigForChainId,
    getContractAbi,
    getTargetChainIdHex
} from '../config/contractConfig';

export const WalletContext = createContext(null);

const WALLETCONNECT_PROJECT_ID = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID;

// Create the modal once, outside the component.
const web3Modal = createWeb3Modal({
    ethersConfig: { metadata: { name: "Pioracle.online", description: "Decentralized Prediction Markets", url: "https://pioracle.online" } },
    chains: getAllSupportedChainsForModal(),
    projectId: WALLETCONNECT_PROJECT_ID,
});

const initialState = {
    provider: null,
    signer: null,
    contract: null,
    chainId: null,
    walletAddress: null,
    nativeTokenSymbol: null
};

export function WalletProvider({ children }) {
    const [isInitialized, setIsInitialized] = useState(false);
    const [connectionState, setConnectionState] = useState(initialState);

    const setupReadOnlyState = useCallback(() => {
        const defaultChainId = parseInt(getTargetChainIdHex(), 16);
        if (defaultChainId && !isNaN(defaultChainId)) {
            const chainConfig = getConfigForChainId(defaultChainId);
            if (chainConfig?.rpcUrl) {
                // Use StaticJsonRpcProvider for read-only to avoid ENS issues on load.
                const readOnlyProvider = new ethers.providers.StaticJsonRpcProvider(chainConfig.rpcUrl, defaultChainId);
                const contractAddress = chainConfig.predictionMarketContractAddress;
                const contractInstance = contractAddress ? new ethers.Contract(contractAddress, getContractAbi(), readOnlyProvider) : null;
                
                setConnectionState({
                    ...initialState,
                    provider: readOnlyProvider,
                    chainId: defaultChainId,
                    contract: contractInstance,
                    nativeTokenSymbol: chainConfig.symbol,
                });
            }
        }
        setIsInitialized(true);
    }, []);

    useEffect(() => {
        const unsubscribe = web3Modal.subscribeProvider(async ({ provider, address, chainId, isConnected }) => {
            if (isConnected && provider && address && chainId) {
                const web3Provider = new ethers.providers.Web3Provider(provider, 'any');

                // --- THIS IS THE DEFINITIVE FIX ---
                // Get the network object before doing anything else.
                const network = await web3Provider.getNetwork();
                // If the network is not Ethereum Mainnet (chainId 1), disable ENS lookups.
                if (network.chainId !== 1) {
                    network.ensAddress = null;
                }
                // --- END OF FIX ---

                const currentSigner = web3Provider.getSigner();
                const chainConfig = getConfigForChainId(chainId);
                const contractAddress = chainConfig?.predictionMarketContractAddress;
                const contractInstance = contractAddress ? new ethers.Contract(contractAddress, getContractAbi(), currentSigner) : null;

                setConnectionState({
                    provider: web3Provider,
                    signer: currentSigner,
                    walletAddress: address,
                    chainId: chainId,
                    contract: contractInstance,
                    nativeTokenSymbol: chainConfig?.symbol,
                });

            } else if (!isConnected) {
                setupReadOnlyState(); // Revert to default read-only state on disconnect
            }
        });

        setupReadOnlyState(); // Set initial state
        return () => unsubscribe();
    }, [setupReadOnlyState]);

    const contextValue = useMemo(() => ({
        ...connectionState,
        isInitialized,
        connectWallet: () => web3Modal.open(),
        disconnectWallet: () => web3Modal.disconnect(),
    }), [connectionState, isInitialized]);
    
    return (
        <WalletContext.Provider value={contextValue}>
            {isInitialized ? children : (
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
                    Initializing PiOracle...
                </div>
            )}
        </WalletContext.Provider>
    );
}