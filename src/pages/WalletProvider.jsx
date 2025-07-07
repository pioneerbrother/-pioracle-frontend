import React, { createContext, useMemo } from 'react';
import { createWeb3Modal, useWeb3Modal, useWeb3ModalState } from '@web3modal/ethers5/react';
import { getAllSupportedChainsForModal } from '../config/contractConfig';

export const WalletContext = createContext(null);

const WALLETCONNECT_PROJECT_ID = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID;

// This initialization is correct.
createWeb3Modal({
    ethersConfig: { metadata: { name: "PiOracle", description: "Decentralized Prediction Markets", url: "https://pioracle.online" } },
    chains: getAllSupportedChainsForModal(),
    projectId: WALLETCONNECT_PROJECT_ID,
});

export function WalletProvider({ children }) {
    console.log("--- WALLET PROVIDER - SIMPLIFIED CONDUIT VERSION LOADED ---");
    
    const { open, disconnect } = useWeb3Modal();
    const { address, chainId, isConnected } = useWeb3ModalState();
    
    // This context only provides the raw, stable data directly from the hooks.
    // It creates no ethers instances and no contracts. This makes it completely stable.
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