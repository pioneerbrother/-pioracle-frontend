import React, { createContext, useState, useEffect, useMemo } from 'react';
import { useWeb3Modal, useWeb3ModalState, useWeb3ModalProvider } from '@web3modal/ethers5/react';
import { ethers } from 'ethers'; // Added ethers for network check

export const WalletContext = createContext(null);

export function WalletProvider({ children }) {
    const [state, setState] = useState({
        walletAddress: null,
        chainId: null,
        isConnected: false,
        isInitialized: false, // <-- CRITICAL: Start as false to prevent hydration errors
        isConnecting: false
    });

    const { open, disconnect } = useWeb3Modal();
    const { address, chainId, isConnected } = useWeb3ModalState();
    const { walletProvider } = useWeb3ModalProvider();

    // This effect runs whenever the connection state from Web3Modal changes.
    useEffect(() => {
        // We set isInitialized to true on the first run, only on the client.
        if (!state.isInitialized) {
            setState(prev => ({ ...prev, isInitialized: true }));
        }

        const handleConnection = async () => {
            if (isConnected && address && chainId && walletProvider) {
                // The provider object from walletProvider can be unstable.
                // Creating a new ethers provider is the correct way to get a stable object.
                const provider = new ethers.providers.Web3Provider(walletProvider);
                const network = await provider.getNetwork();
                
                setState(prev => ({
                    ...prev,
                    walletAddress: address,
                    chainId: network.chainId,
                    isConnected: true,
                    isConnecting: false
                }));
            } else {
                setState(prev => ({
                    ...prev,
                    walletAddress: null,
                    chainId: null,
                    isConnected: false,
                    isConnecting: false
                }));
            }
        };

        handleConnection();
    }, [isConnected, address, chainId, walletProvider]);

    const connectWallet = async () => {
        if (state.isConnecting) return;
        setState(prev => ({ ...prev, isConnecting: true }));
        try {
            await open();
            // The useEffect will handle the state update upon successful connection
        } catch (error) {
            console.error("Wallet connection failed:", error);
            setState(prev => ({ ...prev, isConnecting: false }));
        }
    };

    const contextValue = useMemo(() => ({
        ...state,
        connectWallet,
        disconnectWallet: disconnect
    }), [state, disconnect]);

    return (
        <WalletContext.Provider value={contextValue}>
            {/* Render children only when initialized to prevent hydration errors */}
            {state.isInitialized ? children : null}
        </WalletContext.Provider>
    );
}