// pioracle/src/pages/MarketDetailPage.jsx
import React, { useEffect, useState, useContext, useMemo, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ethers } from 'ethers';

import { WalletContext } from '../context/WalletProvider';
import PredictionForm from '../components/predictions/PredictionForm';
import MarketOddsDisplay from '../components/predictions/MarketOddsDisplay';
import LoadingSpinner from '../components/common/LoadingSpinner';
import ErrorMessage from '../components/common/ErrorMessage';

// Assuming your utils file is correctly named and located
import { 
    getMarketDisplayProperties, 
    MarketState as MarketStateEnumFromUtil, // Renamed to avoid conflict if MarketState is defined locally
    getStatusString as getStatusStringFromUtil, 
    formatToUTC as formatToUTCFromUtil 
} from '../utils/marketutils.js';

import './MarketDetailPage.css'; // Your specific styles for this page

// Minimal ABI for Chainlink AggregatorV3Interface
const aggregatorV3InterfaceABI = [
    { "inputs": [], "name": "decimals", "outputs": [{ "internalType": "uint8", "name": "", "type": "uint8" }], "stateMutability": "view", "type": "function" },
    { "inputs": [], "name": "latestRoundData", "outputs": [ { "internalType": "uint80", "name": "roundId", "type": "uint80" }, { "internalType": "int256", "name": "answer", "type": "int256" }, { "internalType": "uint256", "name": "startedAt", "type": "uint256" }, { "internalType": "uint256", "name": "updatedAt", "type": "uint256" }, { "internalType": "uint80", "name": "answeredInRound", "type": "uint80" } ], "stateMutability": "view", "type": "function" }
];

// Use enums/functions from marketUtils.js
const MarketState = MarketStateEnumFromUtil;
const getStatusString = getStatusStringFromUtil;
const formatTimestampToUTC = formatToUTCFromUtil;


const MarketResolutionDisplay = ({ marketDetails }) => {
    if (!marketDetails || 
        (marketDetails.state !== MarketState.Resolved_YesWon &&
         marketDetails.state !== MarketState.Resolved_NoWon &&
         marketDetails.state !== MarketState.Resolved_Push &&
         marketDetails.state !== MarketState.ResolvedEarly_YesWon &&
         marketDetails.state !== MarketState.ResolvedEarly_NoWon) || 
        !marketDetails.resolutionTimestamp || marketDetails.resolutionTimestamp === 0) {
        return null;
    }

    let outcomeDisplay = "Outcome: Pending Resolution Details";
    if (marketDetails.state === MarketState.Resolved_Push) {
        outcomeDisplay = "Market Pushed (Bets Refunded)";
    } else if (marketDetails.isEventMarket) {
        if (marketDetails.actualOutcomeValue?.toString() === "1") outcomeDisplay = "Final Outcome: YES";
        else if (marketDetails.actualOutcomeValue?.toString() === "0") outcomeDisplay = "Final Outcome: NO";
        else outcomeDisplay = `Event Resolved (Outcome Value: ${marketDetails.actualOutcomeValue})`;
    } else { // Price Feed Market
        try {
            const actualPrice = ethers.utils.formatUnits(marketDetails.actualOutcomeValue, marketDetails.oracleDecimals || 8);
            const targetPriceForDisplay = marketDetails.targetDisplay; // From getMarketDisplayProperties
            let resultText = "";
            if (marketDetails.state === MarketState.Resolved_YesWon || marketDetails.state === MarketState.ResolvedEarly_YesWon) resultText = "(Price was ≥ Target)";
            else if (marketDetails.state === MarketState.Resolved_NoWon || marketDetails.state === MarketState.ResolvedEarly_NoWon) resultText = "(Price was < Target)";
            outcomeDisplay = `Resolved Oracle Price: $${parseFloat(actualPrice).toFixed(2)} ${resultText} (Target was ${targetPriceForDisplay})`;
        } catch (e) { 
            console.error("Error formatting resolution display for price feed market:", e);
            outcomeDisplay = `Resolved Value (raw): ${marketDetails.actualOutcomeValue}`; 
        }
    }
    return (
        <div className="market-resolution-info">
            <p><strong>Resolution Details:</strong></p>
            <p>Resolved At: {formatTimestampToUTC(marketDetails.resolutionTimestamp)}</p>
            <p>{outcomeDisplay}</p>
        </div>
    );
};


