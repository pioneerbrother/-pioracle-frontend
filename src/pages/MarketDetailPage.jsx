// src/pages/MarketDetailPage.jsx
import React, { useContext, useMemo, useState, useCallback, useEffect } from 'react'; // Added useState, useCallback, useEffect
import { Link, useParams } from 'react-router-dom';
import { ethers } from 'ethers'; // This should be your v5 import

import { WalletContext } from './WalletProvider';
import PredictionForm from '../components/predictions/PredictionForm';
import MarketOddsDisplay from '../components/predictions/MarketOddsDisplay';
import { getMarketDisplayProperties, MarketState } from '../utils/marketutils.js';
import LoadingSpinner from '../components/common/LoadingSpinner'; // Assuming you have this
import ErrorMessage from '../components/common/ErrorMessage';   // Assuming you have this
import './MarketDetailPage.css';

// The component now receives the raw contract data as a prop from a loader OR fetches it.
// For robustness, let's ensure it can fetch if data isn't passed (though loader is better).
function MarketDetailPage({ marketContractData: initialMarketContractData }) {
    const { marketId } = useParams();
    const { walletAddress, signer, connectWallet, nativeTokenSymbol, contract } = useContext(WalletContext) || {};

    const [marketContractData, setMarketContractData] = useState(initialMarketContractData);
    const [isLoading, setIsLoading] = useState(!initialMarketContractData); // Only load if no initial data
    const [error, setError] = useState('');

    // Fetch data if not provided by a loader or if contract changes (e.g., network switch)
    useEffect(() => {
        if (!contract || initialMarketContractData) { // If we have initial data, don't re-fetch unless contract changes
            if(initialMarketContractData && !marketContractData) setMarketContractData(initialMarketContractData);
            setIsLoading(false);
            return;
        }

        const fetchMarket = async () => {
            setIsLoading(true);
            setError('');
            try {
                const data = await contract.getMarketStaticDetails(marketId);
                if (!data || !data.exists) {
                    throw new Error(`Market #${marketId} not found.`);
                }
                setMarketContractData(data);
            } catch (err) {
                console.error(`Failed to load market #${marketId}:`, err);
                setError(err.message);
            } finally {
                setIsLoading(false);
            }
        };
        fetchMarket();
    }, [contract, marketId, initialMarketContractData, marketContractData]);


    const marketDetails = useMemo(() => {
        if (!marketContractData) return null;

        const intermediateMarket = {
            id: marketContractData[0].toString(),
            assetSymbol: marketContractData[1],
            priceFeedAddress: marketContractData[2],
            targetPrice: marketContractData[3].toString(),
            expiryTimestamp: Number(marketContractData[4]),
            resolutionTimestamp: Number(marketContractData[5]),
            totalStakedYes: marketContractData[6].toString(), // Corrected from ...Net
            totalStakedNo: marketContractData[7].toString(),  // Corrected from ...Net
            state: Number(marketContractData[8]),
            actualOutcomeValue: marketContractData[9].toString(),
            exists: marketContractData[10],
            isEventMarket: marketContractData[11],
            creationTimestamp: Number(marketContractData[12]),
        };
        
        return getMarketDisplayProperties(intermediateMarket);
    }, [marketContractData]);

    // --- Re-implement claimableAmount fetching logic and other interactions ---
    const [claimableAmount, setClaimableAmount] = useState(ethers.BigNumber.from(0));
    const [hasUserClaimed, setHasUserClaimed] = useState(false);
    const [isClaiming, setIsClaiming] = useState(false);
    const [actionMessage, setActionMessage] = useState({ text: "", type: "" });
    const [refreshKey, setRefreshKey] = useState(0); // For refreshing data after claim

    useEffect(() => {
        if (walletAddress && marketDetails && marketDetails.state >= MarketState.Resolved_YesWon && contract) {
            const checkClaimStatus = async () => {
                const numericMarketId = Number(marketDetails.id);
                const claimedStatus = await contract.didUserClaim(numericMarketId, walletAddress);
                setHasUserClaimed(claimedStatus);
                if (!claimedStatus) {
                    const amount = await contract.getClaimableAmount(numericMarketId, walletAddress);
                    setClaimableAmount(amount);
                }
            };
            checkClaimStatus();
        }
    }, [walletAddress, marketDetails, contract, refreshKey]);

    const handleClaimWinnings = useCallback(async () => {
        // Ensure all dependencies for claiming are present
        if (!contract || !signer || !marketDetails || claimableAmount.isZero()) return;
        
        setIsClaiming(true);
        setActionMessage({ text: "Processing your claim...", type: "info" });
        
        try {
            const tx = await contract.connect(signer).claimWinnings(marketDetails.id);
            await tx.wait(1);
            setActionMessage({ text: "Winnings successfully claimed!", type: "success" });
            setRefreshKey(k => k + 1); // Trigger data refresh
        } catch (err) {
            const reason = err.reason || "An unknown error occurred while claiming.";
            setActionMessage({ text: `Claim failed: ${reason}`, type: "error" });
        } finally {
            setIsClaiming(false);
        }
    }, [contract, signer, marketDetails, claimableAmount]);


    if (isLoading) return <div className="page-container"><LoadingSpinner message={`Loading Market #${marketId}...`} /></div>;
    if (error) return <div className="page-container"><ErrorMessage title="Market Data Error" message={error} /></div>;
    if (!marketDetails) return <div className="page-container"><ErrorMessage title="Not Found" message={`Market #${marketId} could not be loaded or data is invalid.`} /></div>;
    
    const isMarketOpenForBetting = marketDetails.state === MarketState.Open;
    const isWrongNetwork = walletAddress && !signer; // Assuming signer is null on wrong network
    const canClaim = !hasUserClaimed && claimableAmount.gt(0);

    return (
        <div className="page-container market-detail-page-v2">
            <header className="market-header-v2">
                <Link to="/predictions" className="back-link-v2">← All Markets</Link>
                <h1>{marketDetails.title}</h1>
                <div className="market-meta-v2">
                    <span className="meta-item">Expires: {marketDetails.expiryString}</span>
                    <span className={`status-badge ${marketDetails.statusClassName}`}>{marketDetails.statusString}</span>
                </div>
            </header>

            <div className="market-body-v2">
                <div className="market-action-zone">
                     <MarketOddsDisplay
                        totalStakedYes={marketDetails.totalStakedYes} // Using corrected prop name
                        totalStakedNo={marketDetails.totalStakedNo}   // Using corrected prop name
                        tokenSymbol={nativeTokenSymbol || "BNB"} // Default to BNB or MATIC based on context
                    />
                    
                    <div className="interaction-panel">
                        {isMarketOpenForBetting && !isWrongNetwork && walletAddress ? (
                            <PredictionForm 
                                marketId={marketDetails.id} 
                                onBetPlaced={() => setRefreshKey(k => k + 1)}
                                tokenSymbol={nativeTokenSymbol || "BNB"}
                                marketTarget={marketDetails.targetDisplay}
                                isEventMarket={marketDetails.isEventMarket}
                            />
                        ) : isMarketOpenForBetting && !walletAddress ? (
                            <div className="interaction-notice">
                                <h3>Join the Forecast</h3>
                                <p>Connect your wallet to make your prediction.</p>
                                <button onClick={connectWallet} className="button primary large">Connect Wallet</button>
                            </div>
                        ) : isWrongNetwork ? (
                             <div className="interaction-notice error">
                                <h3>Wrong Network</h3>
                                <p>Please switch to the target network to interact.</p>
                             </div>
                        ) : null }

                        {canClaim && (
                            <div className="claim-winnings-section">
                                <h4>Congratulations! You have winnings to claim.</h4>
                                <button onClick={handleClaimWinnings} disabled={isClaiming} className="button primary claim-button">
                                    {isClaiming ? "Claiming..." : `Claim ${ethers.utils.formatEther(claimableAmount)} ${nativeTokenSymbol || ''}`}
                                </button>
                            </div>
                        )}
                        
                        {!isMarketOpenForBetting && !canClaim && marketDetails.state !== MarketState.Open && (
                             <div className="info-message">Betting for this market is closed. Outcome: {marketDetails.outcomeString || 'Pending Resolution'}</div>
                        )}
                    </div>
                </div>
                 {/* You'll need to ensure resolutionText is defined or dynamically generated */}
                {marketDetails.isEventMarket && (
                    <div className="market-info-zone">
                        {/* ... Your resolution rules section ... */}
                    </div>
                )}
            </div>
        </div>
    );
}

export default MarketDetailPage;