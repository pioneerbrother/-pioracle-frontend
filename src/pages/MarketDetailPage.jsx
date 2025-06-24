// src/pages/MarketDetailPage.jsx
import React, { useEffect, useState, useContext, useCallback, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ethers } from 'ethers'; // Should be v5.x

import { WalletContext } from './WalletProvider'; 
import PredictionForm from '../components/predictions/PredictionForm';
import MarketOddsDisplay from '../components/predictions/MarketOddsDisplay';
import LoadingSpinner from '../components/common/LoadingSpinner';
import ErrorMessage from '../components/common/ErrorMessage';
import { getMarketDisplayProperties, MarketState } from '../utils/marketutils.js';
import './MarketDetailPage.css';

function MarketDetailPage() {
    const { marketId } = useParams();
    // Ensure all needed context values are destructured
    const { contract, walletAddress, signer, connectWallet, nativeTokenSymbol, chainId } = useContext(WalletContext) || {};
    
    const [marketContractData, setMarketContractData] = useState(null); // To store raw contract data
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [refreshKey, setRefreshKey] = useState(0); // State to trigger refresh

    // States for claim functionality
    const [claimableAmount, setClaimableAmount] = useState(ethers.BigNumber.from(0)); // v5
    const [hasUserClaimed, setHasUserClaimed] = useState(false);
    const [isClaiming, setIsClaiming] = useState(false);
    const [actionMessage, setActionMessage] = useState({ text: "", type: "" });

    // Effect to fetch all market data
    useEffect(() => {
        // Guard clause: Do not run if the contract is not ready or marketId is invalid
        if (!contract) {
            setIsLoading(true); // Keep showing loading spinner until contract is ready
            console.log(`MarketDetailPage (ID: ${marketId}): Waiting for contract from context (current chainId: ${chainId}).`);
            return; 
        }
        console.log(`MarketDetailPage (ID: ${marketId}): Contract received for chainId ${chainId}. RefreshKey: ${refreshKey}`);

        const numericMarketId = Number(marketId);
        if (isNaN(numericMarketId)) {
            setError("Invalid Market ID in URL.");
            setIsLoading(false);
            return;
        }

        const fetchAllMarketData = async () => {
            setIsLoading(true);
            setError(null);
            // Reset claimable states on each fetch as well
            setClaimableAmount(ethers.BigNumber.from(0));
            setHasUserClaimed(false);
            setActionMessage({ text: "", type: "" });
            console.log(`MarketDetailPage (ID: ${marketId}): Fetching data for market...`);

            try {
                const detailsArray = await contract.getMarketStaticDetails(numericMarketId);
                console.log(`MarketDetailPage (ID: ${marketId}): Raw details from contract:`, JSON.parse(JSON.stringify(detailsArray)));
                
                if (!detailsArray || detailsArray.exists !== true) {
                    throw new Error(`Market #${numericMarketId} could not be found or does not exist on chain ${chainId}.`);
                }
                
                setMarketContractData(detailsArray); // Store raw data

                // Check claim status if market is resolved and user is connected
                const tempMarketState = Number(detailsArray[8]); // state is at index 8
                const marketIsResolved = tempMarketState >= MarketState.Resolved_YesWon && tempMarketState <= MarketState.Resolved_Tied_Refund;

                if (walletAddress && marketIsResolved) {
                    console.log(`MarketDetailPage (ID: ${marketId}): Market is resolved, checking claim status for ${walletAddress}`);
                    const claimedStatus = await contract.didUserClaim(numericMarketId, walletAddress);
                    setHasUserClaimed(claimedStatus);
                    console.log(`MarketDetailPage (ID: ${marketId}): User claimed status: ${claimedStatus}`);
                    if (!claimedStatus) {
                        const amount = await contract.getClaimableAmount(numericMarketId, walletAddress);
                        setClaimableAmount(amount);
                        console.log(`MarketDetailPage (ID: ${marketId}): Claimable amount: ${ethers.utils.formatEther(amount)}`);
                    }
                }
            } catch (err) {
                console.error(`MarketDetailPage (ID: ${marketId}): Error fetching market details:`, err);
                setError(err.message || "An unknown error occurred.");
            } finally {
                setIsLoading(false);
                 console.log(`MarketDetailPage (ID: ${marketId}): Fetching complete.`);
            }
        };

        fetchAllMarketData();
    }, [marketId, contract, walletAddress, refreshKey, chainId]); // Added chainId to re-fetch if network changes

    // Memoized processing of market details for UI display
 // src/pages/MarketDetailPage.jsx

    const marketDetails = useMemo(() => {
        console.log(`MarketDetailPage (ID: ${marketId}): marketContractData input to useMemo:`, JSON.parse(JSON.stringify(marketContractData)));
        if (!marketContractData) {
            console.log(`MarketDetailPage (ID: ${marketId}): marketContractData is null, returning null for marketDetails.`);
            return null;
        }
        
        const intermediateMarket = {
            id: marketContractData[0].toString(),
            assetSymbol: marketContractData[1],
            priceFeedAddress: marketContractData[2],
            targetPrice: marketContractData[3].toString(),
            expiryTimestamp: Number(marketContractData[4]),
            resolutionTimestamp: Number(marketContractData[5]),
            totalStakedYes: marketContractData[6].toString(),
            totalStakedNo: marketContractData[7].toString(), 
            state: Number(marketContractData[8]),
            actualOutcomeValue: marketContractData[9].toString(),
            exists: marketContractData[10],
            isEventMarket: marketContractData[11],
            creationTimestamp: Number(marketContractData[12]),
        };
        console.log(`MarketDetailPage (ID: ${marketId}): Intermediate data for getMarketDisplayProperties:`, intermediateMarket);
        const displayProps = getMarketDisplayProperties(intermediateMarket);
        console.log(`MarketDetailPage (ID: ${marketId}): Data AFTER getMarketDisplayProperties (this becomes marketDetails):`, displayProps);
        return displayProps;
    }, [marketContractData, marketId]);

    const handleClaimWinnings = useCallback(async () => {
        if (!contract || !signer || !marketDetails || claimableAmount.isZero()) {
            console.log("MarketDetailPage: Claim conditions not met.", {contract:!!contract, signer:!!signer, marketDetails:!!marketDetails, claimableAmount: claimableAmount.toString()});
            return;
        }
        
        setIsClaiming(true);
        setActionMessage({ text: "Processing your claim...", type: "info" });
        
        try {
            // marketDetails.id should be a string here
            const tx = await contract.connect(signer).claimWinnings(marketDetails.id);
            await tx.wait(1);
            setActionMessage({ text: "Winnings successfully claimed!", type: "success" });
            setRefreshKey(k => k + 1); // Trigger data refresh to update claim status and balance
        } catch (err) {
            const reason = err.reason || err.message || "An unknown error occurred while claiming.";
            console.error("MarketDetailPage: Claim failed error object:", err);
            setActionMessage({ text: `Claim failed: ${reason}`, type: "error" });
        } finally {
            setIsClaiming(false);
        }
    }, [contract, signer, marketDetails, claimableAmount]); // Removed setRefreshKey from here, it's passed

    // Define resolutionText or fetch it if it's dynamic
    const resolutionText = marketDetails?.resolutionText || "Resolution details for this market will be determined based on its specific terms and verifiable source of truth as defined at its creation.";

    if (isLoading) return <div className="page-container"><LoadingSpinner message={`Loading Market #${marketId}...`} /></div>;
    if (error) return <div className="page-container"><ErrorMessage title="Market Data Error" message={error} /></div>;
    if (!marketDetails) return <div className="page-container"><ErrorMessage title="Not Found" message={`Market #${marketId} data could not be processed or displayed.`} /></div>;

    // Determine UI states based on processed marketDetails
    const isMarketOpenForBetting = marketDetails.state === MarketState.Open;
    // signer is null if wallet is connected to an unsupported/wrong network by WalletProvider logic
    const isWrongNetwork = walletAddress && !signer && (Number(chainId) !== Number(marketDetails.expectedChainId)); // You might need expectedChainId in marketDetails if it can vary
    const canClaim = !hasUserClaimed && claimableAmount.gt(0);

    return (
        <div className="page-container market-detail-page-v2">
            <header className="market-header-v2">
                <Link to="/predictions" className="back-link-v2">← All Markets</Link>
                <h1>{marketDetails.title}</h1>
                <div className="market-meta-v2">
                    <span className="meta-item">Chain ID: {chainId}</span> {/* Display current chain context */}
                    <span className="meta-item">Expires: {marketDetails.expiryString}</span>
                    <span className={`status-badge ${marketDetails.statusClassName}`}>{marketDetails.statusString}</span>
                </div>
            </header>

            <div className="market-body-v2">
                <div className="market-action-zone">
                    <MarketOddsDisplay
                        totalStakedYes={marketDetails.totalStakedYes} // Pass correct props
                        totalStakedNo={marketDetails.totalStakedNo}   // Pass correct props
                        tokenSymbol={nativeTokenSymbol || (chainId === 137 ? "MATIC" : "BNB")} // Dynamic fallback
                    />
                    
                    <div className="interaction-panel">
                        {isMarketOpenForBetting && walletAddress && signer ? ( // Check for signer too
                            <PredictionForm 
                                marketId={marketDetails.id} 
                                onBetPlaced={() => setRefreshKey(k => k + 1)} // This updates refreshKey in this component
                                tokenSymbol={nativeTokenSymbol || (chainId === 137 ? "MATIC" : "BNB")}
                                marketTarget={marketDetails.targetDisplay}
                                isEventMarket={marketDetails.isEventMarket}
                            />
                        ) : isMarketOpenForBetting && !walletAddress ? (
                            <div className="interaction-notice">
                                <h3>Join the Forecast</h3>
                                <p>Connect your wallet to make your prediction.</p>
                                <button onClick={connectWallet} className="button primary large">Connect Wallet</button>
                            </div>
                        ) : isWrongNetwork ? ( // This condition might need refinement based on how you handle wrong network
                             <div className="interaction-notice error">
                                <h3>Wrong Network</h3>
                                <p>Please switch to the correct network for this market or connect your wallet if not connected.</p>
                                {!walletAddress && <button onClick={connectWallet} className="button primary large">Connect Wallet</button>}
                             </div>
                        ) : !isMarketOpenForBetting && marketDetails.state !== MarketState.Open ? ( // Market is closed or resolved
                             <div className="info-message">Betting for this market is closed. Outcome: {marketDetails.outcomeString || 'Pending Final Resolution'}</div>
                        ) : null }


                        {actionMessage.text && ( // Display bet/claim messages
                            <div className={`form-message ${actionMessage.type} wide-message`}>
                                {actionMessage.text}
                            </div>
                        )}

                        {canClaim && (
                            <div className="claim-winnings-section">
                                <h4>Congratulations! You have winnings to claim.</h4>
                                <button onClick={handleClaimWinnings} disabled={isClaiming} className="button primary claim-button">
                                    {isClaiming ? "Claiming..." : `Claim ${ethers.utils.formatEther(claimableAmount)} ${nativeTokenSymbol || (chainId === 137 ? "MATIC" : "BNB")}`}
                                </button>
                            </div>
                        )}
                    </div>
                </div>
                
                {marketDetails.isEventMarket && (
                    <div className="market-info-zone">
                        <section className="market-rules-card">
                           <div className="rules-card-inner"></div>
                            <div className="rules-card-header">
                                {/* Replace with your icon if you have one */}
                                {/* <img src="/images/icons/scales-of-justice-icon.svg" alt="Resolution Rules" className="rules-icon" /> */}
                                <h3>Resolution Source & Rules</h3>
                            </div>
                            <div className="rules-card-body">
                                <p>{resolutionText}</p>
                                {/* You might want to fetch and display the specific resolution details stored on-chain for this market if available */}
                            </div>
                            <div className="rules-card-footer">
                                <span>Resolution criteria as defined by market creator.</span>
                            </div>
                        </section>
                    </div>
                )}
            </div>
        </div>
    );
}

export default MarketDetailPage;