// pioracle/src/pages/MarketDetailPage.jsx
import React, { useEffect, useState, useContext, useMemo, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { WalletContext } from '../context/WalletProvider';
import PredictionForm from '../components/predictions/PredictionForm';
import MarketOddsDisplay from '../components/predictions/MarketOddsDisplay';
import LoadingSpinner from '../components/common/LoadingSpinner';
import ErrorMessage from '../components/common/ErrorMessage';
import { ethers } from 'ethers';
// --- NEW ---
import { getMarketDisplayProperties, MarketState as MarketStateEnumUtil, getStatusString as getStatusStringUtil, formatToUTC as formatToUTCUtil } from '../utils/marketDisplayUtils'; // Assuming this is your util file
import './MarketDetailPage.css';

// --- NEW --- Minimal ABI for Chainlink AggregatorV3Interface
const aggregatorV3InterfaceABI = [
    { "inputs": [], "name": "decimals", "outputs": [{ "internalType": "uint8", "name": "", "type": "uint8" }], "stateMutability": "view", "type": "function" },
    { "inputs": [], "name": "latestRoundData", "outputs": [ { "internalType": "uint80", "name": "roundId", "type": "uint80" }, { "internalType": "int256", "name": "answer", "type": "int256" }, { "internalType": "uint256", "name": "startedAt", "type": "uint256" }, { "internalType": "uint256", "name": "updatedAt", "type": "uint256" }, { "internalType": "uint80", "name": "answeredInRound", "type": "uint80" } ], "stateMutability": "view", "type": "function" }
];

// --- MODIFIED --- Use enums/functions from marketUtils.js
const MarketState = MarketStateEnumUtil; // Use the one from utils
const getStatusString = getStatusStringUtil;
const formatExpiry = formatToUTCUtil; // Using your UTC formatter for all expiry/resolution display


// MarketResolutionDisplay Component - MODIFIED to use utility functions and better target display
const MarketResolutionDisplay = ({ marketDetails }) => {
    if (!marketDetails || marketDetails.status === MarketState.Open || marketDetails.status === MarketState.Resolvable || !marketDetails.resolutionTimestamp || marketDetails.resolutionTimestamp === 0) {
        return null;
    }
    let outcomeDisplay = "Outcome: Pending Resolution Details";

    if (marketDetails.status === MarketState.Resolved_Push) {
        outcomeDisplay = "Market Pushed (Bets Refunded)";
    } else if (marketDetails.isEventMarket) {
        if (marketDetails.actualOutcomeValue?.toString() === "1") outcomeDisplay = "Final Outcome: YES";
        else if (marketDetails.actualOutcomeValue?.toString() === "0") outcomeDisplay = "Final Outcome: NO";
        else outcomeDisplay = `Event Resolved (Outcome Value: ${marketDetails.actualOutcomeValue})`;
    } else { // Price Feed Market
        try {
            // Assuming marketDetails.actualOutcomeValue is the raw BigNumber string from contract
            // And marketDetails.oracleDecimals is available (see fetch logic below)
            const actualPrice = ethers.utils.formatUnits(marketDetails.actualOutcomeValue, marketDetails.oracleDecimals || 8); // Default to 8 if not set
            const targetPriceForDisplay = marketDetails.targetDisplay; // Use pre-formatted from getMarketDisplayProperties
            let resultText = "";
            if (marketDetails.status === MarketState.Resolved_YesWon) resultText = "(Price was ≥ Target)";
            else if (marketDetails.status === MarketState.Resolved_NoWon) resultText = "(Price was < Target)";
            outcomeDisplay = `Resolved Oracle Price: $${parseFloat(actualPrice).toFixed(2)} ${resultText} (Target was ${targetPriceForDisplay})`;
        } catch (e) { outcomeDisplay = `Resolved Value (raw): ${marketDetails.actualOutcomeValue}`; }
    }
    return (
        <div className="market-resolution-info">
            <p><strong>Resolution Details:</strong></p>
            <p>Resolved At: {formatExpiry(marketDetails.resolutionTimestamp)}</p>
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
        provider // --- NEW --- Ensure provider is available from WalletContext for feed calls
    } = useContext(WalletContext) || {};

    const [marketDetails, setMarketDetails] = useState(null); // Will now store raw data + display data
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [claimableAmount, setClaimableAmount] = useState(ethers.BigNumber.from(0));
    const [hasUserClaimed, setHasUserClaimed] = useState(false);
    const [isClaiming, setIsClaiming] = useState(false);
    const [actionMessage, setActionMessage] = useState({text: "", type: "info"});
    const [refreshKey, setRefreshKey] = useState(0);

    // --- NEW --- State for live oracle price
    const [currentOraclePriceData, setCurrentOraclePriceData] = useState(null); // { price: BigNumberString, decimals: number }
    const [isFetchingLivePrice, setIsFetchingLivePrice] = useState(false);


    const isCorrectNetwork = useMemo(() => { /* ... no change ... */ }, [chainId, loadedTargetChainIdHex]);
    const targetNetworkName = useMemo(() => { /* ... no change ... */ }, [loadedTargetChainIdHex]);
    const nativeTokenSymbol = useMemo(() => { /* ... no change ... */ }, [loadedTargetChainIdHex]);

    console.log( /* ... no change ... */ );

    useEffect(() => {
        const effectMarketId = marketId;
        console.log( /* ... no change ... */ );

        const numericMarketId = Number(effectMarketId);
        if (isNaN(numericMarketId)) { setError("Invalid Market ID."); setIsLoading(false); return; }

        const fetchAllData = async () => {
            console.log("MarketDetailPage fetchAllData: Attempting for market ID:", numericMarketId);
            setIsLoading(true); setError(null); setCurrentOraclePriceData(null); // Reset live price
            setClaimableAmount(ethers.BigNumber.from(0)); setHasUserClaimed(false);

            try {
                if (!predictionContractInstance) throw new Error("Contract instance not available.");

                const detailsArray = await predictionContractInstance.getMarketStaticDetails(numericMarketId);
                console.log("MarketDetailPage fetchAllData: Raw details RECEIVED:", detailsArray);

                // --- MODIFIED --- Simplified parsing (assuming detailsArray returns an object-like structure if ABI is recent)
                // Or continue with your existing index-based parsing if that's what ethers v5/contract returns
                const rawMarketData = {
                    id: (detailsArray.id !== undefined ? detailsArray.id : detailsArray[0]).toString(),
                    assetSymbol: detailsArray.assetSymbol !== undefined ? detailsArray.assetSymbol : detailsArray[1],
                    priceFeedAddress: detailsArray.priceFeedAddress !== undefined ? detailsArray.priceFeedAddress : detailsArray[2],
                    targetPrice: (detailsArray.targetPrice !== undefined ? detailsArray.targetPrice : detailsArray[3]).toString(), // Keep as string for BigNumber
                    expiryTimestamp: Number(detailsArray.expiryTimestamp !== undefined ? detailsArray.expiryTimestamp : detailsArray[4]),
                    resolutionTimestamp: Number(detailsArray.resolutionTimestamp !== undefined ? detailsArray.resolutionTimestamp : detailsArray[5]),
                    totalStakedYesNet: (detailsArray.totalStakedYes !== undefined ? detailsArray.totalStakedYes : detailsArray[6]).toString(),
                    totalStakedNoNet: (detailsArray.totalStakedNo !== undefined ? detailsArray.totalStakedNo : detailsArray[7]).toString(),
                    state: Number(detailsArray.state !== undefined ? detailsArray.state : detailsArray[8]),
                    actualOutcomeValue: (detailsArray.actualOutcomeValue !== undefined ? detailsArray.actualOutcomeValue : detailsArray[9]).toString(),
                    exists: detailsArray.exists !== undefined ? detailsArray.exists : detailsArray[10],
                    isEventMarket: detailsArray.isEventMarket !== undefined ? detailsArray.isEventMarket : detailsArray[11],
                    // --- NEW --- Assuming you added creationTimestamp to getMarketStaticDetails output
                    creationTimestamp: detailsArray.creationTimestamp ? Number(detailsArray.creationTimestamp) : 0,
                    oracleDecimals: 8 // Default, will be updated below for price feed markets
                };

                if (rawMarketData.exists) {
                    // --- NEW --- Get display properties using the utility function
                    const displayProps = getMarketDisplayProperties(rawMarketData);
                    let finalMarketDetails = { ...rawMarketData, ...displayProps };

                    // --- NEW --- Fetch live oracle price if applicable
                    if (!rawMarketData.isEventMarket && rawMarketData.state === MarketState.Open && rawMarketData.priceFeedAddress && rawMarketData.priceFeedAddress !== ethers.ZeroAddress && provider) {
                        setIsFetchingLivePrice(true);
                        try {
                            console.log("Fetching live price for feed:", rawMarketData.priceFeedAddress);
                            const feedContract = new ethers.Contract(rawMarketData.priceFeedAddress, aggregatorV3InterfaceABI, provider);
                            const feedDecimalsBN = await feedContract.decimals(); // Ethers v6 returns BigInt
                            const feedDecimals = Number(feedDecimalsBN);
                            const roundData = await feedContract.latestRoundData();
                            setCurrentOraclePriceData({ price: roundData.answer.toString(), decimals: feedDecimals }); // Store price as string
                            finalMarketDetails.oracleDecimals = feedDecimals; // Store actual decimals
                            console.log("Live oracle price fetched:", roundData.answer.toString(), "Decimals:", feedDecimals);
                        } catch (e) {
                            console.error("Error fetching live oracle price:", e);
                            setCurrentOraclePriceData(null);
                        }
                        setIsFetchingLivePrice(false);
                    } else {
                        setCurrentOraclePriceData(null);
                    }

                    setMarketDetails(finalMarketDetails);
                    console.log("MarketDetailPage fetchAllData: Final market details SET:", finalMarketDetails);

                    // Claim status check (no change to this logic)
                    if (walletAddress && (rawMarketData.state === MarketState.Resolved_YesWon || rawMarketData.state === MarketState.Resolved_NoWon || rawMarketData.state === MarketState.Resolved_Push || rawMarketData.state === MarketStateEnumUtil.ResolvedEarly_YesWon || rawMarketData.state === MarketStateEnumUtil.ResolvedEarly_NoWon )) {
                        // ... (your existing claim check logic, ensure it uses MarketState from utils) ...
                         const claimed = await predictionContractInstance.didUserClaim(numericMarketId, walletAddress);
                         setHasUserClaimed(claimed);
                         if (!claimed) {
                             const amount = await predictionContractInstance.getClaimableAmount(numericMarketId, walletAddress);
                             setClaimableAmount(amount || ethers.BigNumber.from(0));
                         } else { setClaimableAmount(ethers.BigNumber.from(0)); }
                    } else {
                        setClaimableAmount(ethers.BigNumber.from(0)); setHasUserClaimed(false);
                    }

                } else { setError(`Market ID ${numericMarketId} not found.`); setMarketDetails(null); }
            } catch (err) {
                console.error(`MarketDetailPage fetchAllData: ERROR for ID ${numericMarketId}:`, err);
                setError(err.message || "Failed to load market details.");
                setMarketDetails(null);
            }
            setIsLoading(false);
        };

        if (connectionStatus?.type === 'error') {
            setError(`WalletProvider Error: ${connectionStatus.message}`); setIsLoading(false);
        } else if (predictionContractInstance && provider) { // --- MODIFIED --- Ensure provider is also available
            fetchAllData();
        } else {
            console.log("MarketDetailPage useEffect: Contract or Provider from WalletProvider not ready. Waiting.");
            setIsLoading(true); setError(null);
        }
    }, [marketId, predictionContractInstance, provider, connectionStatus, walletAddress, refreshKey]); // --- MODIFIED --- Added provider

    // --- MODIFIED --- Renamed for clarity, uses setActionMessage
    const handleBetPlacedCallbackFromForm = useCallback(() => {
        console.log("MarketDetailPage: Bet placed callback. Incrementing refreshKey.");
        setActionMessage({ text: "Bet submitted! Refreshing market data...", type: "success" });
        setIsLoading(true);
        setRefreshKey(key => key + 1);
    }, [setActionMessage]); // --- MODIFIED --- Dependency on setActionMessage

    // --- MODIFIED --- Uses setActionMessage
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
    }, [predictionContractInstance, walletAddress, signer, marketDetails, claimableAmount, hasUserClaimed, setActionMessage]); // --- MODIFIED --- Dependency

    let isMarketOpenForBetting = false;
    // --- MODIFIED --- Use marketDetails.statusString if available from getMarketDisplayProperties
    let currentStatusString = marketDetails?.statusString || "Loading...";

    if (marketDetails && marketDetails.exists) {
        isMarketOpenForBetting = marketDetails.state === MarketState.Open;
        // currentStatusString is already set if marketDetails exists due to displayProps merge
    }

   if (isLoading && !marketDetails) return <LoadingSpinner message={`Loading Market Details for ID: ${marketId}...`} />;
    if (error && !marketDetails) return <ErrorMessage title="Market Data Error" message={error} onRetry={() => setRefreshKey(k => k + 1)} />;
    if (!marketDetails || !marketDetails.exists) return <div className="page-centered info-message">Market (ID: {marketId}) not found. <Link to="/predictions">Back</Link></div>;

    const statusClassName = marketDetails.statusClassName || `status-unknown`;


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

            {error && marketDetails && marketDetails.exists &&
                <div style={{padding: '10px 0'}}><ErrorMessage title="Notice" message={error} onRetry={() => setRefreshKey(k => k+1)} /></div>}
            {/* Show general loading spinner if isLoading is true AND marketDetails already exist (meaning it's a refresh) */}
            {isLoading && marketDetails && marketDetails.exists && <LoadingSpinner message="Refreshing details..." size="small"/>}


            {/* --- REWRITTEN BETTING SECTION --- */}
            <section className="market-data-section">
                {marketDetails && ( // Only render odds if marketDetails exist
                    <MarketOddsDisplay
                        totalStakedYesNet={marketDetails.totalStakedYesNet}
                        totalStakedNoNet={marketDetails.totalStakedNoNet}
                        marketTarget={marketDetails.targetDisplay}
                        assetSymbol={marketDetails.assetSymbol}
                    />
                )}
                <div className="betting-section">
                    {/* Case 1: Show Prediction Form */}
                    {showPredictionForm && (
                        <PredictionForm
                            marketId={marketDetails.id}
                            onBetPlaced={handleBetPlacedCallbackFromForm}
                            marketTarget={marketDetails.targetDisplay}
                            assetSymbol={marketDetails.assetSymbol}
                            currentOraclePriceData={currentOraclePriceData}
                            isFetchingOraclePrice={isFetchingLivePrice}
                            marketTargetPrice={marketDetails.targetPrice} // Raw scaled BigNumber string
                            isEventMarket={marketDetails.isEventMarket}
                        />
                    )}

                    {/* Case 2: Market is open, but wallet not connected */}
                    {showConnectWalletNotice && (
                        <div className="connect-wallet-notice">
                            <p>Please connect your wallet to place a prediction.</p>
                            {connectWallet && <button onClick={connectWallet} className="button primary">Connect Wallet</button>}
                        </div>
                    )}

                    {/* Case 3: Market is open, wallet connected, but wrong network */}
                    {showSwitchNetworkNotice && (
                         <div className="network-notice"><p>⚠️ Please switch to the {targetNetworkName} network to place a bet.</p></div>
                    )}

                    {/* Case 4: Market is not open for betting */}
                    {showMarketClosedMessage && (
                        <p className="info-message">Betting for this market is closed. Status: {currentStatusString}</p>
                    )}

                    {/* Claim Winnings Section - Independent of betting state */}
                    {canClaim && (
                        <div className="claim-section" style={{marginTop: '20px'}}>
                            <button onClick={handleClaimWinnings} disabled={isClaiming} className="button primary claim-button">
                                {isClaiming ? "Claiming..." : `Claim ${ethers.utils.formatUnits(claimableAmount, 18)} ${nativeTokenSymbol}`}
                            </button>
                        </div>
                    )}

                    {/* Page-level Action Message */}
                    {actionMessage.text && (
                        <p className={`page-action-message type-${actionMessage.type}`} style={{marginTop:'15px', textAlign: 'center'}}>
                            {actionMessage.text}
                        </p>
                    )}
                </div>
            </section>
            {/* --- END REWRITTEN BETTING SECTION --- */}

        </div>
    );
}
export default MarketDetailPage;