// src/context/WalletContext.jsx

import React, { createContext, useMemo } from 'react';
import { useWeb3Modal, useWeb3ModalState } from '@web3modal/ethers5/react';

// --- This is the variable that was not being defined in other files. ---
// We create it and export it here.
export const WalletContext = createContext(null);

// The provider component that will wrap your app.
export function WalletProvider({ children }) {
    console.log("--- WALLET PROVIDER - FINAL STABLE VERSION ---");
    
    const { open, disconnect } = useWeb3Modal();
    const { address, chainId, isConnected } = useWeb3ModalState();
    
    // This context provides the raw, stable data from the hooks.
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