function MarketDetailPage() {
    const { marketId } = useParams();
    const {
        contract: predictionContractInstance,
        walletAddress,
        signer,
        chainId,
        connectionStatus,
        loadedTargetChainIdHex,
        connectWallet,
        provider // Essential for live price feeds
    } = useContext(WalletContext) || {};

    const [marketDetails, setMarketDetails] = useState(null); // Will store combined raw + display data
    const [isLoading, setIsLoading] = useState(true); // Overall page loading
    const [error, setError] = useState(null);
    const [claimableAmount, setClaimableAmount] = useState(ethers.BigNumber.from(0));
    const [hasUserClaimed, setHasUserClaimed] = useState(false);
    const [isClaiming, setIsClaiming] = useState(false);
    const [actionMessage, setActionMessage] = useState({text: "", type: "info"}); // Page-level feedback
    const [refreshKey, setRefreshKey] = useState(0); // To trigger data refetch

    const [currentOraclePriceData, setCurrentOraclePriceData] = useState(null); // For live price
    const [isFetchingLivePrice, setIsFetchingLivePrice] = useState(false);

    const isCorrectNetwork = useMemo(() => {
        if (chainId === null || chainId === undefined || !loadedTargetChainIdHex) return false;
        const currentChainIdNum = typeof chainId === 'bigint' ? Number(chainId) : Number(chainId);
        const targetChainIdNum = parseInt(loadedTargetChainIdHex, 16);
        return currentChainIdNum === targetChainIdNum;
    }, [chainId, loadedTargetChainIdHex]);

    const targetNetworkName = useMemo(() => {
        if (!loadedTargetChainIdHex) return "the target network";
        const targetChainIdNum = parseInt(loadedTargetChainIdHex, 16);
        if (targetChainIdNum === 137) return "Polygon Mainnet";
        if (targetChainIdNum === 80002) return "Polygon Amoy";
        if (targetChainIdNum === 31337) return "Localhost 8545";
        return `Network ID ${loadedTargetChainIdHex}`;
    }, [loadedTargetChainIdHex]);

    const nativeTokenSymbol = useMemo(() => {
        if (loadedTargetChainIdHex) {
            const id = parseInt(loadedTargetChainIdHex, 16);
            if (id === 137 || id === 80002) return "MATIC";
        }
        return "ETH"; // Default
    }, [loadedTargetChainIdHex]);
    
    useEffect(() => {
        const effectMarketId = marketId;
        console.log(
            `MarketDetailPage DataFetch useEffect FIRING. MarketID: ${effectMarketId}, RefreshKey: ${refreshKey}`,
            `Contract: ${!!predictionContractInstance}, Provider: ${!!provider}, ConnStatus: ${connectionStatus?.type}, Wallet: ${walletAddress}`
        );

        const numericMarketId = Number(effectMarketId);
        if (isNaN(numericMarketId)) {
            setError("Invalid Market ID."); setIsLoading(false); return;
        }

        const fetchAllMarketData = async () => {
            console.log("MarketDetailPage fetchAllMarketData: Attempting for market ID:", numericMarketId);
            setIsLoading(true); setError(null); setCurrentOraclePriceData(null);
            setClaimableAmount(ethers.BigNumber.from(0)); setHasUserClaimed(false);

            try {
                if (!predictionContractInstance) throw new Error("Prediction contract instance not available.");
                if (!provider && marketDetails && !marketDetails.isEventMarket && marketDetails.state === MarketState.Open) {
                    // Only throw error if provider is needed for an open price feed market
                    // For event markets or resolved markets, provider might not be strictly necessary for initial display.
                    // However, WalletProvider should always provide a provider (JsonRpc for read-only, Web3Provider for connected)
                    console.warn("Provider not available from WalletContext. Live price fetching for price-feed markets will be skipped.");
                }


                const detailsArray = await predictionContractInstance.getMarketStaticDetails(numericMarketId);
                console.log("MarketDetailPage fetchAllMarketData: Raw contract details RECEIVED:", detailsArray);

                if (!detailsArray || typeof detailsArray.exists === 'undefined' || detailsArray.length < 12) { // Adjust length based on your actual return tuple
                    throw new Error(`Incomplete data structure for market ${numericMarketId}. ABI might be outdated.`);
                }
                
                // Assuming getMarketStaticDetails returns values in order
                const rawMarketData = {
                    id: detailsArray[0].toString(),
                    assetSymbol: detailsArray[1],
                    priceFeedAddress: detailsArray[2],
                    targetPrice: detailsArray[3].toString(), // Keep as string for BigNumber ops
                    expiryTimestamp: Number(detailsArray[4]),
                    resolutionTimestamp: Number(detailsArray[5]),
                    totalStakedYesNet: detailsArray[6].toString(),
                    totalStakedNoNet: detailsArray[7].toString(),
                    state: Number(detailsArray[8]),
                    actualOutcomeValue: detailsArray[9].toString(),
                    exists: detailsArray[10],
                    isEventMarket: detailsArray[11],
                    creationTimestamp: detailsArray.length > 12 ? Number(detailsArray[12]) : 0, // Handle if creationTimestamp was added
                    oracleDecimals: 8 // Default, will be updated for price feed markets
                };

                if (rawMarketData.exists) {
                    const displayProps = getMarketDisplayProperties(rawMarketData);
                    let finalMarketDetails = { ...rawMarketData, ...displayProps };

                    if (!rawMarketData.isEventMarket && rawMarketData.state === MarketState.Open && rawMarketData.priceFeedAddress && rawMarketData.priceFeedAddress !== ethers.constants.AddressZero && provider) {
                        setIsFetchingLivePrice(true);
                        try {
                            const feedContract = new ethers.Contract(rawMarketData.priceFeedAddress, aggregatorV3InterfaceABI, provider);
                            const feedDecimalsBN = await feedContract.decimals();
                            const feedDecimals = Number(feedDecimalsBN);
                            const roundData = await feedContract.latestRoundData();
                            setCurrentOraclePriceData({ price: roundData.answer.toString(), decimals: feedDecimals });
                            finalMarketDetails.oracleDecimals = feedDecimals; // Update with actual decimals
                        } catch (e) {
                            console.error("Error fetching live oracle price:", e);
                            setCurrentOraclePriceData(null); // Clear or set specific error state
                        }
                        setIsFetchingLivePrice(false);
                    } else {
                        setCurrentOraclePriceData(null);
                    }

                    setMarketDetails(finalMarketDetails);

                    // Claim status check
                    const resolvedStates = [
                        MarketState.Resolved_YesWon, MarketState.Resolved_NoWon, MarketState.Resolved_Push,
                        MarketState.ResolvedEarly_YesWon, MarketState.ResolvedEarly_NoWon
                    ];
                    if (walletAddress && resolvedStates.includes(rawMarketData.state)) {
                        try {
                            const claimed = await predictionContractInstance.didUserClaim(numericMarketId, walletAddress);
                            setHasUserClaimed(claimed);
                            if (!claimed) {
                                const amount = await predictionContractInstance.getClaimableAmount(numericMarketId, walletAddress);
                                setClaimableAmount(amount || ethers.BigNumber.from(0));
                            } else { setClaimableAmount(ethers.BigNumber.from(0)); }
                        } catch (claimCheckErr) { console.error("Error checking claim status:", claimCheckErr); setError("Could not verify claim status.");}
                    } else {
                        setClaimableAmount(ethers.BigNumber.from(0)); setHasUserClaimed(false);
                    }
                } else {
                    setError(`Market ID ${numericMarketId} not found or does not exist.`);
                    setMarketDetails(null);
                }
            } catch (err) {
                console.error(`MarketDetailPage fetchAllMarketData: ERROR for ID ${numericMarketId}:`, err);
                setError(err.message || "Failed to load market details.");
                setMarketDetails(null);
            }
            setIsLoading(false);
        };

        if (connectionStatus?.type === 'error' && !predictionContractInstance) { // If WalletProvider has error and no contract, show error
            setError(`WalletProvider Error: ${connectionStatus.message}`);
            setIsLoading(false);
        } else if (predictionContractInstance) { // We need at least contract for basic details
            fetchAllMarketData();
        } else {
            console.log("MarketDetailPage useEffect: Contract instance from WalletProvider not ready. Waiting.");
            // setIsLoading(true); // Keep loading until contract instance is available
            // setError(null); // No error yet, just waiting
        }
    }, [marketId, predictionContractInstance, provider, connectionStatus?.type, walletAddress, refreshKey]); // Added provider to dependencies

    const handleBetPlacedCallbackFromForm = useCallback(() => {
        console.log("MarketDetailPage: Bet placed callback triggered from PredictionForm. Refreshing data.");
        setActionMessage({ text: "Bet successfully submitted! Market data will refresh shortly.", type: "success" });
        // Don't set setIsLoading(true) here as PredictionForm handles its own loading.
        // Just trigger refresh.
        setRefreshKey(key => key + 1);
    }, [setActionMessage]);

    const handleClaimWinnings = useCallback(async () => {
        if (!predictionContractInstance || !walletAddress || !signer || !marketDetails || !marketDetails.exists || claimableAmount.isZero() || hasUserClaimed) {
            setActionMessage({text: "Cannot claim: Conditions not met or already claimed.", type: "error"});
            return;
        }
        setIsClaiming(true); setActionMessage({text: "Processing your claim...", type: "info"});
        try {
            const contractWithSigner = predictionContractInstance.connect(signer);
            const tx = await contractWithSigner.claimWinnings(marketDetails.id);
            setActionMessage({text: `Claim Tx Sent (${tx.hash.substring(0,10)}...). Waiting for confirmation...`, type: "info"});
            const receipt = await tx.wait(1);
            if (receipt.status === 1) {
                setActionMessage({text: "Winnings claimed successfully! Market data will refresh.", type: "success"});
                setRefreshKey(key => key + 1);
            } else { throw new Error("Claim transaction reverted on-chain."); }
        } catch (err) {
            console.error("Error claiming winnings:", err);
            const reason = err.reason || err.data?.message || err.message || "Failed to claim winnings.";
            setActionMessage({text: `Claim failed: ${reason}`, type: "error"});
        }
        setIsClaiming(false);
    }, [predictionContractInstance, walletAddress, signer, marketDetails, claimableAmount, hasUserClaimed, setActionMessage]);

    // --- Define conditional rendering flags based on current state ---
    const isMarketOpenForBetting = marketDetails && marketDetails.exists && marketDetails.state === MarketState.Open;
    const currentStatusString = marketDetails?.statusString || (isLoading ? "Loading Status..." : "N/A");

    const showPredictionForm = isMarketOpenForBetting && walletAddress && isCorrectNetwork && marketDetails;
    const showConnectWalletNotice = isMarketOpenForBetting && !walletAddress && marketDetails;
    const showSwitchNetworkNotice = isMarketOpenForBetting && walletAddress && !isCorrectNetwork && marketDetails;
    const showMarketClosedMessage = marketDetails && marketDetails.state !== MarketState.Open; // Simplified: if not Open, it's closed for betting

    let pageTitle = "Market Details | PiOracle";
    let pageDescription = "View details and participate in a prediction market on PiOracle.";

    if (marketDetails && marketDetails.exists) {
        pageTitle = `${marketDetails.question || marketDetails.title} | PiOracle`;
        pageDescription = `Predict if ${marketDetails.question || marketDetails.title} on PiOracle.online. Current status: ${marketDetails.statusString}.`;
        if (pageDescription.length > 160) {
            pageDescription = pageDescription.substring(0, 157) + "..."; // Truncate if too long
        }
    } else if (error) {
        pageTitle = "Market Not Found | PiOracle";
        pageDescription = `Could not load market ID ${marketId}. It might not exist or there was an error.`;
    }

    // ... (early returns for loading, error, market not found) ...

    if (isLoading && !marketDetails) return <LoadingSpinner message={`Loading Market Details for ID: ${marketId}...`} />;
    if (error && !marketDetails) return <ErrorMessage title="Market Data Error" message={error} onRetry={() => setRefreshKey(k => k + 1)} />;
    if (!marketDetails || !marketDetails.exists) {
        return (
            <div className="page-container market-detail-page">
                 <Link to="/predictions" className="back-link">← All Prediction Markets</Link>
                <div className="page-centered info-message">Market (ID: {marketId}) not found or does not exist.</div>
            </div>
        );
    }

    const statusClassName = marketDetails.statusClassName || `status-unknown`;
    const canClaim = walletAddress && !hasUserClaimed && claimableAmount && !claimableAmount.isZero() &&
                     (marketDetails.state === MarketState.Resolved_YesWon ||
                      marketDetails.state === MarketState.Resolved_NoWon ||
                      marketDetails.state === MarketState.Resolved_Push ||
                      marketDetails.state === MarketState.ResolvedEarly_YesWon ||
                      marketDetails.state === MarketState.ResolvedEarly_NoWon);

    return (
        <div className="page-container market-detail-page">
            <Link to="/predictions" className="back-link">← All Prediction Markets</Link>
            <header className="market-detail-header">
                <h1>{marketDetails.question || marketDetails.title || `Market ${marketDetails.id}`}</h1>
                <div className="market-meta">
                    <span>Expires: {marketDetails.expiryString}</span>
                    <span className={`status-badge ${statusClassName}`}>{currentStatusString}</span>
                </div>
            </header>

            <MarketResolutionDisplay marketDetails={marketDetails} />

            {error && <div style={{padding: '10px 0'}}><ErrorMessage title="Page Notice" message={error} onRetry={() => setRefreshKey(k => k + 1)} /></div>}
            {isLoading && <LoadingSpinner message="Refreshing details..." size="small"/>}

            <section className="market-data-section">
                <MarketOddsDisplay
                    totalStakedYesNet={marketDetails.totalStakedYesNet}
                    totalStakedNoNet={marketDetails.totalStakedNoNet}
                    marketTarget={marketDetails.targetDisplay}
                    assetSymbol={marketDetails.assetSymbol}
                />
                <div className="betting-section">
                    {showPredictionForm && (
                        <PredictionForm
                            marketId={marketDetails.id}
                            onBetPlaced={handleBetPlacedCallbackFromForm}
                            marketTarget={marketDetails.targetDisplay} // Descriptive e.g. "$111,000"
                            assetSymbol={marketDetails.assetSymbol}
                            currentOraclePriceData={currentOraclePriceData}
                            isFetchingOraclePrice={isFetchingLivePrice}
                            marketTargetPrice={marketDetails.targetPrice} // Raw scaled BigNumber string from contract
                            isEventMarket={marketDetails.isEventMarket}
                        />
                    )}
                    {showConnectWalletNotice && (
                        <div className="connect-wallet-notice">
                            <p>Please connect your wallet to place a prediction.</p>
                            {connectWallet && <button onClick={connectWallet} className="button primary">Connect Wallet</button>}
                        </div>
                    )}
                    {showSwitchNetworkNotice && (
                         <div className="network-notice"><p>⚠️ Please switch to the {targetNetworkName} network to place a bet.</p></div>
                    )}
                    {showMarketClosedMessage && (
                        <p className="info-message">Betting for this market is closed. Status: {currentStatusString}</p>
                    )}

                    {canClaim && (
                        <div className="claim-section" style={{marginTop: '20px'}}>
                            <button onClick={handleClaimWinnings} disabled={isClaiming} className="button primary claim-button">
                                {isClaiming ? "Claiming..." : `Claim ${ethers.utils.formatUnits(claimableAmount, 18)} ${nativeTokenSymbol}`}
                            </button>
                        </div>
                    )}
                    {actionMessage.text && (
                        <p className={`page-action-message type-${actionMessage.type}`} style={{marginTop:'15px', textAlign: 'center'}}>
                            {actionMessage.text}
                        </p>
                    )}
                </div>
            </section>
        </div>
    );
}

export default MarketDetailPage;