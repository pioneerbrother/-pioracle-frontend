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

    // --- NEW STATE FOR CLAIMING LOGIC ---
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
            setError("Invalid Market ID.");
            setIsLoading(false);
            return;
        }

        const fetchAllMarketData = async () => {
            setIsLoading(true);
            setError(null);
            setClaimableAmount(ethers.BigNumber.from(0)); // Reset on each fetch
            setHasUserClaimed(false);

            try {
                const detailsArray = await contract.getMarketStaticDetails(numericMarketId);
                if (!detailsArray || !detailsArray.exists) {
                    throw new Error(`Market ID #${numericMarketId} not found.`);
                }
                
                const intermediateMarket = { /* ... (map all details from array) ... */ };
                const finalMarketDetails = getMarketDisplayProperties(intermediateMarket);
                setMarketDetails(finalMarketDetails);

                // --- THIS IS THE CRITICAL CLAIM-CHECKING LOGIC ---
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
                setError(err.message);
            } finally {
                setIsLoading(false);
            }
        };

        fetchAllMarketData();
    }, [marketId, contract, walletAddress, refreshKey]);

    const handleClaimWinnings = useCallback(async () => {
        if (!contract || !signer || claimableAmount.isZero()) return;
        setIsClaiming(true);
        setActionMessage({ text: "Processing your claim...", type: "info" });
        try {
            const tx = await contract.connect(signer).claimWinnings(marketId);
            await tx.wait(1);
            setActionMessage({ text: "Winnings successfully claimed!", type: "success" });
            setRefreshKey(k => k + 1); // Refresh data to show updated status
        } catch (err) {
            const reason = err.reason || "An unknown error occurred.";
            setActionMessage({ text: `Claim failed: ${reason}`, type: "error" });
        }
        setIsClaiming(false);
    }, [contract, signer, marketId, claimableAmount]);

    // Determine if the claim button should be shown
    const canClaim = !hasUserClaimed && claimableAmount.gt(0);
    const isMarketOpenForBetting = marketDetails && marketDetails.state === MarketState.Open;
    const isWrongNetwork = walletAddress && !signer;


    if (isLoading) return <LoadingSpinner message="Loading Market Details..." />;
    if (error) return <ErrorMessage title="Market Data Error" message={error} />;
    if (!marketDetails) return <ErrorMessage title="Not Found" message="Market could not be loaded." />;

    return (
        <div className="page-container market-detail-page">
            <Link to="/predictions" className="back-link">← All Prediction Markets</Link>
            <header> {/* ... market header ... */} </header>
            
            {/* The main content area */}
            <section className="market-main-content">
                <div className="probabilities-container">
                    <MarketOddsDisplay /* ... props ... */ />
                </div>
                <div className="interaction-container">
                    {isMarketOpenForBetting && !isWrongNetwork && <PredictionForm /* ... props ... */ />}
                    
                    {/* ... other notices for connect wallet / wrong network ... */}

                    {/* --- THIS IS THE NEW CLAIM BUTTON UI --- */}
                    {canClaim && (
                        <div className="claim-winnings-section">
                            <h4>Congratulations!</h4>
                            <p>You correctly predicted the outcome.</p>
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
        </div>
    );
}

export default MarketDetailPage;