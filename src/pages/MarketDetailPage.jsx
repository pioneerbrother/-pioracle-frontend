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
import './MarketDetailPage.css';

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
            setClaimableAmount(ethers.BigNumber.from(0));
            setHasUserClaimed(false);
            setActionMessage({ text: "", type: "" });

            try {
                const detailsArray = await contract.getMarketStaticDetails(numericMarketId);
                
                if (!detailsArray || detailsArray.exists !== true) {
                    throw new Error(`Market #${numericMarketId} could not be found or does not exist.`);
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
                    // You might need to add resolutionDetails if it comes from the contract
                    // resolutionDetails: detailsArray[13] 
                };
                
                const finalMarketDetails = getMarketDisplayProperties(intermediateMarket);
                setMarketDetails(finalMarketDetails);

                const marketIsResolved = finalMarketDetails.state >= 2;
                if (walletAddress && marketIsResolved) {
                    const claimedStatus = await contract.didUserClaim(numericMarketId, walletAddress);
                    setHasUserClaimed(claimedStatus);
                    if (!claimedStatus) {
                        const amount = await contract.getClaimableAmount(numericMarketId, walletAddress);
                        setClaimableAmount(amount);
                    }
                }
            } catch (err) {
                console.error("Error fetching market details:", err);
                setError(err.message);
            } finally {
                setIsLoading(false);
            }
        };

        fetchAllMarketData();
    }, [marketId, contract, walletAddress, refreshKey]);

    const handleClaimWinnings = useCallback(async () => {
        if (!contract || !signer || !marketDetails || claimableAmount.isZero()) return;
        
        setIsClaiming(true);
        setActionMessage({ text: "Processing your claim...", type: "info" });
        
        try {
            const tx = await contract.connect(signer).claimWinnings(marketDetails.id);
            await tx.wait(1);
            setActionMessage({ text: "Winnings successfully claimed!", type: "success" });
            setRefreshKey(k => k + 1);
        } catch (err) {
            const reason = err.reason || "An unknown error occurred while claiming.";
            setActionMessage({ text: `Claim failed: ${reason}`, type: "error" });
        } finally {
            setIsClaiming(false);
        }
    }, [contract, signer, marketDetails, claimableAmount]);

    // Hardcoded resolution text for specific markets.
    // In the future, this should come from a database or off-chain store.
    const resolutionText = marketDetails && marketDetails.assetSymbol.includes('US_STRIKE_IRAN') 
        ? "This market covers the period from July 5, 2025, 00:00 UTC to July 18, 2025, 23:59 UTC. It will resolve to YES if the United States government officially orders or carries out military strikes on targets within Iran during this specific two-week window. Resolution will be based on announcements from the White House, the Pentagon, or confirmed reports from at least two major international news agencies (e.g., Reuters, Associated Press). If no strikes occur within this timeframe, it resolves to NO."
        : "The resolution of this market is determined by the specific terms and verifiable source of truth defined at the time of its creation.";


    if (isLoading) {
        return <div className="page-container"><LoadingSpinner message={`Loading Market #${marketId}...`} /></div>;
    }
    if (error) {
        return <div className="page-container"><ErrorMessage title="Market Data Error" message={error} /></div>;
    }
    if (!marketDetails) {
        return <div className="page-container"><ErrorMessage title="Not Found" message={`Market #${marketId} could not be loaded.`} /></div>;
    }

    const isMarketOpenForBetting = marketDetails.state === MarketState.Open;
    const isWrongNetwork = walletAddress && !signer;
    const canClaim = !hasUserClaimed && claimableAmount.gt(0);

    return (
        <div className="page-container market-detail-page">
            <Link to="/predictions" className="back-link">← All Prediction Markets</Link>
            
            <header className="market-detail-header">
                <h1>{marketDetails.title}</h1>
                <div className="market-meta">
                    <span>Expires: {marketDetails.expiryString}</span>
                    <span className={`status-badge ${marketDetails.statusClassName}`}>{marketDetails.statusString}</span>
                </div>
            </header>
            
            <section className="market-main-content">
                <div className="probabilities-container">
                    <MarketOddsDisplay
                        totalStakedYesNet={marketDetails.totalStakedYesNet}
                        totalStakedNoNet={marketDetails.totalStakedNoNet}
                        tokenSymbol={nativeTokenSymbol || "MATIC"}
                    />
                </div>
                <div className="interaction-container">
                    {isMarketOpenForBetting && !isWrongNetwork && walletAddress && (
                        <PredictionForm 
                            marketId={marketDetails.id} 
                            onBetPlaced={() => setRefreshKey(k => k + 1)}
                            tokenSymbol={nativeTokenSymbol || "MATIC"}
                            marketTarget={marketDetails.targetDisplay}
                            isEventMarket={marketDetails.isEventMarket}
                        />
                    )}
                    
                    {isMarketOpenForBetting && !walletAddress && (
                        <div className="connect-wallet-notice">
                            <p>Please connect your wallet to place a prediction.</p>
                            <button onClick={connectWallet} className="button primary">Connect Wallet</button>
                        </div>
                    )}
                    
                    {isWrongNetwork && (
                         <div className="network-notice"><p>⚠️ Please switch to the target network to interact with this market.</p></div>
                    )}

                    {canClaim && (
                        <div className="claim-winnings-section">
                            <h4>Congratulations! You won.</h4>
                            <p>You have winnings available to claim.</p>
                            <button onClick={handleClaimWinnings} disabled={isClaiming} className="button primary claim-button">
                                {isClaiming ? "Claiming..." : `Claim ${ethers.utils.formatEther(claimableAmount)} MATIC`}
                            </button>
                        </div>
                    )}

                    {marketDetails.state >= 2 && !canClaim && hasUserClaimed && (
                        <div className="info-message">You have already claimed your winnings for this market.</div>
                    )}

                    {actionMessage.text && <p className={`form-message type-${actionMessage.type}`}>{actionMessage.text}</p>}
                </div>
            </section>

            {/* --- THIS IS THE NEW SECTION, GUARANTEED TO BE HERE --- */}
            {marketDetails.isEventMarket && (
                <section className="market-rules-section">
                    <h3>Resolution Rules</h3>
                    <p>{resolutionText}</p>
                </section>
            )}

        </div>
    );
}

export default MarketDetailPage;