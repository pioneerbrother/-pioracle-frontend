// src/pages/MarketDetailPage.jsx

import React, { useEffect, useState, useContext, useMemo, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ethers } from 'ethers';
 
import PredictionForm from '../components/predictions/PredictionForm';
import MarketOddsDisplay from '../components/predictions/MarketOddsDisplay';
import LoadingSpinner from '../components/common/LoadingSpinner';
import ErrorMessage from '../components/common/ErrorMessage';
import { getMarketDisplayProperties, MarketState } from '../utils/marketutils.js';
import './MarketDetailPage.css';

function MarketDetailPage() {
    const { marketId } = useParams();
    // Destructure only what's needed to prevent unnecessary re-renders
    const { predictionMarketContract, walletAddress, chainId, isInitialized } = useContext(WalletContext);
    
    const [marketData, setMarketData] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [refreshKey, setRefreshKey] = useState(0); // To manually trigger a refresh after betting

    // Memoize the contract address to create a stable dependency for the useEffect hook
    const contractAddress = useMemo(() => predictionMarketContract?.address, [predictionMarketContract]);

    // --- THE CORRECTED useEffect HOOK ---
    useEffect(() => {
        // Define the async function inside the effect
        const fetchAllMarketData = async () => {
            // Guard clauses to prevent running with incomplete data
            if (!isInitialized || !walletAddress) {
                console.log("MDLP: Waiting for wallet/provider initialization...");
                return;
            }
            if (!predictionMarketContract) {
                setError("App not configured for this network.");
                setIsLoading(false);
                return;
            }

            console.log(`MDLP: Fetching data for market #${marketId} on chain ${chainId}...`);
            setIsLoading(true);
            setError(null);
            
            try {
                // Fetch the main market data
                const rawMarket = await predictionMarketContract.getMarketStaticDetails(marketId);

                if (!rawMarket || !rawMarket.exists) {
                    throw new Error(`Market #${marketId} does not exist on this network.`);
                }
                
                // Use the utility function to process the raw data
                const baseMarket = {
                    id: rawMarket.id.toString(),
                    assetSymbol: rawMarket.assetSymbol,
                    state: Number(rawMarket.state),
                    expiryTimestamp: Number(rawMarket.expiryTimestamp),
                    totalStakedYes: rawMarket.totalStakedYes.toString(),
                    totalStakedNo: rawMarket.totalStakedNo.toString(),
                    // Add other raw properties as needed
                };
                const formattedMarket = getMarketDisplayProperties(baseMarket);
                setMarketData(formattedMarket);
                
                // You can add logic here to fetch user-specific stakes if needed
                
            } catch (err) {
                console.error(`MDLP: Error fetching details for market #${marketId}:`, err);
                setError(err.message || "An unknown error occurred.");
            } finally {
                setIsLoading(false);
            }
        };

        fetchAllMarketData();
    
    // The dependency array is now stable. It only re-runs if the user changes
    // wallet, network, or navigates to a new marketId.
    }, [marketId, contractAddress, walletAddress, chainId, isInitialized, refreshKey]);

    // --- Render logic ---
    if (isLoading) {
        return <div className="page-container"><LoadingSpinner message={`Loading Market #${marketId}...`} /></div>;
    }
    
    if (error) {
        return <div className="page-container"><ErrorMessage title="Market Data Error" message={error} /></div>;
    }

    if (!marketData) {
        return <div className="page-container"><ErrorMessage title="Not Found" message={`Market #${marketId} could not be loaded.`} /></div>;
    }

    // --- The rest of your component's JSX can now safely use 'marketData' ---
    return (
        <div className="page-container market-detail-page-v2">
            <header className="market-header-v2">
                <Link to="/predictions" className="back-link-v2">← All Markets</Link>
                <h1>{marketData.title}</h1>
                <div className="market-meta-v2">
                    <span className="meta-item">Chain ID: {chainId}</span>
                    <span className="meta-item">Expires: {new Date(marketData.expiryTimestamp * 1000).toLocaleString()}</span>
                    <span className={`status-badge ${marketData.statusString.toLowerCase()}`}>{marketData.statusString}</span>
                </div>
            </header>

            <div className="market-body-v2">
                <div className="market-action-zone">
                    <MarketOddsDisplay
                        totalStakedYes={marketData.totalStakedYes}
                        totalStakedNo={marketData.totalStakedNo}
                        tokenSymbol={"BNB"} // Or make this dynamic
                    />
                    
                    <div className="interaction-panel">
                        {marketData.state === 0 && walletAddress ? (
                            <PredictionForm 
                                marketId={marketData.id} 
                                onBetPlaced={() => setRefreshKey(k => k + 1)}
                                // ... other props
                            />
                        ) : (
                           <div className="market-closed-notice">
                                {marketData.state !== 0 ? "This market is closed." : "Please connect your wallet to predict."}
                            </div>
                        )}
                        {/* Add your claim winnings logic here if needed */}
                    </div>
                </div>
                
                <div className="market-info-zone">
                    {/* Your resolution rules section */}
                </div>
            </div>
        </div>
    );
}

export default MarketDetailPage;