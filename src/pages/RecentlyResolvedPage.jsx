// src/pages/RecentlyResolvedPage.jsx
import React, { useState, useEffect, useContext, useMemo } from 'react';
import { Link } from 'react-router-dom';

// This path must be correct for your project structure
import { WalletContext } from '../contexts/WalletContext'; 

import MarketCard from '../components/predictions/MarketCard';
import LoadingSpinner from '../components/common/LoadingSpinner';
import ErrorMessage from '../components/common/ErrorMessage';
import { getMarketDisplayProperties, MarketState } from '../utils/marketutils.js';
// Make sure this CSS file is imported
import './PredictionMarketsListPage.css';

function RecentlyResolvedPage() {
    const { predictionMarketContract, chainId } = useContext(WalletContext);
    
    const [allMarkets, setAllMarkets] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    // This useEffect logic is good. No changes needed here.
    useEffect(() => {
        if (!predictionMarketContract) {
            setIsLoading(true);
            return;
        }
        const fetchAndProcessData = async () => {
            setIsLoading(true);
            setError(null);
            try {
                const nextMarketIdBN = await predictionMarketContract.nextMarketId();
                const nextMarketIdNum = nextMarketIdBN.toNumber();
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
                const processedMarkets = allRawDetails
                    .filter(rawDetails => rawDetails && rawDetails.exists === true)
                    .map(rawDetails => getMarketDisplayProperties(rawDetails));
                setAllMarkets(processedMarkets);
            } catch (err) {
                setError(err.message || "An error occurred.");
            } finally {
                setIsLoading(false);
            }
        };
        fetchAndProcessData();
    }, [predictionMarketContract]);

    // This filtering logic is also good. No changes needed.
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


    // --- THE FIX IS IN THE JSX RETURNED BELOW ---
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
            
            {/* THIS IS THE KEY CHANGE. We wrap the list in the "market-grid" div. */}
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