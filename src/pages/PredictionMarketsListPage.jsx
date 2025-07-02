// src/pages/PredictionMarketsListPage.jsx
import React, { useState, useEffect, useContext, useMemo } from 'react';
import { WalletContext } from './WalletProvider';
import MarketCard from '../components/predictions/MarketCard';
import LoadingSpinner from '../components/common/LoadingSpinner';
import ErrorMessage from '../components/common/ErrorMessage';
import { getMarketDisplayProperties, MarketState } from '../utils/marketutils.js'; // Assuming MarketState.Open is 0
import './PredictionMarketsListPage.css';

function PredictionMarketsListPage() {
    // --- THIS IS THE FIX ---
    // Correctly destructure 'predictionMarketContract' from the WalletContext
    const { predictionMarketContract, chainId } = useContext(WalletContext);
    // --- END OF FIX ---

    const [allMarkets, setAllMarkets] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        // Log current chainId to confirm we are on Polygon (137)
        console.log("PMLP: Current effective chainId from WalletContext:", chainId);
        
        // --- THIS IS THE FIX ---
        // Now checking for the correctly named 'predictionMarketContract'
        if (!predictionMarketContract) {
            setIsLoading(true);
            console.log("PMLP: Waiting for predictionMarketContract from context...");
            return;
        }
        console.log("PMLP: predictionMarketContract received. Attempting to fetch markets for chainId:", chainId);
        // --- END OF FIX ---

        const fetchAndProcessData = async () => {
            setIsLoading(true);
            setError(null);
            try {
                // --- THIS IS THE FIX ---
                // Call nextMarketId() on the correctly named contract instance
                const nextMarketIdBN = await predictionMarketContract.nextMarketId();
                console.log(`PMLP (Chain ${chainId}): nextMarketId from contract:`, nextMarketIdBN.toString());
                // --- END OF FIX ---

                if (nextMarketIdBN.eq(0)) {
                    console.log(`PMLP (Chain ${chainId}): nextMarketId is 0. No markets to fetch via this counter.`);
                    setAllMarkets([]);
                    setIsLoading(false);
                    return;
                }
                
                const marketCountNum = Number(nextMarketIdBN.toString());
                console.log(`PMLP (Chain ${chainId}): Market count to fetch:`, marketCountNum);

                // --- THIS IS THE FIX ---
                // Call getPaginatedMarketDetails on the correctly named contract instance
                const [
                    ids, assetSymbols, priceFeedAddresses, targetPrices, expiryTimestamps,
                    resolutionTimestamps, totalStakedYesArray, totalStakedNoArray, states,
                    actualOutcomeValues, existsArray, isEventMarkets, creationTimestamps
                ] = await predictionMarketContract.getPaginatedMarketDetails(0, marketCountNum);
                // --- END OF FIX ---

                const formattedMarkets = [];
                for (let i = 0; i < ids.length; i++) {
                    if (existsArray[i] === true) {
                        formattedMarkets.push({
                            id: ids[i].toNumber(),
                            assetSymbol: assetSymbols[i],
                            priceFeedAddress: priceFeedAddresses[i],
                            targetPrice: targetPrices[i].toString(),
                            expiryTimestamp: expiryTimestamps[i].toNumber(),
                            resolutionTimestamp: resolutionTimestamps[i].toNumber(),
                            totalStakedYes: totalStakedYesArray[i].toString(),
                            totalStakedNo: totalStakedNoArray[i].toString(),
                            state: states[i],
                            actualOutcomeValue: actualOutcomeValues[i].toString(),
                            exists: existsArray[i],
                            isEventMarket: isEventMarkets[i],
                            creationTimestamp: creationTimestamps[i].toNumber()
                        });
                    }
                }
                setAllMarkets(formattedMarkets.reverse());

            } catch (err) {
                console.error(`PMLP (Chain ${chainId}): Failed to fetch markets:`, err);
                setError(err.message || "An error occurred fetching markets.");
            } finally {
                setIsLoading(false);
            }
        };

        fetchAndProcessData();
    }, [predictionMarketContract, chainId]); // --- THIS IS THE FIX --- Depend on predictionMarketContract

    const openMarketsToDisplay = useMemo(() => {
        const currentOpenStateValue = MarketState.Open;
        console.log(`PMLP (Chain ${chainId}): Filtering 'allMarkets' (count: ${allMarkets.length}) using state === ${currentOpenStateValue}`);
        
        const filtered = allMarkets.filter(m => m.state === currentOpenStateValue); 
        console.log(`PMLP (Chain ${chainId}): Markets after state === ${currentOpenStateValue} filter (openMarketsToDisplay count: ${filtered.length}):`, filtered);
        return filtered;
    }, [allMarkets, chainId]);
    
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
                        <p>No open markets found. Create one!</p>
                    )}
                </div>
            )}
        </div>
    );
}

export default PredictionMarketsListPage;