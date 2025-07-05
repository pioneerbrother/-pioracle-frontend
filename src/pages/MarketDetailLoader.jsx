// src/pages/MarketDetailLoader.jsx

import React, { useState, useEffect, useContext } from 'react';
import { useParams } from 'react-router-dom';
import { WalletContext } from './WalletProvider'; // Correct path to WalletProvider
import MarketDetailPage from './MarketDetailPage'; // The actual page to display after loading
import LoadingSpinner from '../components/common/LoadingSpinner';
import ErrorMessage from '../components/common/ErrorMessage';
import { getMarketDisplayProperties } from '../utils/marketutils.js';

function MarketDetailLoader() {
    // Get the marketId from the URL (e.g., '0' from '/predictions/0')
    const { marketId } = useParams(); 
    const { predictionMarketContract, isInitialized, walletAddress } = useContext(WalletContext);

    // State to hold the specific market's data
    const [marketData, setMarketData] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchMarketDetail = async () => {
            // --- This robust series of checks prevents all common loops ---

            // 1. Wait for the wallet provider to be ready.
            if (!isInitialized || !walletAddress) {
                // Don't set an error yet, just wait for initialization.
                return;
            }

            // 2. Ensure we have a contract instance.
            if (!predictionMarketContract) {
                setError("Application is not configured for this network.");
                setIsLoading(false);
                return;
            }

            // 3. Ensure marketId is a valid number.
            if (isNaN(parseInt(marketId))) {
                setError("Invalid market ID provided in the URL.");
                setIsLoading(false);
                return;
            }
            
            console.log(`MDL: Fetching details for market ID: ${marketId}...`);
            try {
                // Fetch the static details for this specific market
                const rawMarket = await predictionMarketContract.getMarketStaticDetails(marketId);

                if (!rawMarket || !rawMarket.exists) {
                    throw new Error(`Market with ID ${marketId} does not exist.`);
                }
                
                // Format the data just like we did on the list page
                const baseMarket = {
                    id: rawMarket.id.toString(),
                    assetSymbol: rawMarket.assetSymbol,
                    state: Number(rawMarket.state),
                    expiryTimestamp: Number(rawMarket.expiryTimestamp),
                    totalStakedYes: rawMarket.totalStakedYes.toString(),
                    totalStakedNo: rawMarket.totalStakedNo.toString(),
                    // Include any other raw properties needed by MarketDetailPage
                };

                // Use the utility to add title, icon, probabilities, etc.
                const formattedMarket = getMarketDisplayProperties(baseMarket);
                setMarketData(formattedMarket);

            } catch (err) {
                console.error("MDL: Failed to fetch market details:", err);
                setError(err.message || "Could not load market details.");
            } finally {
                setIsLoading(false);
            }
        };

        // We reset the state every time the marketId or contract changes
        setIsLoading(true);
        setError(null);
        setMarketData(null);
        fetchMarketDetail();

    // The dependency array is CRITICAL. This effect will only re-run if
    // the marketId, contract instance, or wallet connection changes.
    }, [marketId, predictionMarketContract, isInitialized, walletAddress]);

    // --- Conditional Rendering Logic ---
    if (isLoading) {
        return <LoadingSpinner message={`Loading Market #${marketId}...`} />;
    }

    if (error) {
        return <ErrorMessage title="Failed to Load Market" message={error} />;
    }

    if (marketData) {
        // If loading is finished, there's no error, and we have data, render the actual page.
        return <MarketDetailPage market={marketData} />;
    }

    // Fallback case, though it should ideally not be reached.
    return <ErrorMessage title="Not Found" message="The requested market could not be loaded." />;
}

export default MarketDetailLoader;