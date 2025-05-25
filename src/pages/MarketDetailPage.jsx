// pioracle/src/pages/MarketDetailPage.jsx
import React, { useEffect, useState, useContext, useMemo, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { WalletContext } from '../context/WalletProvider';
import PredictionForm from '../components/predictions/PredictionForm';
import MarketOddsDisplay from '../components/predictions/MarketOddsDisplay';
import LoadingSpinner from '../components/common/LoadingSpinner';
import ErrorMessage from '../components/common/ErrorMessage';
import { ethers } from 'ethers'; 
import './MarketDetailPage.css'; 

// Define MarketState enum
const MarketState = {
    Open: 0,
    Resolvable: 1,
    Resolved_YesWon: 2, 
    Resolved_NoWon: 3,  
    Resolved_Push: 4,
};

// getStatusString function
const getStatusString = (statusEnum) => {
    if (statusEnum === undefined || statusEnum === null) return "Loading...";
    switch (Number(statusEnum)) {
        case MarketState.Open: return "Open";
        case MarketState.Resolvable: return "Resolving";
        case MarketState.Resolved_YesWon: return "Resolved: YES Won";
        case MarketState.Resolved_NoWon: return "Resolved: NO Won";
        case MarketState.Resolved_Push: return "Push (Refunded)";
        default: return `Unknown (${statusEnum})`;
    }
};

// formatExpiry function
const formatExpiry = (timestamp) => {
    if (!timestamp || timestamp === 0) return "N/A";
    return new Date(timestamp * 1000).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
};

// MarketResolutionDisplay Component
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
    } else { 
        try {
            const actualPrice = ethers.utils.formatUnits(marketDetails.actualOutcomeValue, 8); 
            const targetPriceForDisplay = parseFloat(marketDetails.targetPriceScaled) / 100;
            let resultText = "";
            if (marketDetails.status === MarketState.Resolved_YesWon) resultText = "(Price was ≥ Target)";
            else if (marketDetails.status === MarketState.Resolved_NoWon) resultText = "(Price was < Target)";
            outcomeDisplay = `Resolved Oracle Price: $${parseFloat(actualPrice).toFixed(2)} ${resultText} (Target was $${targetPriceForDisplay.toFixed(2)})`;
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
        connectWallet 
    } = useContext(WalletContext) || {};
    
    const [marketDetails, setMarketDetails] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null); 
    const [claimableAmount, setClaimableAmount] = useState(ethers.BigNumber.from(0));
    const [hasUserClaimed, setHasUserClaimed] = useState(false);
    const [isClaiming, setIsClaiming] = useState(false);
    const [actionMessage, setActionMessage] = useState({text: "", type: "info"}); // For claim/bet user feedback
    const [refreshKey, setRefreshKey] = useState(0);

    const isCorrectNetwork = useMemo(() => {
        if (chainId === null || chainId === undefined || !loadedTargetChainIdHex) return false;
        const currentChainIdNum = typeof chainId === 'bigint' ? Number(chainId) : Number(chainId);
        const targetChainIdNum = parseInt(loadedTargetChainIdHex, 16);
        return currentChainIdNum === targetChainIdNum;
    }, [chainId, loadedTargetChainIdHex]);

    const targetNetworkName = useMemo(() => {
        if (!loadedTargetChainIdHex) return "the target network";
        const targetChainIdNum = parseInt(loadedTargetChainIdHex, 16);
        if (targetChainIdNum === 31337) return "Localhost 8545";
        if (targetChainIdNum === 80002) return "Polygon Amoy";
        if (targetChainIdNum === 137) return "Polygon Mainnet";
        return `Network ID ${loadedTargetChainIdHex}`;
    }, [loadedTargetChainIdHex]);

    const nativeTokenSymbol = useMemo(() => {
        if (loadedTargetChainIdHex) {
            const targetChainIdNum = parseInt(loadedTargetChainIdHex, 16);
            if (targetChainIdNum === 80002 || targetChainIdNum === 137) return "MATIC";
        }
        return "ETH";
    }, [loadedTargetChainIdHex]);
    
    console.log(
        `MarketDetailPage RENDER. MarketID: ${marketId}, isLoading: ${isLoading}, Error: ${error}`,
        `Contract: ${!!predictionContractInstance}, Wallet: ${walletAddress}, ChainID: ${chainId}`,
        `IsCorrectNet: ${isCorrectNetwork}, TargetChainHex: ${loadedTargetChainIdHex}, ConnStatus: ${connectionStatus?.type}`
    );
    
    useEffect(() => {
        const effectMarketId = marketId; 
        console.log(
            `MarketDetailPage DataFetch useEffect FIRING. MarketID: ${effectMarketId}, RefreshKey: ${refreshKey}`,
            `Contract: ${!!predictionContractInstance}, ConnStatus: ${connectionStatus?.type}, Wallet: ${walletAddress}`
        );

        const numericMarketId = Number(effectMarketId);
        if (isNaN(numericMarketId)) { setError("Invalid Market ID."); setIsLoading(false); return; }

        const directFetch = async () => {
            console.log("MarketDetailPage directFetch: Attempting for market ID:", numericMarketId);
            setIsLoading(true); setError(null); 
            setClaimableAmount(ethers.BigNumber.from(0)); setHasUserClaimed(false); 

            try {
                if (!predictionContractInstance) throw new Error("Contract instance not available.");
                
                const detailsArray = await predictionContractInstance.getMarketStaticDetails(numericMarketId);
                console.log("MarketDetailPage directFetch: Raw details RECEIVED for ID " + numericMarketId + ":", detailsArray);

                if (!detailsArray || typeof detailsArray.exists === 'undefined' || detailsArray.length < 12) {
                    throw new Error(`Incomplete data for market ${numericMarketId}.`);
                }
                
                const idBN = detailsArray.id !== undefined ? detailsArray.id : detailsArray[0];
                const assetSymbolStr = detailsArray.assetSymbol !== undefined ? detailsArray.assetSymbol : detailsArray[1];
                const priceFeedAddressStr = detailsArray.priceFeedAddress !== undefined ? detailsArray.priceFeedAddress : detailsArray[2];
                const targetPriceBN = detailsArray.targetPrice !== undefined ? detailsArray.targetPrice : detailsArray[3];
                const expiryTimestampBN = detailsArray.expiryTimestamp !== undefined ? detailsArray.expiryTimestamp : detailsArray[4];
                const resolutionTimestampBN = detailsArray.resolutionTimestamp !== undefined ? detailsArray.resolutionTimestamp : detailsArray[5];
                const totalStakedYesBN = detailsArray.totalStakedYes !== undefined ? detailsArray.totalStakedYes : detailsArray[6];
                const totalStakedNoBN = detailsArray.totalStakedNo !== undefined ? detailsArray.totalStakedNo : detailsArray[7];
                const stateEnum = detailsArray.state !== undefined ? detailsArray.state : detailsArray[8];
                const actualOutcomeValueBN = detailsArray.actualOutcomeValue !== undefined ? detailsArray.actualOutcomeValue : detailsArray[9];
                const existsBool = detailsArray.exists !== undefined ? detailsArray.exists : detailsArray[10];
                const isEventMarketBool = detailsArray.isEventMarket !== undefined ? detailsArray.isEventMarket : detailsArray[11];

                if (existsBool) {
                    let description = `Market #${idBN.toString()}: ${assetSymbolStr}`;
                    let humanReadableTarget = targetPriceBN.toString(); 
                    if (isEventMarketBool) { 
                        description = `${assetSymbolStr.replace(/_/g, " ")}: Will the outcome be YES?`;
                        humanReadableTarget = "YES"; 
                    } else if (assetSymbolStr.startsWith("BTC/USD_PRICE_ABOVE")) {
                        const price = parseInt(targetPriceBN.toString()) / 100; 
                        const datePart = assetSymbolStr.split("_").pop();
                        description = `Will ${assetSymbolStr.split("_PRICE_ABOVE_")[0].replace('BTC/USD', 'BTC/USD')} be ≥ $${price.toFixed(2)} on ${datePart}?`;
                        humanReadableTarget = `$${price.toFixed(2)}`;
                    }

                    const newMarketDetailsData = {
                        id: idBN.toString(), assetSymbol: assetSymbolStr, description, humanReadableTarget,
                        targetPriceScaled: targetPriceBN.toString(),
                        expiryTimestamp: expiryTimestampBN.toNumber(), resolutionTimestamp: resolutionTimestampBN.toNumber(),
                        totalStakedYesNet: totalStakedYesBN.toString(), totalStakedNoNet: totalStakedNoBN.toString(),   
                        status: Number(stateEnum), actualOutcomeValue: actualOutcomeValueBN.toString(), 
                        exists: existsBool, priceFeedAddress: priceFeedAddressStr, isEventMarket: isEventMarketBool 
                    };
                    setMarketDetails(newMarketDetailsData);
                    console.log("MarketDetailPage directFetch: Market details SET for ID:", idBN.toString());

                    const currentMarketStatus = Number(stateEnum);
                    if (walletAddress && predictionContractInstance &&
                        (currentMarketStatus === MarketState.Resolved_YesWon || 
                         currentMarketStatus === MarketState.Resolved_NoWon || 
                         currentMarketStatus === MarketState.Resolved_Push)) {
                        console.log(`MarketDetailPage: Market ID ${numericMarketId} RESOLVED. Checking claim for: ${walletAddress}`);
                        try {
                            const claimed = await predictionContractInstance.didUserClaim(numericMarketId, walletAddress);
                            setHasUserClaimed(claimed);
                            console.log("MarketDetailPage: didUserClaim returned:", claimed);
                            if (!claimed) {
                                const amount = await predictionContractInstance.getClaimableAmount(numericMarketId, walletAddress);
                                setClaimableAmount(amount || ethers.BigNumber.from(0));
                                console.log("MarketDetailPage: getClaimableAmount returned (raw):", amount?.toString());
                            } else { setClaimableAmount(ethers.BigNumber.from(0)); }
                        } catch (claimCheckErr) { console.error("Error checking claim status:", claimCheckErr); setError("Could not verify claim status.");}
                    } else { 
                        console.log(`MarketDetailPage: Market ID ${numericMarketId} not resolved or no wallet for claim. Status: ${currentMarketStatus}`);
                        setClaimableAmount(ethers.BigNumber.from(0)); setHasUserClaimed(false); 
                    }
                } else { setError(`Market ID ${numericMarketId} not found.`); setMarketDetails(null); }
            } catch (err) { console.error(`MarketDetailPage directFetch: ERROR for ID ${numericMarketId}:`, err); setError(err.message || "Failed to load details."); setMarketDetails(null); }
            setIsLoading(false);
        };

        if (connectionStatus?.type === 'error') {
            setError(`WalletProvider Error: ${connectionStatus.message}`); setIsLoading(false);
        } else if (predictionContractInstance) { 
            directFetch(); 
        } else { 
            console.log("MarketDetailPage useEffect: No contract from WalletProvider. Waiting.");
            setIsLoading(true); setError(null); // Ensure loading if no contract
        }
    }, [marketId, predictionContractInstance, connectionStatus, walletAddress, refreshKey]); // Added refreshKey

    const handleBetPlaced = useCallback(() => {
        console.log("MarketDetailPage: Bet placed callback. Incrementing refreshKey.");
        setMessageForForm({ text: "Bet submitted! Refreshing market state...", type: "info" }); // Give feedback
        setIsLoading(true); // Show loading during refresh
        setRefreshKey(key => key + 1); 
    }, []); 

    const handleClaimWinnings = useCallback(async () => {
        if (!predictionContractInstance || !walletAddress || !signer || !marketDetails || !marketDetails.exists || claimableAmount.isZero() || hasUserClaimed) {
            setMessageForForm({text: "Cannot claim: Conditions not met or already claimed.", type: "error"});
            return;
        }
        setIsClaiming(true); setMessageForForm({text: "Processing your claim...", type: "info"});
        try {
            const contractWithSigner = predictionContractInstance.connect(signer);
            const tx = await contractWithSigner.claimWinnings(marketDetails.id);
            console.log("Claim Winnings Tx Sent:", tx.hash);
            setMessageForForm({text: `Claim Tx Sent (${tx.hash.substring(0,10)}...). Waiting for confirmation...`, type: "info"});
            const receipt = await tx.wait(1);
            if (receipt.status === 1) {
                console.log("Claim Winnings Tx Confirmed");
                setMessageForForm({text: "Winnings claimed successfully! Market data will refresh.", type: "success"});
                setRefreshKey(key => key + 1); // Trigger a refresh to update hasUserClaimed & claimableAmount
            } else { throw new Error("Claim transaction reverted on-chain."); }
        } catch (err) {
            console.error("Error claiming winnings:", err);
            const reason = err.reason || err.data?.message || err.message || "Failed to claim winnings.";
            setMessageForForm({text: `Claim failed: ${reason}`, type: "error"});
        }
        setIsClaiming(false);
    }, [predictionContractInstance, walletAddress, signer, marketDetails, claimableAmount, hasUserClaimed]);
    
    let isMarketOpenForBetting = false;
    let currentStatusString = "Loading...";
    if (marketDetails && marketDetails.exists) { 
        console.log(
            "MarketDetailPage DEBUG RENDER: Checking 'isMarketOpenForBetting'.",
            "status:", marketDetails.status, "(type:", typeof marketDetails.status + ")",
            "MarketState.Open:", MarketState.Open, "Comparison:", marketDetails.status === MarketState.Open,
            "WalletAddress:", walletAddress, "IsCorrectNet:", isCorrectNetwork 
        );
        isMarketOpenForBetting = marketDetails.status === MarketState.Open;
        currentStatusString = getStatusString(marketDetails.status);
    }
    
    if (isLoading && !marketDetails) return <LoadingSpinner message={`Loading Market Details for ID: ${marketId}...`} />;
    if (error && !marketDetails) return <ErrorMessage title="Market Data Error" message={error} onRetry={() => setRefreshKey(k => k+1)} />;
    if (!marketDetails || !marketDetails.exists) return <div className="page-centered info-message">Market (ID: {marketId}) not found. <Link to="/predictions">Back</Link></div>;
    
    const statusClassName = `status-${currentStatusString.toLowerCase().replace(/[\s:/()]/g, '-').replace(/[^\w-]/g, '')}`;
    const canClaim = walletAddress && !hasUserClaimed && claimableAmount && !claimableAmount.isZero() && 
                     (marketDetails.status === MarketState.Resolved_YesWon || 
                      marketDetails.status === MarketState.Resolved_NoWon || 
                      marketDetails.status === MarketState.Resolved_Push);

    return (
        <div className="page-container market-detail-page">
            <Link to="/predictions" className="back-link">← All Prediction Markets</Link>
            <header className="market-detail-header">
                <h1>{marketDetails.description}</h1>
                <div className="market-meta">
                    <span>Expires: {formatExpiry(marketDetails.expiryTimestamp)}</span>
                    <span className={`status-badge ${statusClassName}`}>{currentStatusString}</span>
                </div>
            </header>

            <MarketResolutionDisplay marketDetails={marketDetails} />

            {/* Display page-level error if it exists and isn't a full-page blocker */}
            {error && marketDetails && marketDetails.exists && 
                <div style={{padding: '10px 0'}}><ErrorMessage title="Notice" message={error} onRetry={() => setRefreshKey(k => k+1)} /></div>}
            {/* Display loading message if refreshing details */}
            {isLoading && marketDetails && marketDetails.exists && <LoadingSpinner message="Refreshing details..." size="small"/>}

            <section className="market-data-section">
                <MarketOddsDisplay
                    totalStakedYesNet={marketDetails.totalStakedYesNet} 
                    totalStakedNoNet={marketDetails.totalStakedNoNet}  
                    marketTarget={marketDetails.humanReadableTarget}
                    assetSymbol={marketDetails.assetSymbol}
                />
                <div className="betting-section">
                    {isMarketOpenForBetting ? (
                        walletAddress ? ( 
                            isCorrectNetwork ? (
                                <PredictionForm
                                    marketId={marketDetails.id}
                                    onBetPlaced={handleBetPlaced}
                                    marketTarget={marketDetails.humanReadableTarget}
                                    assetSymbol={marketDetails.assetSymbol}
                                />
                            ) : ( <div className="network-notice"><p>⚠️ Please switch to the {targetNetworkName} network.</p></div> )
                        ) : (
                            <div className="connect-wallet-notice">
                                <p>Please connect your wallet to place a prediction.</p>
                                {connectWallet && <button onClick={connectWallet} className="button primary">Connect Wallet</button>}
                            </div>
                        )
                    ) : (
                        marketDetails.status !== MarketState.Open && // Only show if not Open (i.e., resolved, resolvable, etc.)
                        <p className="info-message">Betting for this market is closed. Status: {currentStatusString}</p>
                    )}
                     {canClaim && (
                        <div className="claim-section" style={{marginTop: '20px'}}>
                            <button onClick={handleClaimWinnings} disabled={isClaiming} className="button primary claim-button">
                                {isClaiming ? "Claiming..." : `Claim ${ethers.utils.formatUnits(claimableAmount, 18)} ${nativeTokenSymbol}`}
                            </button>
                        </div>
                    )}
                    {/* Display messages from claim/bet attempts here */}
                    {actionMessage.text && !isClaiming && !(isMarketOpenForBetting && walletAddress && isCorrectNetwork) && 
                        <p className={`form-message type-${actionMessage.type}`} style={{marginTop:'10px'}}>{actionMessage.text}</p>
                    }
                </div>
            </section>
        </div>
    );
}

export default MarketDetailPage;