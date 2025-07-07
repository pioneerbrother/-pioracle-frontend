// src/pages/WalletProvider.jsx

import React, { createContext, useMemo } from 'react';
// The createWeb3Modal function is no longer imported or called here.
import { useWeb3Modal, useWeb3ModalState } from '@web3modal/ethers5/react';

export const WalletContext = createContext(null);

export function WalletProvider({ children }) {
    console.log("--- WALLET PROVIDER - FINAL INITIALIZATION VERSION ---");
    
    // The hooks will now work because createWeb3Modal was called in main.jsx
    const { open, disconnect } = useWeb3Modal();
    const { address, chainId, isConnected } = useWeb3ModalState();
    
    // This context simply passes through the raw, stable data from the hooks.
    const contextValue = useMemo(() => ({
        walletAddress: address,
        chainId,
        isConnected,
        connectWallet: open,
        disconnectWallet: disconnect,
    }), [address, chainId, isConnected, open, disconnect]);

    return (
        <WalletContext.Provider value={contextValue}>
            {children}
        </WalletContext.Provider>
    );
}