// src/pages/MarketDetailPage.jsx
import React, { useEffect, useState, useContext, useCallback, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ethers } from 'ethers';

import { WalletContext } from './WalletProvider'; 
import PredictionForm from '../components/predictions/PredictionForm';
import MarketOddsDisplay from '../components/predictions/MarketOddsDisplay';
import LoadingSpinner from '../components/common/LoadingSpinner';
import ErrorMessage from '../components/common/ErrorMessage';
import { getMarketDisplayProperties, MarketState } from '../utils/marketutils.js';
import './MarketDetailPage.css';

function MarketDetailPage() { // Note: We removed the 'marketContractData' prop for this version
    const { marketId } = useParams();
    const { contract, walletAddress, signer, connectWallet, nativeTokenSymbol, chainId } = useContext(WalletContext) || {};
    
    const [marketContractData, setMarketContractData] = useState(null);
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
            console.log(`MarketDetailPage (ID: ${marketId}): Waiting for contract (current chainId: ${chainId}). RefreshKey: ${refreshKey}`);
            return; 
        }
        console.log(`MarketDetailPage (ID: ${marketId}): Contract received. ChainId: ${chainId}. RefreshKey: ${refreshKey}`);

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
            console.log(`MarketDetailPage (ID: ${marketId}): Fetching data...`);

            try {
                const detailsArray = await contract.getMarketStaticDetails(numericMarketId);
                console.log(`MarketDetailPage (ID: ${marketId}): Raw contract details:`, JSON.parse(JSON.stringify(detailsArray)));
                
                if (!detailsArray || detailsArray.exists !== true) {
                    throw new Error(`Market #${numericMarketId} not found or does not exist on chain ${chainId}.`);
                }
                setMarketContractData(detailsArray);

                const tempMarketState = Number(detailsArray[8]);
                const marketIsResolved = tempMarketState >= MarketState.Resolved_YesWon && tempMarketState <= MarketState.Resolved_Tied_Refund;

                if (walletAddress && marketIsResolved) {
                    const claimedStatus = await contract.didUserClaim(numericMarketId, walletAddress);
                    setHasUserClaimed(claimedStatus);
                    if (!claimedStatus) {
                        const amount = await contract.getClaimableAmount(numericMarketId, walletAddress);
                        setClaimableAmount(amount);
                    }
                }
            } catch (err) {
                console.error(`MarketDetailPage (ID: ${marketId}): Error fetching details:`, err);
                setError(err.message || "Unknown error.");
            } finally {
                setIsLoading(false);
            }
        };
        fetchAllMarketData();
    }, [marketId, contract, walletAddress, refreshKey, chainId]);

    const marketDetails = useMemo(() => {
        if (!marketContractData) return null;
        
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
            // If your contract returns resolution text, map it here:
            // resolutionDetailsTextFromContract: marketContractData[13]?.toString(), 
        };
        return getMarketDisplayProperties(intermediateMarket);
    }, [marketContractData]);

    const handleClaimWinnings = useCallback(async () => { /* ... same as before ... */ }, [contract, signer, marketDetails, claimableAmount]);

    // --- PLACE YOUR RESOLUTION TEXT LOGIC HERE ---
    let displayResolutionText;
    if (marketDetails?.assetSymbol === "BSC_USERS_500" || marketDetails?.id === "0" && Number(chainId) === 56) { // Check for BNB chain market
        displayResolutionText = `This market resolves to YES if the number of unique wallet addresses that have interacted with the PiOracle smart contract (0x3D93FD642837e61Ef34D6808cE0b29Ec3e15d1C8) on the BNB Smart Chain reaches 501 or more. The count will be based on publicly visible on-chain data from the BscScan contract page by checking the number of unique addresses in the 'Transactions' and 'Internal Txns' tabs. The deadline for the count is August 31, 2025, 23:59 UTC. If the unique user count is 500 or less at that time, the market resolves to NO.`;
    } 
    // Example for an old Polygon market if you know its symbol or ID
    // else if (marketDetails?.assetSymbol === "POLYGON_OLD_MARKET_SYMBOL" && Number(chainId) === 137) {
    //    displayResolutionText = "Specific resolution text for this old Polygon market...";
    // }
    // If your contract stores resolution details and you mapped it in marketDetails:
    // else if (marketDetails?.resolutionDetailsTextFromContract) { 
    //     displayResolutionText = marketDetails.resolutionDetailsTextFromContract;
    // }
    else {
        displayResolutionText = "Resolution details for this market will be determined based on its specific terms and verifiable source of truth as defined at its creation.";
    }
    // --- END OF RESOLUTION TEXT LOGIC ---

    if (isLoading) return <div className="page-container"><LoadingSpinner message={`Loading Market #${marketId}...`} /></div>;
    if (error) return <div className="page-container"><ErrorMessage title="Market Data Error" message={error} /></div>;
    if (!marketDetails) return <div className="page-container"><ErrorMessage title="Not Found" message={`Market #${marketId} data could not be processed.`} /></div>;

    const isMarketOpenForBetting = marketDetails.state === MarketState.Open;
    const isWrongNetworkLogic = walletAddress && signer && contract && (Number(chainId) !== Number(defaultTargetChainIdNum)); // Example, refine this
    const canClaim = !hasUserClaimed && claimableAmount.gt(0);

    return (
        <div className="page-container market-detail-page-v2">
            <header className="market-header-v2">
                <Link to="/predictions" className="back-link-v2">← All Markets</Link>
                <h1>{marketDetails.title}</h1>
                <div className="market-meta-v2">
                    <span className="meta-item">Chain ID: {chainId}</span>
                    <span className="meta-item">Expires: {marketDetails.expiryString}</span>
                    <span className={`status-badge ${marketDetails.statusClassName}`}>{marketDetails.statusString}</span>
                </div>
            </header>

            <div className="market-body-v2">
                <div className="market-action-zone">
                    <MarketOddsDisplay
                        totalStakedYes={marketDetails.totalStakedYes}
                        totalStakedNo={marketDetails.totalStakedNo}
                        tokenSymbol={nativeTokenSymbol || (Number(chainId) === 137 ? "MATIC" : "BNB")}
                    />
                    
                    <div className="interaction-panel">
                        {/* ... Your betting form and claim winnings JSX ... make sure to pass onBetPlaced to PredictionForm */}
                         {isMarketOpenForBetting && walletAddress && signer ? (
                            <PredictionForm 
                                marketId={marketDetails.id} 
                                onBetPlaced={() => setRefreshKey(k => k + 1)}
                                tokenSymbol={nativeTokenSymbol || (Number(chainId) === 137 ? "MATIC" : "BNB")}
                                marketTarget={marketDetails.targetDisplay}
                                isEventMarket={marketDetails.isEventMarket}
                            />
                        // ... other conditional rendering for connect button, wrong network etc. ...
                        ) : <p>Connect wallet or check network to interact.</p>}


                        {actionMessage.text && (
                            <div className={`form-message ${actionMessage.type} wide-message`}>
                                {actionMessage.text}
                            </div>
                        )}

                        {canClaim && (
                            <div className="claim-winnings-section">
                                <h4>Congratulations! You have winnings to claim.</h4>
                                <button onClick={handleClaimWinnings} disabled={isClaiming} className="button primary claim-button">
                                    {isClaiming ? "Claiming..." : `Claim ${ethers.utils.formatEther(claimableAmount)} ${nativeTokenSymbol || (Number(chainId) === 137 ? "MATIC" : "BNB")}`}
                                </button>
                            </div>
                        )}
                    </div>
                </div>
                
                {/* --- USE THE displayResolutionText VARIABLE HERE --- */}
                {marketDetails.isEventMarket && (
                    <div className="market-info-zone">
                        <section className="market-rules-card">
                           <div className="rules-card-inner"></div>
                            <div className="rules-card-header">
                                <h3>Resolution Source & Rules</h3>
                            </div>
                            <div className="rules-card-body">
                                <p>{displayResolutionText}</p> {/* <-- USING THE DYNAMIC TEXT */}
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