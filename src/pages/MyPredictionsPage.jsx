import React, { useState, useEffect, useContext, useCallback,useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ethers } from 'ethers';
import { WalletContext } from '../context/WalletProvider';
import LoadingSpinner from '../components/common/LoadingSpinner';
import ErrorMessage from '../components/common/ErrorMessage';
// Assuming your utils file is correctly named and located
import { 
    getMarketDisplayProperties, 
    MarketState as MarketStateEnumFromUtil,
    getStatusString as getStatusStringFromUtil,
    formatToUTC as formatToUTCFromUtil
} from '../utils/marketutils.js'; // <<<< CORRECTED: Explicit .js and correct case
import './MyPredictionsPage.css'; // Create this CSS file for styling

const MarketState = MarketStateEnumFromUtil; // Alias for clarity
const getStatusString = getStatusStringFromUtil;
const formatTimestampToUTC = formatToUTCFromUtil;

function MyPredictionsPage() {
    const { walletAddress, contract: predictionContractInstance, signer, provider, loadedTargetChainIdHex } = useContext(WalletContext);
    const [userPredictions, setUserPredictions] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [isClaiming, setIsClaiming] = useState(null); // Store marketId being claimed
    const [claimMessage, setClaimMessage] = useState({ marketId: null, text: '', type: '' });

    const nativeTokenSymbol = useMemo(() => { /* ... (copy from MarketDetailPage or make global util) ... */ 
        if (loadedTargetChainIdHex) {
            const id = parseInt(loadedTargetChainIdHex.startsWith('0x') ? loadedTargetChainIdHex : `0x${loadedTargetChainIdHex}`, 16);
            if (id === 137 || id === 80002) return "MATIC";
        }
        return "ETH";
    }, [loadedTargetChainIdHex]);

    const fetchUserPredictions = useCallback(async () => {
        if (!walletAddress || !predictionContractInstance || !provider) {
            setUserPredictions([]);
            setError(walletAddress ? "Could not load prediction history. Contract or provider not ready." : "Please connect your wallet to see your prediction history.");
            setIsLoading(false);
            return;
        }

        setIsLoading(true);
        setError(null);
        setUserPredictions([]); // Clear previous results

        try {
            console.log("Fetching BetPlaced events for user:", walletAddress);
            const betPlacedFilter = predictionContractInstance.filters.BetPlaced(null, walletAddress);
            // Querying all events can be slow. Consider pagination or a limited block range for production.
            // For now, fetching all.
            const pastBets = await predictionContractInstance.queryFilter(betPlacedFilter, 0, 'latest'); // From block 0 to latest
            console.log(`Found ${pastBets.length} BetPlaced events.`);

            if (pastBets.length === 0) {
                setUserPredictions([]);
                setIsLoading(false);
                return;
            }
             
            // Deduplicate market IDs in case user bet multiple times on the same market (though your contract might prevent this for the same outcome)
            const uniqueMarketIds = [...new Set(pastBets.map(event => event.args.marketId.toString()))];
            console.log("Unique market IDs participated in:", uniqueMarketIds);

            const predictionsData = [];
            for (const marketIdStr of uniqueMarketIds) {
                const marketId = ethers.BigNumber.from(marketIdStr);
                try {
                    const detailsArray = await predictionContractInstance.getMarketStaticDetails(marketId);
                    // Assuming getMarketStaticDetails returns an array-like object
                    const rawMarketData = {
                        id: detailsArray[0].toString(),
                        assetSymbol: detailsArray[1],
                        priceFeedAddress: detailsArray[2],
                        targetPrice: detailsArray[3].toString(),
                        expiryTimestamp: Number(detailsArray[4]),
                        resolutionTimestamp: Number(detailsArray[5]),
                        totalStakedYesNet: detailsArray[6].toString(),
                        totalStakedNoNet: detailsArray[7].toString(),
                        state: Number(detailsArray[8]),
                        actualOutcomeValue: detailsArray[9].toString(),
                        exists: detailsArray[10],
                        isEventMarket: detailsArray[11],
                        creationTimestamp: detailsArray.length > 12 ? Number(detailsArray[12]) : 0,
                        oracleDecimals: 8 // Will be updated if price feed market
                    };

                    if (!rawMarketData.exists) continue;

                    const displayProps = getMarketDisplayProperties(rawMarketData);
                    let userSpecificData = {
                        userPredictedYes: null, // Determine from their specific bet(s) on this market
                        userStakeAmount: ethers.BigNumber.from(0), // Sum of their stakes on this market
                        claimableAmount: ethers.BigNumber.from(0),
                        hasUserClaimed: false,
                    };
                    
                    // Find user's bets for this specific marketId to determine their side and total stake
                    let totalUserStakeOnYes = ethers.BigNumber.from(0);
                    let totalUserStakeOnNo = ethers.BigNumber.from(0);

                    pastBets.forEach(event => {
                        if (event.args.marketId.eq(marketId)) {
                            const netAmount = event.args.netAmountPooled; // netAmountPooled from BetPlaced event
                            if (event.args.predictedYes) {
                                totalUserStakeOnYes = totalUserStakeOnYes.add(netAmount);
                            } else {
                                totalUserStakeOnNo = totalUserStakeOnNo.add(netAmount);
                            }
                        }
                    });
                    
                    // Determine what the user predicted for this market.
                    // This simple logic assumes user bets on one side only per market.
                    // If multiple bets on different sides are allowed, this needs more complex handling.
                    if (totalUserStakeOnYes.gt(0) && totalUserStakeOnNo.eq(0)) {
                        userSpecificData.userPredictedYes = true;
                        userSpecificData.userStakeAmount = totalUserStakeOnYes;
                    } else if (totalUserStakeOnNo.gt(0) && totalUserStakeOnYes.eq(0)) {
                        userSpecificData.userPredictedYes = false;
                        userSpecificData.userStakeAmount = totalUserStakeOnNo;
                    } else if (totalUserStakeOnYes.gt(0) && totalUserStakeOnNo.gt(0)) {
                        // User bet on both sides - more complex scenario, how to display?
                        // For now, let's just sum them and maybe indicate "Multiple Positions"
                        userSpecificData.userPredictedYes = "Multiple"; // Or handle as per your platform rules
                        userSpecificData.userStakeAmount = totalUserStakeOnYes.add(totalUserStakeOnNo);
                    }


                    const resolvedStates = [
                        MarketState.Resolved_YesWon, MarketState.Resolved_NoWon, MarketState.Resolved_Push,
                        MarketState.ResolvedEarly_YesWon, MarketState.ResolvedEarly_NoWon
                    ];

                    if (resolvedStates.includes(rawMarketData.state)) {
                        userSpecificData.hasUserClaimed = await predictionContractInstance.didUserClaim(marketId, walletAddress);
                        if (!userSpecificData.hasUserClaimed) {
                            const claimable = await predictionContractInstance.getClaimableAmount(marketId, walletAddress);
                            userSpecificData.claimableAmount = claimable || ethers.BigNumber.from(0);
                        }
                    }
                    
                    predictionsData.push({ ...rawMarketData, ...displayProps, ...userSpecificData });

                } catch (marketErr) {
                    console.error(`Error fetching details for market ID ${marketIdStr}:`, marketErr);
                    // Optionally add a placeholder for this market with an error state
                }
            }
            // Sort by expiry or creation date if desired
            predictionsData.sort((a,b) => (b.expiryTimestamp || 0) - (a.expiryTimestamp || 0)); // Newest expiry first
            setUserPredictions(predictionsData);

        } catch (e) {
            console.error("Error fetching user prediction history:", e);
            setError("Failed to load your prediction history. Please try again.");
        }
        setIsLoading(false);
    }, [walletAddress, predictionContractInstance, provider]);

    useEffect(() => {
        fetchUserPredictions();
    }, [fetchUserPredictions]); // Runs when walletAddress or contract instance changes

    const handleClaim = useCallback(async (marketIdToClaim) => {
        if (!predictionContractInstance || !walletAddress || !signer) {
            setClaimMessage({ marketId: marketIdToClaim, text: "Wallet not connected or contract issue.", type: 'error' });
            return;
        }
        setIsClaiming(marketIdToClaim);
        setClaimMessage({ marketId: marketIdToClaim, text: "Processing your claim...", type: 'info' });
        try {
            const contractWithSigner = predictionContractInstance.connect(signer);
            const tx = await contractWithSigner.claimWinnings(marketIdToClaim);
            setClaimMessage({ marketId: marketIdToClaim, text: `Claim Tx Sent (${tx.hash.substring(0,10)}...). Waiting...`, type: 'info' });
            await tx.wait(1);
            setClaimMessage({ marketId: marketIdToClaim, text: "Winnings claimed successfully!", type: 'success' });
            // Refresh data for this specific market or re-fetch all predictions
            fetchUserPredictions(); // Re-fetch all to update claim status and amounts
        } catch (err) {
            console.error("Error claiming winnings:", err);
            const reason = err.reason || err.data?.message || err.message || "Failed to claim winnings.";
            setClaimMessage({ marketId: marketIdToClaim, text: `Claim failed: ${reason}`, type: 'error' });
        }
        setIsClaiming(null);
    }, [predictionContractInstance, walletAddress, signer, fetchUserPredictions]);


    if (!walletAddress) {
        return (
            <div className="page-container my-predictions-page">
                <h2>My Prediction History</h2>
                <p className="info-message">Please connect your wallet to view your prediction history.</p>
            </div>
        );
    }
    
    if (isLoading) return <LoadingSpinner message="Loading your prediction history..." />;
    if (error) return <ErrorMessage title="Error" message={error} />;

    return (
        <div className="page-container my-predictions-page">
            <h2>My Prediction History</h2>
            {userPredictions.length === 0 && !isLoading && (
                <p>You haven't placed any predictions yet, or we're still fetching your history.</p>
            )}
            {userPredictions.map(pred => (
                <div key={pred.id} className="prediction-history-item card">
                    <Link to={`/predictions/${pred.id}`} className="market-link">
                        <h4>{pred.title || `Market ID: ${pred.id}`}</h4>
                    </Link>
                    <p><strong>Symbol:</strong> {pred.assetSymbol}</p>
                    <p><strong>Your Prediction:</strong> 
                        {pred.userPredictedYes === true ? "YES (Price ≥ Target)" : 
                         pred.userPredictedYes === false ? "NO (Price < Target)" : 
                         pred.userPredictedYes === "Multiple" ? "Multiple Positions" : "N/A"}
                    </p>
                    <p><strong>Your Total Stake:</strong> {ethers.utils.formatUnits(pred.userStakeAmount, 18)} {nativeTokenSymbol}</p>
                    <p><strong>Status:</strong> <span className={`status-badge ${pred.statusClassName}`}>{pred.statusString}</span></p>
                    {pred.resolutionTimestamp > 0 && (
                        <p><strong>Resolved At:</strong> {formatTimestampToUTC(pred.resolutionTimestamp)}</p>
                    )}
                    <p><strong>Expires:</strong> {pred.expiryString}</p>

                    {pred.claimableAmount && pred.claimableAmount.gt(0) && !pred.hasUserClaimed && (
                        <div className="claim-section">
                            <p style={{color: 'green', fontWeight: 'bold'}}>
                                Claimable: {ethers.utils.formatUnits(pred.claimableAmount, 18)} {nativeTokenSymbol}
                            </p>
                            <button 
                                onClick={() => handleClaim(pred.id)} 
                                disabled={isClaiming === pred.id}
                                className="button primary claim-button"
                            >
                                {isClaiming === pred.id ? "Claiming..." : "Claim Winnings"}
                            </button>
                        </div>
                    )}
                    {pred.hasUserClaimed && pred.claimableAmount && pred.claimableAmount.gt(0) && (
                        <p style={{color: 'grey'}}>Winnings Claimed ({ethers.utils.formatUnits(pred.claimableAmount, 18)} {nativeTokenSymbol})</p>
                    )}
                    {claimMessage && claimMessage.marketId === pred.id && (
                        <p className={`form-message type-${claimMessage.type}`} style={{marginTop:'5px'}}>{claimMessage.text}</p>
                    )}
                </div>
            ))}
        </div>
    );
}

export default MyPredictionsPage;