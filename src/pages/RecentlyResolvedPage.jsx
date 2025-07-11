// src/pages/RecentlyResolvedPage.jsx
import React, { useState, useEffect, useContext, useMemo } from 'react';
import { Link } from 'react-router-dom';

// This path must be correct for your project structure
import { WalletContext } from '../contexts/WalletContext'; 

import MarketCard from '../components/predictions/MarketCard';
import LoadingSpinner from '../components/common/LoadingSpinner';
import ErrorMessage from '../components/common/ErrorMessage';
import { getMarketDisplayProperties, MarketState } from '../utils/marketutils.js';
import './PredictionMarketsListPage.css'; // Reusing the same CSS

function RecentlyResolvedPage() {
    const { predictionMarketContract, chainId } = useContext(WalletContext);
    
    const [allMarkets, setAllMarkets] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        // Guard clause: Don't do anything until the contract is ready.
        if (!predictionMarketContract) {
            setIsLoading(true); // Ensure loading spinner shows
            return;
        }

        const fetchAndProcessData = async () => {
            setIsLoading(true);
            setError(null);
            console.log(`RecentlyResolvedPage: Starting fetch on chain ${chainId}...`);

            try {
                const nextMarketIdBN = await predictionMarketContract.nextMarketId();
                const totalMarkets = nextMarketIdBN.toNumber();

                if (totalMarkets === 0) {
                    setAllMarkets([]);
                    setIsLoading(false);
                    return;
                }

                const marketPromises = [];
                // Fetch newest markets first by iterating backwards
                for (let i = 0; i < totalMarkets; i++) {
                    const idToFetch = totalMarkets - 1 - i;
                    marketPromises.push(predictionMarketContract.getMarketStaticDetails(idToFetch));
                }
                const allRawDetails = await Promise.all(marketPromises);

                const processedMarkets = allRawDetails
                    .filter(rawDetails => rawDetails && rawDetails.exists === true)
                    .map(rawDetails => getMarketDisplayProperties(rawDetails));

                setAllMarkets(processedMarkets);

            } catch (err) {
                console.error("RecentlyResolvedPage: Failed to fetch markets:", err);
                setError(err.message || "An error occurred fetching market data.");
            } finally {
                setIsLoading(false);
            }
        };

        fetchAndProcessData();
    // This stable dependency array prevents infinite loops.
    }, [predictionMarketContract, chainId]);

    const resolvedMarketsToDisplay = useMemo(() => {
        if (!allMarkets || allMarkets.length === 0) return [];
        
        const oneMonthAgoTimestamp = Math.floor((new Date().getTime() - 30 * 24 * 60 * 60 * 1000) / 1000);
        const resolvedStates = [
            MarketState.Resolved_YesWon, MarketState.Resolved_NoWon, MarketState.Resolved_Push,
            MarketState.ResolvedEarly_YesWon, MarketState.ResolvedEarly_NoWon
        ];

        // This filtering logic is excellent. No changes needed.
        return allMarkets
            .filter(market => 
                resolvedStates.includes(market.state) && 
                market.resolutionTimestamp >= oneMonthAgoTimestamp
            )
            .sort((a, b) => b.resolutionTimestamp - a.resolutionTimestamp);
    }, [allMarkets]);

    // The JSX is already perfect, including the `market-grid` class. No changes needed.
    return (
        <div className="page-container prediction-list-page">
            <div className="market-list-header">
                 <h2 className="section-title">Recently Resolved Markets (Chain ID: {chainId || 'N/A'})</h2>
                 <Link to="/predictions" className="button secondary">View Open Markets</Link>
            </div>

            {isLoading && <LoadingSpinner message="Loading recently resolved markets..." />}
            {error && <ErrorMessage title="Error Loading Markets" message={error} onRetry={fetchAndProcessData} />}
            
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