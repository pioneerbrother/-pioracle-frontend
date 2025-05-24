// pioracle/src/pages/MarketDetailPage.jsx
import React, { useEffect, useState, useContext, useMemo, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { WalletContext } from '../context/WalletProvider';
import PredictionForm from '../components/predictions/PredictionForm';
import MarketOddsDisplay from '../components/predictions/MarketOddsDisplay';
import LoadingSpinner from '../components/common/LoadingSpinner';
import ErrorMessage from '../components/common/ErrorMessage';
import { ethers } from 'ethers'; // For BigNumber and formatUnits
import './MarketDetailPage.css'; 

// Define MarketState enum
const MarketState = {
    Open: 0,
    Resolvable: 1,
    Resolved_YesWon: 2, // Updated name
    Resolved_NoWon: 3,  // Updated name
    Resolved_Push: 4,
};

// getStatusString function
const getStatusString = (statusEnum) => {
    if (statusEnum === undefined || statusEnum === null) return "Loading Status...";
    switch (Number(statusEnum)) {
        case MarketState.Open: return "Open";
        case MarketState.Resolvable: return "Resolving"; // Changed for generality
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

    let outcomeDisplay = "";
    if (marketDetails.status === MarketState.Resolved_Push) {
        outcomeDisplay = "Market Pushed (Refunds Processed)";
    } else if (marketDetails.isEventMarket) {
        if (marketDetails.actualOutcomeValue?.toString() === "1") outcomeDisplay = "Actual Outcome: YES";
        else if (marketDetails.actualOutcomeValue?.toString() === "0") outcomeDisplay = "Actual Outcome: NO";
        else outcomeDisplay = `Outcome: Event Resolved (Value: ${marketDetails.actualOutcomeValue})`;
    } else { 
        try {
            // Assuming actualOutcomeValue is stored as the raw oracle value (e.g., 8 decimals for BTC/USD from Chainlink)
            // And targetPriceScaled is stored as price * 100
            const actualPrice = ethers.utils.formatUnits(marketDetails.actualOutcomeValue, 8); // Assuming 8 decimals for oracle price
            const targetPriceForDisplay = parseFloat(marketDetails.targetPriceScaled) / 100;
            
            outcomeDisplay = `Resolved Oracle Price: $${parseFloat(actualPrice).toFixed(2)} (Target was $${targetPriceForDisplay.toFixed(2)})`;
        } catch (e) {
            console.error("Error formatting resolved price:", e);
            outcomeDisplay = `Resolved Value (raw): ${marketDetails.actualOutcomeValue}`;
        }
    }

    return (
        <div className="market-resolution-info" style={{ marginTop: '10px', padding: '10px', backgroundColor: '#f0f8ff', border: '1px solid #cfe2f3', borderRadius: '4px' }}>
            <p style={{ fontWeight: 'bold', marginBottom: '5px' }}>Resolution Details:</p>
            <p>Resolved At: {formatExpiry(marketDetails.resolutionTimestamp)}</p>
            <p>{outcomeDisplay}</p>
        </div>
    );
};

// Main MarketDetailPage component function
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
    const [formMessage, setMessageForForm] = useState({text: "", type: "info"}); // For claim/bet messages


    const isCorrectNetwork = useMemo(() => {
        console.log(
            "MarketDetailPage: isCorrectNetwork CALC - chainId:", chainId, 
            "(type:", typeof chainId + ")",
            "loadedTargetChainIdHex:", loadedTargetChainIdHex,
            "(type:", typeof loadedTargetChainIdHex + ")"
        );
        if (chainId === null || chainId === undefined || !loadedTargetChainIdHex) {
            console.log("MarketDetailPage: isCorrectNetwork - returning false (missing chainId or targetChainIdHex)");
            return false;
        }
        const currentChainIdNum = typeof chainId === 'bigint' ? Number(chainId) : Number(chainId);
        const targetChainIdNum = parseInt(loadedTargetChainIdHex, 16); 
        console.log(
            `MarketDetailPage: isCorrectNetwork COMPARISON - currentNum: ${currentChainIdNum}, targetNum: ${targetChainIdNum}, Match: ${currentChainIdNum === targetChainIdNum}`
        );
        return currentChainIdNum === targetChainIdNum;
    }, [chainId, loadedTargetChainIdHex]);

    const targetNetworkName = useMemo(() => {
        if (!loadedTargetChainIdHex) return "the target network";
        const targetChainIdNum = parseInt(loadedTargetChainIdHex, 16);
        if (targetChainIdNum === 31337) return "Localhost 8545";
        if (targetChainIdNum === 80002) return "Polygon Amoy";
          
        return `Network ${loadedTargetChainIdHex}`;
    }, [loadedTargetChainIdHex]);
    
    console.log(
        `MarketDetailPage RENDER. Market ID: ${marketId}`,
        `Contract: ${!!predictionContractInstance}, WalletAddress: ${walletAddress}, ChainID: ${chainId}`,
        `IsCorrectNet (calc): ${isCorrectNetwork}, loadedTargetChainIdHex: ${loadedTargetChainIdHex}, ConnStatus Type: ${connectionStatus?.type}`
    );
    
    useEffect(() => {
        const effectMarketId = marketId; 
        console.log(
            `MarketDetailPage useEffect FIRING. For Market ID: ${effectMarketId}`,
            `Contract in Effect: ${!!predictionContractInstance}, ConnStatus Type: ${connectionStatus?.type}, WalletAddress: ${walletAddress}`
        );

        const numericMarketId = Number(effectMarketId);
        if (isNaN(numericMarketId)) {
            setError("Invalid Market ID in URL."); setIsLoading(false); return; 
        }

        const directFetch = async () => {
            console.log("MarketDetailPage directFetch: Attempting for market ID:", numericMarketId);
            setIsLoading(true); setError(null); setMarketDetails(null); 
            setClaimableAmount(ethers.BigNumber.from(0)); setHasUserClaimed(false); 

            try {
                if (!predictionContractInstance) {
                    throw new Error("Contract instance not available for fetching details.");
                }

                const detailsArray = await predictionContractInstance.getMarketStaticDetails(numericMarketId);
                console.log("MarketDetailPage directFetch: Raw details RECEIVED for ID " + numericMarketId + ":", detailsArray);

                if (!detailsArray || typeof detailsArray.exists === 'undefined' || detailsArray.length < 12) {
                    throw new Error(`Incomplete/malformed data from contract for market ${numericMarketId}. Expected 12 fields.`);
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

                    const newMarketDetails = {
                        id: idBN.toString(), assetSymbol: assetSymbolStr, description, humanReadableTarget,
                        targetPriceScaled: targetPriceBN.toString(),
                        expiryTimestamp: expiryTimestampBN.toNumber(),
                        resolutionTimestamp: resolutionTimestampBN.toNumber(),
                        totalStakedYesNet: totalStakedYesBN.toString(), 
                        totalStakedNoNet: totalStakedNoBN.toString(),   
                        status: Number(stateEnum), 
                        actualOutcomeValue: actualOutcomeValueBN.toString(), 
                        exists: existsBool, priceFeedAddress: priceFeedAddressStr,
                        isEventMarket: isEventMarketBool 
                    };
                    setMarketDetails(newMarketDetails);
                    console.log("MarketDetailPage directFetch: Market details SET for ID:", idBN.toString());

                    const currentMarketStatus = Number(stateEnum);
                    if (walletAddress && predictionContractInstance &&
                        (currentMarketStatus === MarketState.Resolved_YesWon || 
                         currentMarketStatus === MarketState.Resolved_NoWon || 
                         currentMarketStatus === MarketState.Resolved_Push)) {
                        console.log(`MarketDetailPage: Market ID ${numericMarketId} RESOLVED (status: ${currentMarketStatus}). Checking claim for user: ${walletAddress}`);
                        try {
                            const claimed = await predictionContractInstance.didUserClaim(numericMarketId, walletAddress);
                            setHasUserClaimed(claimed);
                            console.log("MarketDetailPage: didUserClaim returned:", claimed);
                            if (!claimed) {
                                const amount = await predictionContractInstance.getClaimableAmount(numericMarketId, walletAddress);
                                setClaimableAmount(amount || ethers.BigNumber.from(0));
                                console.log("MarketDetailPage: getClaimableAmount returned (raw BigNumber):", amount?.toString(), "Formatted:", amount ? ethers.utils.formatUnits(amount, 18) : "N/A");
                            } else {
                                console.log("MarketDetailPage: User already claimed.");
                                setClaimableAmount(ethers.BigNumber.from(0));
                            }
                        } catch (claimCheckErr) { console.error("MarketDetailPage: Error checking claim status:", claimCheckError); setError("Could not verify claim status.");}
                    } else {
                         console.log(`MarketDetailPage: Market ID ${numericMarketId} not resolved or no wallet for claim check. Status: ${currentMarketStatus}, Wallet: ${walletAddress}.`);
                        setClaimableAmount(ethers.BigNumber.from(0)); setHasUserClaimed(false);
                    }
                } else { setError(`Market ID ${numericMarketId} not found (exists: false).`); }
            } catch (err) { console.error(`MarketDetailPage directFetch: ERROR for ID ${numericMarketId}:`, err); setError(err.message || "Failed to load market details.");}
            setIsLoading(false);
        };

        if (connectionStatus && connectionStatus.type === 'error') {
            setError(`WalletProvider Error: ${connectionStatus.message}`); setIsLoading(false);
        } else if (predictionContractInstance) { 
            directFetch(); 
        } else { 
            console.log("MarketDetailPage useEffect: No contract instance from WalletProvider yet. Waiting.");
            setIsLoading(true); setError(null); 
        }
    }, [marketId, predictionContractInstance, connectionStatus, walletAddress]);

    const handleBetPlaced = useCallback(() => {
        console.log("MarketDetailPage: Bet placed callback. Triggering data refresh for market ID:", marketId);
        setIsLoading(true); 
        setTimeout(() => { 
            if (predictionContractInstance && !(connectionStatus?.type === 'error')) {
                const numericMarketId = Number(marketId);
                const refreshFetch = async () => { 
                     console.log("MarketDetailPage handleBetPlaced: Refreshing market ID:", numericMarketId);
                     setIsLoading(true); setError(null); 
                     try {
                        const detailsArray = await predictionContractInstance.getMarketStaticDetails(numericMarketId);
                        if (detailsArray && (detailsArray.exists !== undefined ? detailsArray.exists : detailsArray[10])) {
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

                            setMarketDetails({
                                id: idBN.toString(), assetSymbol: assetSymbolStr, description, humanReadableTarget,
                                targetPriceScaled: targetPriceBN.toString(), expiryTimestamp: expiryTimestampBN.toNumber(),
                                resolutionTimestamp: resolutionTimestampBN.toNumber(), totalStakedYesNet: totalStakedYesBN.toString(), 
                                totalStakedNoNet: totalStakedNoBN.toString(), status: Number(stateEnum), 
                                actualOutcomeValue: actualOutcomeValueBN.toString(), exists: existsBool, 
                                priceFeedAddress: priceFeedAddressStr, isEventMarket: isEventMarketBool 
                            });
                            const currentMarketStatus = Number(stateEnum);
                            if (walletAddress && (currentMarketStatus === MarketState.Resolved_YesWon || currentMarketStatus === MarketState.Resolved_NoWon || currentMarketStatus === MarketState.Resolved_Push)) {
                                const claimed = await predictionContractInstance.didUserClaim(numericMarketId, walletAddress);
                                setHasUserClaimed(claimed);
                                if (!claimed) {
                                    const amount = await predictionContractInstance.getClaimableAmount(numericMarketId, walletAddress);
                                    setClaimableAmount(amount || ethers.BigNumber.from(0));
                                } else {setClaimableAmount(ethers.BigNumber.from(0));}
                            } else {setClaimableAmount(ethers.BigNumber.from(0)); setHasUserClaimed(false);}
                        } else { setError("Refresh failed: market not found.");}
                    } catch (err) {setError("Failed to refresh market details after bet.");}
                    setIsLoading(false);
                };
                refreshFetch();
            } else { setIsLoading(false); }
        }, 3000); 
    }, [predictionContractInstance, connectionStatus, marketId, walletAddress]);

    const handleClaimWinnings = useCallback(async () => {
        if (!predictionContractInstance || !walletAddress || !signer || !marketDetails || !marketDetails.exists || claimableAmount.isZero() || hasUserClaimed) {
            setError("Cannot claim: Conditions not met or already claimed.");
            return;
        }
        setIsClaiming(true); setError(null); setMessageForForm({text: "Processing your claim...", type: "info"});
        try {
            const contractWithSigner = predictionContractInstance.connect(signer);
            const tx = await contractWithSigner.claimWinnings(marketDetails.id);
            console.log("Claim Winnings Tx Sent:", tx.hash);
            setMessageForForm({text: `Claim Tx Sent (${tx.hash.substring(0,10)}...). Waiting...`, type: "info"});
            const receipt = await tx.wait(1);
            if (receipt.status === 1) {
                console.log("Claim Winnings Tx Confirmed");
                setHasUserClaimed(true);
                setClaimableAmount(ethers.BigNumber.from(0));
                setMessageForForm({text: "Winnings claimed successfully!", type: "success"});
            } else {
                throw new Error("Claim transaction reverted on-chain.");
            }
        } catch (err) {
            console.error("Error claiming winnings:", err);
            const reason = err.reason || err.message || "Failed to claim winnings.";
            setError(reason); 
            setMessageForForm({text: `Claim failed: ${reason}`, type: "error"});
        }
        setIsClaiming(false);
    }, [predictionContractInstance, walletAddress, signer, marketDetails, claimableAmount, hasUserClaimed]); // Added signer
    
    let isMarketOpenForBetting = false;
    let currentStatusString = "Loading...";
    if (marketDetails && marketDetails.exists) { 
        console.log(
            "MarketDetailPage DEBUG RENDER: Checking 'isMarketOpenForBetting'.",
            "marketDetails.status:", marketDetails.status, "(type:", typeof marketDetails.status + ")",
            "MarketState.Open:", MarketState.Open, "(type:", typeof MarketState.Open + ")",
            "Comparison (===):", marketDetails.status === MarketState.Open,
            "WalletAddress for render:", walletAddress, "IsCorrectNet for render:", isCorrectNetwork 
        );
        isMarketOpenForBetting = marketDetails.status === MarketState.Open;
        currentStatusString = getStatusString(marketDetails.status);
    }
    
    if (isLoading) return <LoadingSpinner message={`Loading Market Details for ID: ${marketId}...`} />;
    if (error && (!marketDetails || !marketDetails.exists) ) { 
        return <ErrorMessage title="Market Display Error" message={error} onRetry={() => {if(predictionContractInstance && !(connectionStatus?.type === 'error')) { const efMid = marketId; const numMid = Number(efMid); if(!isNaN(numMid)) { const df=async()=>{ /* full directFetch logic here */ }; df();}} }} />;
    }
    if (!marketDetails || !marketDetails.exists) return <div className="page-centered info-message">Market (ID: {marketId}) not found. <Link to="/predictions">Back</Link></div>;
    
    const statusClassName = `status-${currentStatusString.toLowerCase().replace(/[\s:/()]/g, '-').replace(/[^\w-]/g, '')}`;
    const canClaim = walletAddress && !hasUserClaimed && claimableAmount && !claimableAmount.isZero() && 
                     (marketDetails.status === MarketState.Resolved_YesWon || 
                      marketDetails.status === MarketState.Resolved_NoWon || 
                      marketDetails.status === MarketState.Resolved_Push);
          // Determine the currency symbol for the claim button based on the target network
    let claimCurrencySymbol = "ETH"; // Default for Localhost
    if (loadedTargetChainIdHex) {
        const targetChainIdNum = parseInt(loadedTargetChainIdHex, 16);
        if (targetChainIdNum === 80002) { // Amoy
            claimCurrencySymbol = "MATIC";
        }
        // Add else if for Polygon Mainnet (137) if you want to explicitly show MATIC
        // else if (targetChainIdNum === 137) claimCurrencySymbol = "MATIC";
    }

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
            <MarketResolutionDisplay marketDetails={marketDetails} /> {/* Pass full details */}
            {error && <div style={{color: 'red', marginTop: '10px', padding: '10px', border: '1px solid red'}}><p>Notice: {error}</p></div>} {/* Display non-blocking errors */}
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
                        <p className="info-message">Betting for this market is closed. Status: {currentStatusString}</p>
                    )}
                     {canClaim && (
                        <div className="claim-section" style={{marginTop: '20px'}}>
                            <button onClick={handleClaimWinnings} disabled={isClaiming} className="button primary claim-button">
                                {isClaiming ? "Claiming..." : `Claim ${ethers.utils.formatUnits(claimableAmount, 18)} ${(loadedTargetChainIdHex === "0x13882" ? "MATIC" : "ETH")}`}
                            </button>
                        </div>
                    )}
                    {formMessage.text && <p className={`form-message type-${formMessage.type}`}>{formMessage.text}</p>}
                </div>
            </section>
        </div>
    );
}

export default MarketDetailPage;