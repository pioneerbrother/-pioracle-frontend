import React, { createContext, useState, useEffect, useMemo } from 'react';
import { ethers } from 'ethers';
import { createWeb3Modal, useWeb3Modal, useWeb3ModalState, useWeb3ModalProvider } from '@web3modal/ethers5/react';
import { getAllSupportedChainsForModal, getConfigForChainId, getTargetChainIdHex } from '../config/contractConfig';

// --- This part is correct and should remain. ---
export const WalletContext = createContext(null);
const WALLETCONNECT_PROJECT_ID = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID;
createWeb3Modal({
    ethersConfig: { metadata: { name: "PiOracle", description: "Decentralized Prediction Markets", url: "https://pioracle.online" } },
    chains: getAllSupportedChainsForModal(),
    projectId: WALLETCONNECT_PROJECT_ID,
});
const PREDICTION_MARKET_ABI = [{"inputs":[{"internalType":"address payable","name":"_initialPlatformFeeWallet","type":"address"},{"internalType":"uint16","name":"_initialPlatformFeeBP","type":"uint16"},{"internalType":"uint256","name":"_initialMarketCreationListingFee","type":"uint256"}],"stateMutability":"nonpayable","type":"constructor"},{"inputs":[{"internalType":"address","name":"owner","type":"address"}],"name":"OwnableInvalidOwner","type":"error"},{"inputs":[{"internalType":"address","name":"account","type":"address"}],"name":"OwnableUnauthorizedAccount","type":"error"},{"inputs":[],"name":"ReentrancyGuardReentrantCall","type":"error"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"uint256","name":"marketId","type":"uint256"},{"indexed":true,"internalType":"address","name":"bettor","type":"address"},{"indexed":false,"internalType":"bool","name":"predictedYes","type":"bool"},{"indexed":false,"internalType":"uint256","name":"grossAmount","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"netAmountPooled","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"feeAmount","type":"uint256"}],"name":"BetPlaced","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"uint256","name":"marketId","type":"uint256"},{"indexed":false,"internalType":"bool","name":"conditionMetAndResolved","type":"bool"},{"indexed":false,"internalType":"enum PredictionMarketP2P.MarketState","name":"resultingState","type":"uint8"},{"indexed":false,"internalType":"int256","name":"oraclePriceObserved","type":"int256"}],"name":"EarlyResolutionAttempt","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"uint256","name":"id","type":"uint256"},{"indexed":false,"internalType":"string","name":"assetSymbol","type":"string"},{"indexed":false,"internalType":"address","name":"priceFeedAddress","type":"address"},{"indexed":false,"internalType":"uint256","name":"targetPrice","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"expiryTimestamp","type":"uint256"},{"indexed":false,"internalType":"bool","name":"isEventMarket","type":"bool"},{"indexed":false,"internalType":"uint256","name":"creationTimestamp","type":"uint256"}],"name":"MarketCreated","type":"event"},{"anonymous":false,"inputs":[{"indexed":false,"internalType":"uint256","name":"newFee","type":"uint256"}],"name":"MarketCreationListingFeeSet","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"uint256","name":"marketId","type":"uint256"},{"indexed":false,"internalType":"enum PredictionMarketP2P.MarketState","name":"outcomeState","type":"uint8"},{"indexed":false,"internalType":"int256","name":"actualValue","type":"int256"}],"name":"MarketResolved","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"previousOwner","type":"address"},{"indexed":true,"internalType":"address","name":"newOwner","type":"address"}],"name":"OwnershipTransferred","type":"event"},{"anonymous":false,"inputs":[{"indexed":false,"internalType":"uint16","name":"newFeeBasisPoints","type":"uint16"}],"name":"PlatformFeeSet","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"newWallet","type":"address"}],"name":"PlatformFeeWalletSet","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"uint256","name":"id","type":"uint256"},{"indexed":true,"internalType":"address","name":"marketCreator","type":"address"},{"indexed":false,"internalType":"string","name":"assetSymbol","type":"string"},{"indexed":false,"internalType":"address","name":"priceFeedAddress","type":"address"},{"indexed":false,"internalType":"uint256","name":"targetPrice","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"expiryTimestamp","type":"uint256"},{"indexed":false,"internalType":"bool","name":"isEventMarket","type":"bool"},{"indexed":false,"internalType":"uint16","name":"creatorFeeBasisPoints","type":"uint16"},{"indexed":false,"internalType":"uint256","name":"creationTimestamp","type":"uint256"}],"name":"UserMarketCreated","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"uint256","name":"marketId","type":"uint256"},{"indexed":true,"internalType":"address","name":"bettor","type":"address"},{"indexed":false,"internalType":"uint256","name":"payoutAmount","type":"uint256"}],"name":"WinningsClaimed","type":"event"}];

// ---

const initialState = {
    provider: null,
    signer: null,
    walletAddress: null,
    chainId: null,
    predictionMarketContract: null,
    isInitialized: false,
};

export function WalletProvider({ children }) {
    console.log("--- WALLET PROVIDER - STABLE HOOKS VERSION LOADED (v3 FINAL) ---");
    const [connectionState, setConnectionState] = useState(initialState);
    
    const { open, disconnect } = useWeb3Modal();
    const { address, chainId, isConnected } = useWeb3ModalState();
    const { walletProvider } = useWeb3ModalProvider();

    useEffect(() => {
        const setupState = async () => {
            // State 1: User is definitively disconnected. Set up the default read-only provider.
            if (!isConnected) {
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
                return; // IMPORTANT: Stop processing here.
            }

            // State 2: User is connected, but we might be in a transient state (e.g., waiting for address).
            // Do nothing and wait for a stable state where all values are present. This prevents the loop.
            if (!address || !chainId || !walletProvider) {
                return; // IMPORTANT: Stop processing here.
            }

            // State 3: User is fully connected with all required data.
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
        };

        setupState();
    }, [isConnected, address, chainId, walletProvider]);

    const contextValue = useMemo(() => ({
        ...connectionState,
        connectWallet: open,
        disconnectWallet: disconnect,
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