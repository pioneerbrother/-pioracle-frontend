// src/context/WalletContext.jsx

import React, { createContext, useState, useEffect, useMemo } from 'react';
import { ethers } from 'ethers';
import { useWeb3Modal, useWeb3ModalState, useWeb3ModalProvider } from '@web3modal/ethers5/react';

export const WalletContext = createContext(null);

export function WalletProvider({ children }) {
    const [state, setState] = useState({
        status: 'disconnected', // 'disconnected' | 'connecting' | 'connected' | 'error'
        address: null,
        chainId: null,
        error: null,
        isInitialized: false, // For hydration safety
    });

    const { open: openModal, disconnect } = useWeb3Modal();
    const { address, chainId, isConnected } = useWeb3ModalState();
    const { walletProvider } = useWeb3ModalProvider();

    // This effect runs once on the client to confirm mounting.
    useEffect(() => {
        setState(prev => ({ ...prev, isInitialized: true }));
    }, []);

    const connectWallet = async () => {
        setState(prev => ({ ...prev, status: 'connecting', error: null }));
        try {
            await openModal();
            // The useEffect below will handle the successful connection state.
        } catch (err) {
            console.error("Connection cancelled or failed:", err);
            setState(prev => ({ ...prev, status: 'disconnected', error: 'Connection was cancelled or failed.' }));
        }
    };

    const disconnectWallet = async () => {
        try {
            await disconnect();
            // The useEffect will handle the disconnected state.
        } catch (err) {
            console.error("Disconnection error:", err);
        }
    };

    useEffect(() => {
        const handleConnection = async () => {
            if (isConnected && address && chainId && walletProvider) {
                try {
                    const provider = new ethers.providers.Web3Provider(walletProvider);
                    const network = await provider.getNetwork();
                    setState(prev => ({
                        ...prev,
                        status: 'connected',
                        address,
                        chainId: network.chainId,
                        error: null,
                    }));
                } catch (err) {
                    setState(prev => ({ ...prev, status: 'error', error: 'Network or provider error.' }));
                }
            } else {
                setState(prev => ({ ...prev, status: 'disconnected', address: null, chainId: null }));
            }
        };

        if (state.isInitialized) {
            handleConnection();
        }
    }, [isConnected, address, chainId, walletProvider, state.isInitialized]);

    const value = useMemo(() => ({
        ...state,
        connectWallet,
        disconnectWallet,
    }), [state]);

    return (
        <WalletContext.Provider value={value}>
            {state.isInitialized ? children : null}
        </WalletContext.Provider>
    );
}