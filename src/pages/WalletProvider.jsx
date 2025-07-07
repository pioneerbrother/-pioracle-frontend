import React, { createContext, useState, useEffect, useCallback, useMemo } from 'react';
import { ethers } from 'ethers';
// --- FIX: --- Import the modern React hooks for stable state management.
import { createWeb3Modal, useWeb3Modal, useWeb3ModalState, useWeb3ModalProvider } from '@web3modal/ethers5/react';
import { getAllSupportedChainsForModal, getConfigForChainId, getTargetChainIdHex } from '../config/contractConfig';

// --- This section is correct. It should be outside the component. ---
export const WalletContext = createContext(null);

const WALLETCONNECT_PROJECT_ID = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID;

createWeb3Modal({
    ethersConfig: { metadata: { name: "PiOracle", description: "Decentralized Prediction Markets", url: "https://pioracle.online" } },
    chains: getAllSupportedChainsForModal(),
    projectId: WALLETCONNECT_PROJECT_ID,
});
// --- End of the correct section ---

// This is the hardcoded ABI from before, which is fine.
const PREDICTION_MARKET_ABI = [{"inputs":[{"internalType":"address payable","name":"_initialPlatformFeeWallet","type":"address"},{"internalType":"uint16","name":"_initialPlatformFeeBP","type":"uint16"},{"internalType":"uint256","name":"_initialMarketCreationListingFee","type":"uint256"}],"stateMutability":"nonpayable","type":"constructor"},{"inputs":[{"internalType":"address","name":"owner","type":"address"}],"name":"OwnableInvalidOwner","type":"error"},{"inputs":[{"internalType":"address","name":"account","type":"address"}],"name":"OwnableUnauthorizedAccount","type":"error"},{"inputs":[],"name":"ReentrancyGuardReentrantCall","type":"error"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"uint256","name":"marketId","type":"uint256"},{"indexed":true,"internalType":"address","name":"bettor","type":"address"},{"indexed":false,"internalType":"bool","name":"predictedYes","type":"bool"},{"indexed":false,"internalType":"uint256","name":"grossAmount","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"netAmountPooled","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"feeAmount","type":"uint256"}],"name":"BetPlaced","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"uint256","name":"marketId","type":"uint256"},{"indexed":false,"internalType":"bool","name":"conditionMetAndResolved","type":"bool"},{"indexed":false,"internalType":"enum PredictionMarketP2P.MarketState","name":"resultingState","type":"uint8"},{"indexed":false,"internalType":"int256","name":"oraclePriceObserved","type":"int256"}],"name":"EarlyResolutionAttempt","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"uint256","name":"id","type":"uint256"},{"indexed":false,"internalType":"string","name":"assetSymbol","type":"string"},{"indexed":false,"internalType":"address","name":"priceFeedAddress","type":"address"},{"indexed":false,"internalType":"uint256","name":"targetPrice","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"expiryTimestamp","type":"uint256"},{"indexed":false,"internalType":"bool","name":"isEventMarket","type":"bool"},{"indexed":false,"internalType":"uint256","name":"creationTimestamp","type":"uint256"}],"name":"MarketCreated","type":"event"},{"anonymous":false,"inputs":[{"indexed":false,"internalType":"uint256","name":"newFee","type":"uint256"}],"name":"MarketCreationListingFeeSet","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"uint256","name":"marketId","type":"uint256"},{"indexed":false,"internalType":"enum PredictionMarketP2P.MarketState","name":"outcomeState","type":"uint8"},{"indexed":false,"internalType":"int256","name":"actualValue","type":"int256"}],"name":"MarketResolved","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"previousOwner","type":"address"},{"indexed":true,"internalType":"address","name":"newOwner","type":"address"}],"name":"OwnershipTransferred","type":"event"},{"anonymous":false,"inputs":[{"indexed":false,"internalType":"uint16","name":"newFeeBasisPoints","type":"uint16"}],"name":"PlatformFeeSet","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"newWallet","type":"address"}],"name":"PlatformFeeWalletSet","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"uint256","name":"id","type":"uint256"},{"indexed":true,"internalType":"address","name":"marketCreator","type":"address"},{"indexed":false,"internalType":"string","name":"assetSymbol","type":"string"},{"indexed":false,"internalType":"address","name":"priceFeedAddress","type":"address"},{"indexed":false,"internalType":"uint256","name":"targetPrice","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"expiryTimestamp","type":"uint256"},{"indexed":false,"internalType":"bool","name":"isEventMarket","type":"bool"},{"indexed":false,"internalType":"uint16","name":"creatorFeeBasisPoints","type":"uint16"},{"indexed":false,"internalType":"uint256","name":"creationTimestamp","type":"uint256"}],"name":"UserMarketCreated","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"uint256","name":"marketId","type":"uint256"},{"indexed":true,"internalType":"address","name":"bettor","type":"address"},{"indexed":false,"internalType":"uint256","name":"payoutAmount","type":"uint256"}],"name":"WinningsClaimed","type":"event"}];

