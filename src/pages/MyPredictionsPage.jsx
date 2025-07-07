// pioracle/src/pages/RecentlyResolvedPage.jsx
import React, { useState, useEffect, useContext, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { ethers } from 'ethers'; // Only if needed for direct BigNumber ops, often not here

import MarketCard from '../components/predictions/MarketCard';
import LoadingSpinner from '../components/common/LoadingSpinner';
import ErrorMessage from '../components/common/ErrorMessage';
import { 
    getMarketDisplayProperties, 
    MarketState as MarketStateEnumFromUtil 
} from '../utils/marketutils.js'; // Ensure this path and filename are correct
import './PredictionMarketsListPage.css'; // You can reuse styles or create specific ones

const MarketState = MarketStateEnumFromUtil; // Alias for clarity

function RecentlyResolvedPage() {
    const { contract: predictionContractInstance } = useContext(WalletContext);
    const [rawMarkets, setRawMarkets] = useState([]); // Store all fetched markets before filtering
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchAllMarkets = useCallback(async () => {
        if (!predictionContractInstance) {
            setError("Prediction contract not available. Please connect your wallet or ensure the application is properly configured.");
            setIsLoading(false);
            return;
        }

        setIsLoading(true);
        setError(null);
        setRawMarkets([]); // Clear previous

        try {
            console.log("RecentlyResolvedPage: Fetching nextMarketId...");
            const nextIdBigNumber = await predictionContractInstance.nextMarketId();
            const nextId = Number(nextIdBigNumber);
            console.log("RecentlyResolvedPage: nextMarketId =", nextId);

            if (nextId === 0) {
                setRawMarkets([]);
                setIsLoading(false);
                return;
            }

            const marketPromises = [];
            for (let i = 0; i < nextId; i++) {
                if (typeof predictionContractInstance.getMarketStaticDetails !== 'function') {
                    throw new Error("getMarketStaticDetails function not found on contract. ABI might be incorrect.");
                }
                marketPromises.push(predictionContractInstance.getMarketStaticDetails(i));
            }
            
            console.log(`RecentlyResolvedPage: Fetching details for ${marketPromises.length} potential markets...`);
            const marketsDetailsArray = await Promise.all(marketPromises);
            console.log("RecentlyResolvedPage: Received details for all markets.");

            const processedMarkets = marketsDetailsArray
                .map((detailsArray) => {
                    const expectedLength = 13; // If getMarketStaticDetails returns 13 items including creationTimestamp
                    if (!detailsArray || detailsArray.length < expectedLength || typeof detailsArray[10] === 'undefined' || !detailsArray[10]) { // Index 10 is 'exists'
                        console.warn("RecentlyResolvedPage: Skipping market due to incomplete data or 'exists' is false:", detailsArray);
                        return null; 
                    }
                    return { // Map array to object based on your contract's return order
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
                        creationTimestamp: Number(detailsArray[12]), // Assumes index 12 is creationTimestamp
                        oracleDecimals: 8 // Default, getMarketDisplayProperties might refine this for price feeds
                    };
                })
                .filter(market => market !== null); 

            setRawMarkets(processedMarkets);

        } catch (e) {
            console.error("Error fetching markets for RecentlyResolvedPage:", e);
            setError("Failed to load market data. Please ensure your wallet is connected to the correct network and try again.");
        } finally {
            setIsLoading(false);
        }
    }, [predictionContractInstance]); // Dependency: re-fetch if contract instance changes

    useEffect(() => {
        if (predictionContractInstance) {
            fetchAllMarkets();
        } else {
            // No contract instance yet, could be WalletProvider still initializing
            setIsLoading(true); // Show loading until contract is available or error
            // setError("Waiting for contract connection..."); // Optional message
        }
    }, [predictionContractInstance, fetchAllMarkets]);

    const recentlyResolvedDisplayableMarkets = useMemo(() => {
        if (!rawMarkets || rawMarkets.length === 0) return [];

        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const thirtyDaysAgoTimestamp = Math.floor(thirtyDaysAgo.getTime() / 1000);

        const resolvedStates = [
            MarketState.Resolved_YesWon, MarketState.Resolved_NoWon, MarketState.Resolved_Push,
            MarketState.ResolvedEarly_YesWon, MarketState.ResolvedEarly_NoWon
        ];

        return rawMarkets
            .filter(market => 
                resolvedStates.includes(market.state) && 
                market.resolutionTimestamp >= thirtyDaysAgoTimestamp
            )
            .map(market => {
                try {
                    return { ...market, ...getMarketDisplayProperties(market) };
                } catch (e) {
                    console.error("Error processing resolved market for display:", market, e);
                    return null; 
                }
            })
            .filter(market => market !== null)
            .sort((a, b) => (b.resolutionTimestamp || 0) - (a.resolutionTimestamp || 0)); // Newest resolved first
    }, [rawMarkets]);

    return (
        <>
            {/* --- REACT 19 NATIVE HEAD TAGS --- */}
            <title>Recently Resolved Markets | PiOracle</title>
            <meta name="description" content="View prediction markets for Bitcoin, Pi Coin, and other events that have recently resolved on PiOracle.online." />
            <meta name="keywords" content="resolved predictions, prediction market results, crypto outcomes, pioracle history" />
            {/* Example Open Graph tags */}
            {/* 
            <meta property="og:title" content="Recently Resolved Markets | PiOracle" />
            <meta property="og:description" content="Check the outcomes of recent prediction markets on PiOracle." />
            <meta property="og:url" content="https://pioracle.online/resolved-markets" />
            <meta property="og:image" content="https://pioracle.online/your-resolved-social-image.png" />
            */}
            {/* --- END REACT 19 NATIVE HEAD TAGS --- */}

            <div className="page-container recently-resolved-page" style={{padding: '20px'}}>
                <div style={{ marginBottom: '20px', textAlign: 'left' }}>
                    <Link to="/predictions" className="back-link">← Back to Open Markets</Link>
                </div>
                
                <h2>Recently Resolved Markets <span style={{fontSize: '0.8em', color: '#555'}}>(Last 30 Days)</span></h2>

                {isLoading && <LoadingSpinner message="Loading recently resolved markets..." />}
                {error && <ErrorMessage title="Could Not Load Markets" message={error} onRetry={fetchAllMarkets} />}
                
                {!isLoading && !error && recentlyResolvedDisplayableMarkets.length === 0 && (
                    <p style={{ textAlign: 'center', marginTop: '20px' }}>No markets have been resolved in the last 30 days.</p>
                )}

                {!isLoading && !error && recentlyResolvedDisplayableMarkets.length > 0 && (
                    <div className="market-list">
                        {recentlyResolvedDisplayableMarkets.map(market => (
                            <MarketCard key={market.id} market={market} />
                        ))}
                    </div>
                )}
            </div>
        </>
    );
}

export default RecentlyResolvedPage;


    