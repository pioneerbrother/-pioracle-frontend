// src/pages/WalletProvider.jsx

import React, { createContext, useState, useEffect, useCallback, useMemo } from 'react';
import { ethers } from 'ethers';
import { createWeb3Modal } from '@web3modal/ethers5';
import { getAllSupportedChainsForModal, getConfigForChainId, getTargetChainIdHex } from '../config/contractConfig';

// --- THIS IS THE SCORCHED EARTH FIX ---
// The ABI is now hardcoded here, bypassing any potential issues with JSON file imports or caching.
const PREDICTION_MARKET_ABI = 
[{"inputs":[{"internalType":"address payable","name":"_initialPlatformFeeWallet","type":"address"},{"internalType":"uint16","name":"_initialPlatformFeeBP","type":"uint16"},{"internalType":"uint256","name":"_initialMarketCreationListingFee","type":"uint256"}],"stateMutability":"nonpayable","type":"constructor"},{"inputs":[{"internalType":"address","name":"owner","type":"address"}],"name":"OwnableInvalidOwner","type":"error"},{"inputs":[{"internalType":"address","name":"account","type":"address"}],"name":"OwnableUnauthorizedAccount","type":"error"},{"inputs":[],"name":"ReentrancyGuardReentrantCall","type":"error"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"uint256","name":"marketId","type":"uint256"},{"indexed":true,"internalType":"address","name":"bettor","type":"address"},{"indexed":false,"internalType":"bool","name":"predictedYes","type":"bool"},{"indexed":false,"internalType":"uint256","name":"grossAmount","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"netAmountPooled","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"feeAmount","type":"uint256"}],"name":"BetPlaced","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"uint256","name":"marketId","type":"uint256"},{"indexed":false,"internalType":"bool","name":"conditionMetAndResolved","type":"bool"},{"indexed":false,"internalType":"enum PredictionMarketP2P.MarketState","name":"resultingState","type":"uint8"},{"indexed":false,"internalType":"int256","name":"oraclePriceObserved","type":"int256"}],"name":"EarlyResolutionAttempt","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"uint256","name":"id","type":"uint256"},{"indexed":false,"internalType":"string","name":"assetSymbol","type":"string"},{"indexed":false,"internalType":"address","name":"priceFeedAddress","type":"address"},{"indexed":false,"internalType":"uint256","name":"targetPrice","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"expiryTimestamp","type":"uint256"},{"indexed":false,"internalType":"bool","name":"isEventMarket","type":"bool"},{"indexed":false,"internalType":"uint256","name":"creationTimestamp","type":"uint256"}],"name":"MarketCreated","type":"event"},{"anonymous":false,"inputs":[{"indexed":false,"internalType":"uint256","name":"newFee","type":"uint256"}],"name":"MarketCreationListingFeeSet","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"uint256","name":"marketId","type":"uint256"},{"indexed":false,"internalType":"enum PredictionMarketP2P.MarketState","name":"outcomeState","type":"uint8"},{"indexed":false,"internalType":"int256","name":"actualValue","type":"int256"}],"name":"MarketResolved","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"previousOwner","type":"address"},{"indexed":true,"internalType":"address","name":"newOwner","type":"address"}],"name":"OwnershipTransferred","type":"event"},{"anonymous":false,"inputs":[{"indexed":false,"internalType":"uint16","name":"newFeeBasisPoints","type":"uint16"}],"name":"PlatformFeeSet","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"newWallet","type":"address"}],"name":"PlatformFeeWalletSet","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"uint256","name":"id","type":"uint256"},{"indexed":true,"internalType":"address","name":"marketCreator","type":"address"},{"indexed":false,"internalType":"string","name":"assetSymbol","type":"string"},{"indexed":false,"internalType":"address","name":"priceFeedAddress","type":"address"},{"indexed":false,"internalType":"uint256","name":"targetPrice","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"expiryTimestamp","type":"uint256"},{"indexed":false,"internalType":"bool","name":"isEventMarket","type":"bool"},{"indexed":false,"internalType":"uint16","name":"creatorFeeBasisPoints","type":"uint16"},{"indexed":false,"internalType":"uint256","name":"creationTimestamp","type":"uint256"}],"name":"UserMarketCreated","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"uint256","name":"marketId","type":"uint256"},{"indexed":true,"internalType":"address","name":"bettor","type":"address"},{"indexed":false,"internalType":"uint256","name":"payoutAmount","type":"uint256"}],"name":"WinningsClaimed","type":"event"},{"inputs":[],"name":"MAX_CREATOR_FEE_BASIS_POINTS","outputs":[{"internalType":"uint16","name":"","type":"uint16"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"MAX_ORACLE_STALENESS_FOR_EARLY_RESOLUTION","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"MAX_ORACLE_STALENESS_FOR_REGULAR_RESOLUTION","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint256","name":"_marketId","type":"uint256"}],"name":"claimWinnings","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"string","name":"_assetSymbol","type":"string"},{"internalType":"address","name":"_priceFeedAddress","type":"address"},{"internalType":"uint256","name":"_targetPrice","type":"uint256"},{"internalType":"uint256","name":"_expiryTimestamp","type":"uint256"},{"internalType":"bool","name":"_isEventMarket","type":"bool"}],"name":"createMarket","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"string","name":"_assetSymbol","type":"string"},{"internalType":"address","name":"_priceFeedAddress","type":"address"},{"internalType":"uint256","name":"_targetPrice","type":"uint256"},{"internalType":"uint256","name":"_expiryTimestamp","type":"uint256"},{"internalType":"bool","name":"_isEventMarket","type":"bool"},{"internalType":"uint16","name":"_creatorFeeBP","type":"uint16"}],"name":"createUserMarket","outputs":[],"stateMutability":"payable","type":"function"},{"inputs":[{"internalType":"uint256","name":"_marketId","type":"uint256"},{"internalType":"address","name":"_user","type":"address"}],"name":"didUserClaim","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint256","name":"_marketId","type":"uint256"},{"internalType":"address","name":"_user","type":"address"}],"name":"getClaimableAmount","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"getExistingMarketIds","outputs":[{"internalType":"uint256[]","name":"","type":"uint256[]"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint256","name":"_marketId","type":"uint256"}],"name":"getMarketInfo","outputs":[{"internalType":"string","name":"assetSymbol","type":"string"},{"internalType":"enum PredictionMarketP2P.MarketState","name":"state","type":"uint8"},{"internalType":"uint256","name":"expiryTimestamp","type":"uint256"},{"internalType":"uint256","name":"creationTimestamp","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint256","name":"_marketId","type":"uint256"}],"name":"getMarketResolutionDetails","outputs":[{"internalType":"address","name":"priceFeedAddress","type":"address"},{"internalType":"uint256","name":"targetPrice","type":"uint256"},{"internalType":"int256","name":"actualOutcomeValue","type":"int256"},{"internalType":"bool","name":"isEventMarket","type":"bool"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint256","name":"_marketId","type":"uint256"}],"name":"getMarketStakes","outputs":[{"internalType":"uint256","name":"totalStakedYes","type":"uint256"},{"internalType":"uint256","name":"totalStakedNo","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"marketCreationListingFee","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint256","name":"","type":"uint256"}],"name":"markets","outputs":[{"internalType":"uint256","name":"id","type":"uint256"},{"internalType":"string","name":"assetSymbol","type":"string"},{"internalType":"contract AggregatorV3Interface","name":"priceFeed","type":"address"},{"internalType":"uint256","name":"targetPrice","type":"uint256"},{"internalType":"uint256","name":"expiryTimestamp","type":"uint256"},{"internalType":"uint256","name":"resolutionTimestamp","type":"uint256"},{"internalType":"uint256","name":"creationTimestamp","type":"uint256"},{"internalType":"bool","name":"isEventMarket","type":"bool"},{"internalType":"address payable","name":"marketCreator","type":"address"},{"internalType":"uint16","name":"creatorFeeBasisPoints","type":"uint16"},{"internalType":"bool","name":"isUserCreated","type":"bool"},{"internalType":"uint256","name":"totalStakedYes","type":"uint256"},{"internalType":"uint256","name":"totalStakedNo","type":"uint256"},{"internalType":"enum PredictionMarketP2P.MarketState","name":"state","type":"uint8"},{"internalType":"int256","name":"actualOutcomeValue","type":"int256"},{"internalType":"bool","name":"exists","type":"bool"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"nextMarketId","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"owner","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint256","name":"_marketId","type":"uint256"},{"internalType":"enum PredictionMarketP2P.MarketState","name":"_outcomeState","type":"uint8"}],"name":"ownerResolveEventMarket","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"uint256","name":"_marketId","type":"uint256"},{"internalType":"bool","name":"_predictYes","type":"bool"}],"name":"placeBet","outputs":[],"stateMutability":"payable","type":"function"},{"inputs":[],"name":"platformFeeBasisPoints","outputs":[{"internalType":"uint16","name":"","type":"uint16"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"platformFeeWallet","outputs":[{"internalType":"address payable","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"renounceOwnership","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"uint256","name":"_marketId","type":"uint256"}],"name":"resolvePriceFeedMarket","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"uint256","name":"_newListingFee","type":"uint256"}],"name":"setMarketCreationListingFee","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"uint16","name":"_newFeeBasisPoints","type":"uint16"}],"name":"setPlatformFee","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"newOwner","type":"address"}],"name":"transferOwnership","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"uint256","name":"_marketId","type":"uint256"}],"name":"triggerEarlyPriceResolution","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address payable","name":"_to","type":"address"}],"name":"withdrawStuckEther","outputs":[],"stateMutability":"nonpayable","type":"function"},{"stateMutability":"payable","type":"receive"}];
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
        if (provider && provider.getNetwork) {
            try {
                const network = await provider.getNetwork();
                if (network.chainId !== 1) { network.ensAddress = null; }
            } catch (e) { console.error("Could not get network from provider", e); }
        }

        const chainConfig = getConfigForChainId(chainId);
        const effectiveSignerOrProvider = signer || provider;
        let contractInstance = null;

        if (chainConfig && chainConfig.predictionMarketContractAddress && effectiveSignerOrProvider) {
            try {
                // Use the hardcoded ABI directly
                contractInstance = new ethers.Contract(chainConfig.predictionMarketContractAddress, PREDICTION_MARKET_ABI, effectiveSignerOrProvider);
                console.log(`PMLP: Successfully created ROBUST contract instance for chain ${chainId}.`);
            } catch (e) {
                console.error(`PMLP: Failed to create contract for chain ${chainId}`, e);
            }
        }
        
        setConnectionState({
            provider: provider,
            signer: signer, 
            walletAddress: address, 
            chainId: chainId,
            predictionMarketContract: contractInstance, 
            isInitialized: true,
        });
    }, []);

    const setupReadOnlyState = useCallback(() => {
        const defaultChainId = parseInt(getTargetChainIdHex(), 16);
        const chainConfig = getConfigForChainId(defaultChainId);
        if (chainConfig?.rpcUrl) {
            const readOnlyProvider = new ethers.providers.JsonRpcProvider(chainConfig.rpcUrl, defaultChainId);
            setupState(readOnlyProvider, defaultChainId);
        } else {
            setConnectionState({ ...initialState, isInitialized: true });
        }
    }, [setupState]);

    useEffect(() => {
        const handleStateChange = ({ provider, address, chainId, isConnected }) => {
            if (isConnected && provider && address && chainId) {
                const web3Provider = new ethers.providers.Web3Provider(provider, 'any');
                const currentSigner = web3Provider.getSigner();
                setupState(web3Provider, chainId, currentSigner, address);
            } else {
                setupReadOnlyState();
            }
        };
        const unsubscribe = web3Modal.subscribeProvider(handleStateChange);
        handleStateChange(web3Modal.getState());
        return () => unsubscribe();
    }, [setupReadOnlyState]);

    const connectWallet = useCallback(() => web3Modal.open(), []);
    const disconnectWallet = useCallback(() => web3Modal.disconnect(), []);

    const contextValue = useMemo(() => ({ ...connectionState, connectWallet, disconnectWallet }), [connectionState, connectWallet, disconnectWallet]);

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