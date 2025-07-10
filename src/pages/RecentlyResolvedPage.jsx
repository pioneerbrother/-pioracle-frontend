// src/pages/RecentlyResolvedPage.jsx
import React, { useState, useEffect, useContext, useMemo } from 'react';
import { Link } from 'react-router-dom';

// --- This import must match the one in your working MyPredictionsPage.jsx ---
import { WalletContext } from '../contexts/WalletContext'; 

import MarketCard from '../components/predictions/MarketCard';
import LoadingSpinner from '../components/common/LoadingSpinner';
import ErrorMessage from '../components/common/ErrorMessage';
import { getMarketDisplayProperties, MarketState } from '../utils/marketutils.js';
import './PredictionMarketsListPage.css';

function RecentlyResolvedPage() {
    // --- Using the same pattern as your working page ---
    const { predictionMarketContract, chainId } = useContext(WalletContext);
    
    const [allMarkets, setAllMarkets] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        // --- This logic is now safer, just like your working page ---
        if (!predictionMarketContract) {
            setIsLoading(true); // Keep loading until the contract is ready
            return;
        }

        const fetchAndProcessData = async () => {
            setIsLoading(true);
            setError(null);
            console.log("RecentlyResolvedPage: Starting to fetch all markets...");

            try {
                const nextMarketIdBN = await predictionMarketContract.nextMarketId();
                const nextMarketIdNum = nextMarketIdBN.toNumber();
                console.log(`RecentlyResolvedPage: Found ${nextMarketIdNum} total markets.`);
                if (nextMarketIdNum === 0) {
                    setAllMarkets([]);
                    setIsLoading(false);
                    return;
                }

                const marketPromises = [];
                for (let id = 0; id < nextMarketIdNum; id++) {
                    marketPromises.push(predictionMarketContract.getMarketStaticDetails(id));
                }
                const allRawDetails = await Promise.all(marketPromises);
                console.log("RecentlyResolvedPage: Fetched raw details.", allRawDetails);

                const processedMarkets = allRawDetails
                    .filter(rawDetails => rawDetails && rawDetails.exists === true)
                    .map(rawDetails => getMarketDisplayProperties(rawDetails));

                console.log("RecentlyResolvedPage: Processed markets.", processedMarkets);
                setAllMarkets(processedMarkets);
            } catch (err) {
                console.error("RecentlyResolvedPage: Failed to fetch markets:", err);
                setError(err.message || "An error occurred fetching market data.");
            } finally {
                setIsLoading(false);
            }
        };

        fetchAndProcessData();
    }, [predictionMarketContract]); // Re-run only when the contract object changes

    const resolvedMarketsToDisplay = useMemo(() => {
        if (!allMarkets || allMarkets.length === 0) return [];
        
        const oneMonthAgoTimestamp = Math.floor((new Date().getTime() - 30 * 24 * 60 * 60 * 1000) / 1000);
        const resolvedStates = [
            MarketState.Resolved_YesWon, MarketState.Resolved_NoWon, MarketState.Resolved_Push,
            MarketState.ResolvedEarly_YesWon, MarketState.ResolvedEarly_NoWon
        ];

        return allMarkets
            .filter(market => 
                resolvedStates.includes(market.state) && 
                market.resolutionTimestamp >= oneMonthAgoTimestamp
            )
            .sort((a, b) => b.resolutionTimestamp - a.resolutionTimestamp);
    }, [allMarkets]);

    return (
        <div className="page-container prediction-list-page">
            <div className="market-list-header">
                 <h2 className="section-title">Recently Resolved Markets (Chain ID: {chainId || 'N/A'})</h2>
                 <Link to="/predictions" className="button secondary">View Open Markets</Link>
            </div>

            {isLoading && <LoadingSpinner message="Loading recently resolved markets..." />}
            {error && <ErrorMessage title="Error Loading Markets" message={error} />}
            
            {!isLoading && !error && resolvedMarketsToDisplay.length === 0 && (
                <div className="no-markets-message">
                    <p>No markets have been resolved in the last 30 days.</p>
                </div>
            )}
            
            {!isLoading && !error && resolvedMarketsToDisplay.length > 0 && (
                <div className="market-grid">
                    {resolvedMarketsToDisplay.map(market => (
                        <MarketCard key={market.id} market={market} />
                    ))}
                </div>
            )}
        </div>
    );
}

export default RecentlyResolvedPage;