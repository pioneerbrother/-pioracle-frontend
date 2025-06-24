// src/pages/PredictionMarketsListPage.jsx
import React, { useState, useEffect, useContext, useMemo } from 'react';
import { WalletContext } from './WalletProvider';
import MarketCard from '../components/predictions/MarketCard';
import LoadingSpinner from '../components/common/LoadingSpinner';
import ErrorMessage from '../components/common/ErrorMessage';
import { getMarketDisplayProperties } from '../utils/marketutils.js';
import './PredictionMarketsListPage.css';
function PredictionMarketsListPage() {
    const { contract } = useContext(WalletContext);
    const [allMarkets, setAllMarkets] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!contract) {
            setIsLoading(true);
            console.log("PMLP: Waiting for contract from context...");
            return;
        }
        console.log("PMLP: Contract object received from context.");

        const fetchAndProcessData = async () => {
            setIsLoading(true);
            setError(null);
            console.log("PMLP: Starting to fetch market data...");
            try {
                const nextMarketIdBN = await contract.nextMarketId();
                console.log("PMLP: nextMarketId from contract:", nextMarketIdBN.toString());

                if (nextMarketIdBN.eq(0)) {
                    console.log("PMLP: nextMarketId is 0, setting no markets.");
                    setAllMarkets([]);
                    setIsLoading(false);
                    return;
                }
                
                const marketCountNum = Number(nextMarketIdBN.toString());
                console.log("PMLP: Market count to fetch:", marketCountNum);
                const marketPromises = [];

                for (let id = 0; id < marketCountNum; id++) {
                    console.log("PMLP: Preparing to fetch details for market ID:", id);
                    marketPromises.push(contract.getMarketStaticDetails(id));
                }
                const allRawDetails = await Promise.all(marketPromises);
                console.log("PMLP: Raw details fetched for all markets:", allRawDetails);

                const processedMarkets = allRawDetails.map((rawDetails, index) => {
                    console.log(`PMLP: Processing rawDetails for market ID (index) ${index}:`, rawDetails);
                    if (!rawDetails || rawDetails.exists !== true) {
                        console.log(`PMLP: Market ID (index) ${index} does not exist or is invalid.`);
                        return null; 
                    }
                    
                    const intermediateMarket = {
                        id: rawDetails[0].toString(),
                        assetSymbol: rawDetails[1],
                        priceFeedAddress: rawDetails[2],
                        targetPrice: rawDetails[3].toString(),
                        expiryTimestamp: Number(rawDetails[4]),
                        resolutionTimestamp: Number(rawDetails[5]),
                        totalStakedYes: rawDetails[6].toString(),
                        totalStakedNo: rawDetails[7].toString(), 
                        state: Number(rawDetails[8]), // <-- CRITICAL: What is this value?
                        actualOutcomeValue: rawDetails[9].toString(),
                        exists: rawDetails[10],
                        isEventMarket: rawDetails[11],
                        creationTimestamp: Number(rawDetails[12]),
                    };
                    console.log(`PMLP: Intermediate data for market ID ${intermediateMarket.id}:`, intermediateMarket);
                    const displayMarket = getMarketDisplayProperties(intermediateMarket);
                    console.log(`PMLP: Display data for market ID ${intermediateMarket.id}:`, displayMarket);
                    return displayMarket;
                }).filter(market => market !== null);

                console.log("PMLP: All processed markets (before reverse):", processedMarkets);
                setAllMarkets(processedMarkets.reverse());

            } catch (err) {
                console.error("PMLP: Failed to fetch markets:", err);
                setError(err.message || "An error occurred fetching markets.");
            } finally {
                setIsLoading(false);
                console.log("PMLP: Fetching and processing complete.");
            }
        };

        fetchAndProcessData();
    }, [contract]);

    const openMarketsToDisplay = useMemo(() => {
        console.log("PMLP: Filtering 'allMarkets':", allMarkets);
        const filtered = allMarkets.filter(m => m.state === 0); // <-- Is '0' correct for OPEN?
        console.log("PMLP: Markets after state === 0 filter (openMarketsToDisplay):", filtered);
        return filtered;
    }, [allMarkets]);
    
    
    return (
        <div className="page-container prediction-list-page">
            <h1>Open Markets</h1>
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