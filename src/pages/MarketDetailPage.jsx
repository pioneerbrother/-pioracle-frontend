// src/pages/MarketDetailPage.jsx
import React, { useEffect, useState, useContext, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ethers } from 'ethers';

import { WalletContext } from './WalletProvider'; 
import PredictionForm from '../components/predictions/PredictionForm';
import MarketOddsDisplay from '../components/predictions/MarketOddsDisplay';
import LoadingSpinner from '../components/common/LoadingSpinner';
import ErrorMessage from '../components/common/ErrorMessage';
import { getMarketDisplayProperties, MarketState } from '../utils/marketutils.js';
import './MarketDetailPage.css'; // Make sure this CSS file is imported

function MarketDetailPage() {
    const { marketId } = useParams();
    const { contract, walletAddress, signer, connectWallet, nativeTokenSymbol } = useContext(WalletContext) || {};
    
    const [marketDetails, setMarketDetails] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [refreshKey, setRefreshKey] = useState(0);

    const [claimableAmount, setClaimableAmount] = useState(ethers.BigNumber.from(0));
    const [hasUserClaimed, setHasUserClaimed] = useState(false);
    const [isClaiming, setIsClaiming] = useState(false);
    const [actionMessage, setActionMessage] = useState({ text: "", type: "" });

    useEffect(() => {
        if (!contract) {
            setIsLoading(true);
            return;
        }

        const numericMarketId = Number(marketId);
        if (isNaN(numericMarketId)) {
            setError("Invalid Market ID in URL.");
            setIsLoading(false);
            return;
        }

        const fetchAllMarketData = async () => {
            setIsLoading(true);
            setError(null);

            try {
                const detailsArray = await contract.getMarketStaticDetails(numericMarketId);
                
                if (!detailsArray || detailsArray.exists !== true) {
                    throw new Error(`Market #${numericMarketId} could not be found.`);
                }
                
                const intermediateMarket = {
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
                    creationTimestamp: Number(detailsArray[12]),
                };
                
                const finalMarketDetails = getMarketDisplayProperties(intermediateMarket);
                setMarketDetails(finalMarketDetails);

                const marketIsResolved = finalMarketDetails.state >= MarketState.Resolved_YesWon;
                if (walletAddress && marketIsResolved) {
                    const claimedStatus = await contract.didUserClaim(numericMarketId, walletAddress);
                    setHasUserClaimed(claimedStatus);
                    if (!claimedStatus) {
                        const amount = await contract.getClaimableAmount(numericMarketId, walletAddress);
                        setClaimableAmount(amount);
                    }
                }
            } catch (err) {
                setError(err.message);
            } finally {
                setIsLoading(false);
            }
        };

        fetchAllMarketData();
    }, [marketId, contract, walletAddress, refreshKey]);

    const handleClaimWinnings = useCallback(async () => {
        // ... (claim winnings logic remains the same) ...
    }, [contract, signer, marketDetails, claimableAmount]);

    const resolutionText = (marketDetails && marketDetails.assetSymbol.includes('US_STRIKE_IRAN')) 
        ? "This market covers the period from July 5, 2025, 00:00 UTC to July 18, 2025, 23:59 UTC. It will resolve to YES if the United States government officially orders or carries out military strikes on targets within Iran during this specific two-week window..."
        : "The resolution of this market is determined by the specific terms and verifiable source of truth defined at the time of its creation.";

    if (isLoading) return <div className="page-container"><LoadingSpinner message={`Loading Market #${marketId}...`} /></div>;
    if (error) return <div className="page-container"><ErrorMessage title="Market Data Error" message={error} /></div>;
    if (!marketDetails) return <div className="page-container"><ErrorMessage title="Not Found" message={`Market #${marketId} could not be loaded.`} /></div>;

    const isMarketOpenForBetting = marketDetails.state === MarketState.Open;
    const isWrongNetwork = walletAddress && !signer;
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
                        totalStakedYesNet={marketDetails.totalStakedYesNet}
                        totalStakedNoNet={marketDetails.totalStakedNoNet}
                        tokenSymbol={nativeTokenSymbol || "MATIC"}
                    />
                    
                    <div className="interaction-panel">
                        {isMarketOpenForBetting && !isWrongNetwork && walletAddress ? (
                            <PredictionForm 
                                marketId={marketDetails.id} 
                                onBetPlaced={() => setRefreshKey(k => k + 1)}
                                tokenSymbol={nativeTokenSymbol || "MATIC"}
                                marketTarget={marketDetails.targetDisplay}
                                isEventMarket={marketDetails.isEventMarket}
                            />
                        ) : isMarketOpenForBetting && !walletAddress ? (
                        // --- AFTER ---
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
                                    {isClaiming ? "Claiming..." : `Claim ${ethers.utils.formatEther(claimableAmount)} MATIC`}
                                </button>
                            </div>
                        )}
                        
                        {!isMarketOpenForBetting && !canClaim && (
                            <div className="info-message">Betting for this market is closed.</div>
                        )}
                    </div>
                </div>

                {marketDetails.isEventMarket && (
                    <div className="market-info-zone">
                        <section className="market-rules-section">
                            <h3>Resolution Rules</h3>
                            <p>{resolutionText}</p>
                        </section>
                    </div>
                )}
            </div>
        </div>
    );
}

export default MarketDetailPage;