// src/pages/RecentlyResolvedPage.jsx
import React, { useState, useEffect, useContext, useMemo } from 'react';
import { Link } from 'react-router-dom';

import MarketCard from '../components/predictions/MarketCard';
import LoadingSpinner from '../components/common/LoadingSpinner';
import ErrorMessage from '../components/common/ErrorMessage';
import { getMarketDisplayProperties, MarketState } from '../utils/marketutils.js';
import './PredictionMarketsListPage.css'; // Reuse the same CSS for the grid layout

function RecentlyResolvedPage() {
    const { contract } = useContext(WalletContext);
    const [allMarkets, setAllMarkets] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    // This useEffect fetches ALL markets. We will filter them later with useMemo.
    useEffect(() => {
        if (!contract) {
            setIsLoading(true);
            return;
        }

        const fetchAndProcessData = async () => {
            setIsLoading(true);
            setError(null);

            try {
                const nextMarketIdBN = await contract.nextMarketId();
                const nextMarketIdNum = nextMarketIdBN.toNumber();
                if (nextMarketIdNum === 0) {
                    setAllMarkets([]);
                    setIsLoading(false);
                    return;
                }

                const marketPromises = [];
                for (let id = 0; id < nextMarketIdNum; id++) {
                    marketPromises.push(contract.getMarketStaticDetails(id));
                }
                const allRawDetails = await Promise.all(marketPromises);

                // Process the raw data into a clean, display-ready format
                const processedMarkets = allRawDetails
                    .map(rawDetails => {
                        if (!rawDetails || rawDetails.exists !== true) return null;
                        
                        const intermediateMarket = {
                            id: rawDetails[0].toString(),
                            assetSymbol: rawDetails[1],
                            priceFeedAddress: rawDetails[2],
                            targetPrice: rawDetails[3].toString(),
                            expiryTimestamp: Number(rawDetails[4]),
                            resolutionTimestamp: Number(rawDetails[5]),
                            totalStakedYesNet: rawDetails[6].toString(),
                            totalStakedNoNet: rawDetails[7].toString(),
                            state: Number(rawDetails[8]),
                            actualOutcomeValue: rawDetails[9].toString(),
                            exists: rawDetails[10],
                            isEventMarket: rawDetails[11],
                            creationTimestamp: Number(rawDetails[12]),
                        };
                        return getMarketDisplayProperties(intermediateMarket);
                    })
                    .filter(market => market !== null);

                setAllMarkets(processedMarkets);
            } catch (err) {
                console.error("RecentlyResolvedPage: Failed to fetch markets:", err);
                setError(err.message || "An error occurred.");
            } finally {
                setIsLoading(false);
            }
        };

        fetchAndProcessData();
    }, [contract]);

    // This useMemo now handles all the filtering and sorting for this specific page
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
            .sort((a, b) => b.resolutionTimestamp - a.resolutionTimestamp); // Sort by most recently resolved
    }, [allMarkets]);


    return (
        <div className="page-container prediction-list-page">
            <div className="market-list-header">
                 <h2 className="section-title">Recently Resolved Markets</h2>
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