const initialState = {
    provider: null,
    signer: null,
    walletAddress: null,
    chainId: null,
    predictionMarketContract: null,
    isInitialized: false,
};

export function WalletProvider({ children }) {
    const [connectionState, setConnectionState] = useState(initialState);
    
    // --- FIX: --- These hooks from Web3Modal provide stable state and prevent loops.
    const { open, disconnect } = useWeb3Modal();
    const { address, chainId, isConnected } = useWeb3ModalState();
    const { walletProvider } = useWeb3ModalProvider();

    useEffect(() => {
        const setupState = async () => {
            // Case 1: User is connected with a wallet.
            if (isConnected && address && chainId && walletProvider) {
                const web3Provider = new ethers.providers.Web3Provider(walletProvider, 'any');
                const currentSigner = web3Provider.getSigner();
                const chainConfig = getConfigForChainId(chainId);
                let contractInstance = null;
                
                if (chainConfig?.predictionMarketContractAddress) {
                    contractInstance = new ethers.Contract(chainConfig.predictionMarketContractAddress, PREDICTION_MARKET_ABI, currentSigner);
                }

                setConnectionState({
                    provider: web3Provider,
                    signer: currentSigner,
                    walletAddress: address,
                    chainId: chainId,
                    predictionMarketContract: contractInstance,
                    isInitialized: true,
                });

            // Case 2: User is not connected, so we set up a read-only provider.
            } else {
                const defaultChainId = parseInt(getTargetChainIdHex(), 16);
                const chainConfig = getConfigForChainId(defaultChainId);
                let readOnlyProvider = null;
                let contractInstance = null;

                if (chainConfig?.rpcUrl) {
                    readOnlyProvider = new ethers.providers.JsonRpcProvider(chainConfig.rpcUrl, defaultChainId);
                    if (chainConfig.predictionMarketContractAddress) {
                        contractInstance = new ethers.Contract(chainConfig.predictionMarketContractAddress, PREDICTION_MARKET_ABI, readOnlyProvider);
                    }
                }
                
                setConnectionState({
                    provider: readOnlyProvider,
                    signer: null,
                    walletAddress: null,
                    chainId: defaultChainId,
                    predictionMarketContract: contractInstance,
                    isInitialized: true,
                });
            }
        };

        setupState();
    }, [isConnected, address, chainId, walletProvider]);

    // Memoize the context value to prevent unnecessary re-renders downstream.
    const contextValue = useMemo(() => ({
        ...connectionState,
        connectWallet: open,      // Use the stable `open` function from the hook.
        disconnectWallet: disconnect, // Use the stable `disconnect` function from the hook.
    }), [connectionState, open, disconnect]);

    return (
        <WalletContext.Provider value={contextValue}>
            {connectionState.isInitialized ? children : (
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
                    Initializing Application...
                </div>
            )}
        </WalletContext.Provider>
    );
}