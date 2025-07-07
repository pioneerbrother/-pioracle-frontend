import React, { createContext, useMemo } from 'react';
import { ethers } from 'ethers';
import { createWeb3Modal, useWeb3Modal, useWeb3ModalState, useWeb3ModalProvider } from '@web3modal/ethers5/react';
import { getAllSupportedChainsForModal, getConfigForChainId } from '../config/contractConfig';

import PremiumContentABI from '../config/abis/PremiumContent.json';
import IERC20_ABI from '../config/abis/IERC20.json';
const PREDICTION_MARKET_ABI = [{"inputs":[{"internalType":"address payable","name":"_initialPlatformFeeWallet","type":"address"},{"internalType":"uint16","name":"_initialPlatformFeeBP","type":"uint16"},{"internalType":"uint256","name":"_initialMarketCreationListingFee","type":"uint256"}],"stateMutability":"nonpayable","type":"constructor"},{"inputs":[{"internalType":"address","name":"owner","type":"address"}],"name":"OwnableInvalidOwner","type":"error"},{"inputs":[{"internalType":"address","name":"account","type":"address"}],"name":"OwnableUnauthorizedAccount","type":"error"},{"inputs":[],"name":"ReentrancyGuardReentrantCall","type":"error"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"uint256","name":"marketId","type":"uint256"},{"indexed":true,"internalType":"address","name":"bettor","type":"address"},{"indexed":false,"internalType":"bool","name":"predictedYes","type":"bool"},{"indexed":false,"internalType":"uint256","name":"grossAmount","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"netAmountPooled","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"feeAmount","type":"uint256"}],"name":"BetPlaced","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"uint256","name":"marketId","type":"uint256"},{"indexed":false,"internalType":"bool","name":"conditionMetAndResolved","type":"bool"},{"indexed":false,"internalType":"enum PredictionMarketP2P.MarketState","name":"resultingState","type":"uint8"},{"indexed":false,"internalType":"int256","name":"oraclePriceObserved","type":"int256"}],"name":"EarlyResolutionAttempt","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"uint256","name":"id","type":"uint256"},{"indexed":false,"internalType":"string","name":"assetSymbol","type":"string"},{"indexed":false,"internalType":"address","name":"priceFeedAddress","type":"address"},{"indexed":false,"internalType":"uint256","name":"targetPrice","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"expiryTimestamp","type":"uint256"},{"indexed":false,"internalType":"bool","name":"isEventMarket","type":"bool"},{"indexed":false,"internalType":"uint256","name":"creationTimestamp","type":"uint256"}],"name":"MarketCreated","type":"event"},{"anonymous":false,"inputs":[{"indexed":false,"internalType":"uint256","name":"newFee","type":"uint256"}],"name":"MarketCreationListingFeeSet","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"uint256","name":"marketId","type":"uint256"},{"indexed":false,"internalType":"enum PredictionMarketP2P.MarketState","name":"outcomeState","type":"uint8"},{"indexed":false,"internalType":"int256","name":"actualValue","type":"int256"}],"name":"MarketResolved","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"previousOwner","type":"address"},{"indexed":true,"internalType":"address","name":"newOwner","type":"address"}],"name":"OwnershipTransferred","type":"event"},{"anonymous":false,"inputs":[{"indexed":false,"internalType":"uint16","name":"newFeeBasisPoints","type":"uint16"}],"name":"PlatformFeeSet","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"newWallet","type":"address"}],"name":"PlatformFeeWalletSet","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"uint256","name":"id","type":"uint256"},{"indexed":true,"internalType":"address","name":"marketCreator","type":"address"},{"indexed":false,"internalType":"string","name":"assetSymbol","type":"string"},{"indexed":false,"internalType":"address","name":"priceFeedAddress","type":"address"},{"indexed":false,"internalType":"uint256","name":"targetPrice","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"expiryTimestamp","type":"uint256"},{"indexed":false,"internalType":"bool","name":"isEventMarket","type":"bool"},{"indexed":false,"internalType":"uint16","name":"creatorFeeBasisPoints","type":"uint16"},{"indexed":false,"internalType":"uint256","name":"creationTimestamp","type":"uint256"}],"name":"UserMarketCreated","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"uint256","name":"marketId","type":"uint256"},{"indexed":true,"internalType":"address","name":"bettor","type":"address"},{"indexed":false,"internalType":"uint256","name":"payoutAmount","type":"uint256"}],"name":"WinningsClaimed","type":"event"}];

export const WalletContext = createContext(null);

const WALLETCONNECT_PROJECT_ID = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID;

createWeb3Modal({
    ethersConfig: { metadata: { name: "PiOracle", description: "Decentralized Prediction Markets", url: "https://pioracle.online" } },
    chains: getAllSupportedChainsForModal(),
    projectId: WALLETCONNECT_PROJECT_ID,
});

export function WalletProvider({ children }) {
    console.log("--- WALLET PROVIDER - FINAL MEMOIZED VERSION LOADED ---");
    
    const { open, disconnect } = useWeb3Modal();
    const { address, chainId, isConnected } = useWeb3ModalState();
    const { walletProvider } = useWeb3ModalProvider();
    
    const ethersData = useMemo(() => {
        if (isConnected && walletProvider) {
            const provider = new ethers.providers.Web3Provider(walletProvider, 'any');
            const signer = provider.getSigner();
            return { provider, signer };
        }
        return { provider: null, signer: null };
    }, [isConnected, walletProvider]);

    const { provider, signer } = ethersData;
    
    const contracts = useMemo(() => {
        if (signer && chainId) {
            const config = getConfigForChainId(chainId);
            const pmContract = config?.predictionMarketContractAddress ? new ethers.Contract(config.predictionMarketContractAddress, PREDICTION_MARKET_ABI, signer) : null;
            const pcContract = config?.premiumContentContractAddress ? new ethers.Contract(config.premiumContentContractAddress, (PremiumContentABI.abi || PremiumContentABI), signer) : null;
            const usdc = config?.usdcTokenAddress ? new ethers.Contract(config.usdcTokenAddress, (IERC20_ABI.abi || IERC20_ABI), signer) : null;
            return { pmContract, pcContract, usdc };
        }
        return { pmContract: null, pcContract: null, usdc: null };
    }, [signer, chainId]);

    const contextValue = useMemo(() => ({
        provider,
        signer,
        walletAddress: address,
        chainId,
        isConnected,
        isInitialized: true,
        predictionMarketContract: contracts.pmContract,
        premiumContentContract: contracts.pcContract,
        usdcContract: contracts.usdc,
        connectWallet: open,
        disconnectWallet: disconnect,
    }), [provider, signer, address, chainId, isConnected, contracts, open, disconnect]);

    return (
        <WalletContext.Provider value={contextValue}>
            {children}
        </WalletContext.Provider>
    );
}