// src/pages/PredictionMarketsListPage.jsx

import React, { useState, useEffect, useContext } from 'react';
import { WalletContext } from './WalletProvider';
import MarketCard from '../components/predictions/MarketCard';
import LoadingSpinner from '../components/common/LoadingSpinner';
import ErrorMessage from '../components/common/ErrorMessage';
import { getMarketDisplayProperties } from '../utils/marketutils.js';
import './PredictionMarketsListPage.css';

function PredictionMarketsListPage() {
    const { predictionMarketContract, chainId, isInitialized } = useContext(WalletContext);
    const [allMarkets, setAllMarkets] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchMarkets = async () => {
            // --- NEW, MORE ROBUST GUARD CLAUSE ---
            // Don't do anything until the entire WalletProvider is initialized AND we have a contract.
            if (!isInitialized) {
                console.log("PMLP: WalletProvider not initialized yet. Waiting...");
                return;
            }
            if (!predictionMarketContract) {
                console.error("PMLP: CRITICAL ERROR - predictionMarketContract is null or undefined even after initialization. Check WalletProvider and contract addresses.");
                setError("Application is not configured correctly for this network. Contract not found.");
                setIsLoading(false);
                return;
            }
            // --- END OF GUARD CLAUSE ---

            setIsLoading(true);
            setError(null);
            console.log(`PMLP (Chain ${chainId}): Contract found. Starting market fetch...`);

            try {
                // Now we are certain predictionMarketContract exists.
                const marketIds = await predictionMarketContract.getMarketIds(100);

                if (marketIds.length === 0) {
                    setAllMarkets([]);
                    setIsLoading(false);
                    return;
                }

                const marketPromises = marketIds.map(async (id) => {
                    // We can be more efficient by fetching basic info first
                    const info = await predictionMarketContract.getMarketInfo(id);
                    // In a real app, you'd fetch stakes/extended info on demand, but this is fine for now
                    return { id, ...info }; 
                });
                
                const rawMarkets = await Promise.all(marketPromises);

                const formattedMarkets = rawMarkets
                    .map(raw => {
                        const market = {
                            id: raw.id.toString(),
                            assetSymbol: raw.assetSymbol,
                            state: Number(raw.state),
                            expiryTimestamp: Number(raw.expiryTimestamp),
                        };
                        return getMarketDisplayProperties(market);
                    })
                    .sort((a, b) => b.id - a.id);

                setAllMarkets(formattedMarkets);

            } catch (err) {
                console.error("PMLP: Failed to fetch markets with error:", err);
                setError(err.message || "A contract error occurred. It may not be verified or is misconfigured.");
            } finally {
                setIsLoading(false);
            }
        };

        fetchMarkets();
    }, [predictionMarketContract, chainId, isInitialized]); // Add isInitialized as a dependency

    
    const openMarketsToDisplay = allMarkets.filter(m => m.state === 0);

    return (
        <div className="page-container prediction-list-page">
            <h1>Open Markets (Chain ID: {chainId || 'Connecting...'})</h1>
            {isLoading ? ( <LoadingSpinner message="Fetching markets..." /> ) : 
             error ? ( <ErrorMessage title="Error Loading Markets" message={error} /> ) : 
            (
                 <div className="market-grid">
                    {openMarketsToDisplay.length > 0 ? (
                        openMarketsToDisplay.map(market => <MarketCard key={market.id} market={market} />)
                    ) : (
                        <p>No open markets found on this network. Create one!</p>
                    )}
                </div>
            )}
        </div>
    );
}

export default PredictionMarketsListPage;