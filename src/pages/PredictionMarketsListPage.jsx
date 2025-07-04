// src/pages/PredictionMarketsListPage.jsx

import React, { useState, useEffect, useContext } from 'react';
import { WalletContext } from './WalletProvider';
import MarketCard from '../components/predictions/MarketCard';
import LoadingSpinner from '../components/common/LoadingSpinner';
import ErrorMessage from '../components/common/ErrorMessage';
import { getMarketDisplayProperties } from '../utils/marketutils.js';
import './PredictionMarketsListPage.css';

function PredictionMarketsListPage() {
    // Destructure the contract instance and chainId from our central WalletContext
    const { predictionMarketContract, chainId } = useContext(WalletContext);
    
    // State for managing the list of markets, loading status, and any errors
    const [allMarkets, setAllMarkets] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        // This effect will run whenever the connected chain changes or the contract becomes available.
        if (!predictionMarketContract) {
            setIsLoading(true); // Keep showing the loader if the contract isn't ready
            return;
        }

        // --- NEW, EFFICIENT, AND ROBUST FETCHING LOGIC ---
        const fetchAllMarkets = async () => {
            setIsLoading(true);
            setError(null);
            console.log(`PMLP (Chain ${chainId}): Starting market fetch...`);

            try {
                // STEP 1: Fetch ALL existing market IDs. This is a cheap and simple call.
                const marketIds = await predictionMarketContract.getMarketIds(100); // Fetch up to 100 of the newest
                console.log(`PMLP (Chain ${chainId}): Found ${marketIds.length} existing market IDs.`);

                if (marketIds.length === 0) {
                    setAllMarkets([]); // No markets to display, clear any old ones
                    setIsLoading(false);
                    return; // We are done
                }

                // STEP 2: For the list view, we only need the basic info.
                // This is much more gas-efficient than fetching all 13 fields for every market.
                const marketPromises = marketIds.map(id =>
                    predictionMarketContract.getMarketBasicInfo(id)
                );
                
                // Wait for all the parallel fetches to complete.
                const basicInfos = await Promise.all(marketPromises);

                // STEP 3: Process the array of basic info into usable JavaScript objects.
                const formattedMarkets = basicInfos
                    .map((info, index) => {
                        // Combine the ID (from the original array) with the fetched basic info.
                        const combinedMarket = {
                            id: marketIds[index].toString(),
                            assetSymbol: info.assetSymbol,
                            targetPrice: info.targetPrice.toString(),
                            expiryTimestamp: Number(info.expiryTimestamp),
                            state: Number(info.state),
                            // We can add default values for fields not fetched on this page
                            totalStakedYes: "0",
                            totalStakedNo: "0"
                        };
                        // Use your utility function to get final display properties (like titles, descriptions, etc.)
                        return getMarketDisplayProperties(combinedMarket);
                    })
                    // No need to filter for 'exists' here as getMarketIds should only return existing ones.
                    .sort((a, b) => b.id - a.id); // Sort by newest ID

                console.log(`PMLP (Chain ${chainId}): Successfully processed ${formattedMarkets.length} markets.`);
                setAllMarkets(formattedMarkets); // Update our component's state with the final list of markets

            } catch (err) {
                console.error(`PMLP (Chain ${chainId}): Failed to fetch markets:`, err);
                setError("Failed to load market data. The contract may have been updated or there's a network issue. Please refresh.");
            } finally {
                setIsLoading(false); // Stop the loading spinner
            }
        };

        fetchAllMarkets();
    }, [predictionMarketContract, chainId]); // The dependencies are correct


    // --- The rendering part of your component ---
    
    // Now your filtering logic for 'open' markets is done on the frontend
    const openMarketsToDisplay = allMarkets.filter(m => m.state === 0); // MarketState.Open is 0

    return (
        <div className="page-container prediction-list-page">
            <h1>Open Markets (Chain ID: {chainId || 'Connecting...'})</h1>
            {isLoading ? (
                <LoadingSpinner message="Fetching markets..." />
            ) : error ? (
                <ErrorMessage title="Error Loading Markets" message={error} />
            ) : (
                 <div className="market-grid">
                    {openMarketsToDisplay.length > 0 ? (
                        // If we have open markets, map over them and display a card for each one
                        openMarketsToDisplay.map(market => <MarketCard key={market.id} market={market} />)
                    ) : (
                        // If the array is empty after fetching and filtering, show this message
                        <p>No open markets found on this network. Create one!</p>
                    )}
                </div>
            )}
        </div>
    );
}

export default PredictionMarketsListPage;