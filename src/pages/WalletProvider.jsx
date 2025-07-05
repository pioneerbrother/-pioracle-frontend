// FINAL "SCORCHED EARTH" WalletProvider.jsx
import React, { createContext, useState, useEffect, useCallback, useMemo } from 'react';
import { ethers } from 'ethers';
import { createWeb3Modal } from '@web3modal/ethers5';

import { getAllSupportedChainsForModal, getConfigForChainId, getTargetChainIdHex } from '../config/contractConfig';

// --- THIS IS THE FINAL FIX: ABI is Hardcoded Here ---
// We no longer import any JSON file. The ABI is now part of the code.
const PREDICTION_MARKET_ABI = [
  "function getExistingMarketIds() view returns (uint256[])",
  "function getMarketInfo(uint256 _marketId) view returns (string memory assetSymbol, uint8 state, uint256 expiryTimestamp, uint256 creationTimestamp)",
  "function getMarketStakes(uint256 _marketId) view returns (uint256 totalStakedYes, uint256 totalStakedNo)"
];
// --- END OF FIX ---

export const WalletContext = createContext(null);

const WALLETCONNECT_PROJECT_ID = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID;
const web3Modal = createWeb3Modal({
    ethersConfig: { metadata: { name: "PiOracle", description: "Decentralized Prediction Markets", url: "https://pioracle.online" } },
    chains: getAllSupportedChainsForModal(),
    projectId: WALLETCONNECT_PROJECT_ID,
});

const initialState = {
    provider: null, signer: null, walletAddress: null, chainId: null,
    predictionMarketContract: null, isInitialized: false,
};

export function WalletProvider({ children }) {
    const [connectionState, setConnectionState] = useState(initialState);

    const setupState = useCallback(async (provider, chainId, signer = null, address = null) => {
        const chainConfig = getConfigForChainId(chainId);
        const effectiveSignerOrProvider = signer || provider;
        let contractInstance = null;

        if (chainConfig && chainConfig.predictionMarketContractAddress && effectiveSignerOrProvider) {
            try {
                // Now we use the hardcoded ABI from above.
                contractInstance = new ethers.Contract(chainConfig.predictionMarketContractAddress, PREDICTION_MARKET_ABI, effectiveSignerOrProvider);
                console.log(`PMLP: Contract instance created for chain ${chainId} using HARDCODED ABI.`);
            } catch (e) {
                console.error(`PMLP: Failed to create contract with hardcoded ABI for chain ${chainId}`, e);
            }
        }
        
        setConnectionState({
            provider, signer, walletAddress: address, chainId,
            predictionMarketContract: contractInstance,
            isInitialized: true,
        });
    }, []);

    useEffect(() => {
        const handleStateChange = ({ provider, address, chainId, isConnected }) => {
            if (isConnected && provider && address && chainId) {
                const web3Provider = new ethers.providers.Web3Provider(provider, 'any');
                const currentSigner = web3Provider.getSigner();
                setupState(web3Provider, chainId, currentSigner, address);
            } else {
                setupState(null, parseInt(getTargetChainIdHex(), 16), null, null);
            }
        };
        const unsubscribe = web3Modal.subscribeProvider(handleStateChange);
        handleStateChange(web3Modal.getState());
        return () => unsubscribe();
    }, [setupState]);
    
    // ... connectWallet, disconnectWallet, and useMemo are the same ...
    const connectWallet = useCallback(() => web3Modal.open(), []);
    const disconnectWallet = useCallback(() => web3Modal.disconnect(), []);

    const contextValue = useMemo(() => ({
        ...connectionState,
        connectWallet,
        disconnectWallet,
    }), [connectionState, connectWallet, disconnectWallet]);

    return (
        <WalletContext.Provider value={contextValue}>
            {connectionState.isInitialized ? children : <div>Initializing Application...</div>}
        </WalletContext.Provider>
    );
}