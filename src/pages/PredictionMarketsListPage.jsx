// src/pages/PredictionMarketsListPage.jsx
import React, { useState, useEffect, useContext, useMemo } from 'react';
import { WalletContext } from './WalletProvider';
import MarketCard from '../components/predictions/MarketCard';
import LoadingSpinner from '../components/common/LoadingSpinner';
import ErrorMessage from '../components/common/ErrorMessage';
import { getMarketDisplayProperties, MarketState } from '../utils/marketutils.js'; // Assuming MarketState.Open is 0
import './PredictionMarketsListPage.css';

function PredictionMarketsListPage() {
    const { contract, chainId } = useContext(WalletContext); // Added chainId for context
    const [allMarkets, setAllMarkets] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        // Log current chainId to confirm we are on Polygon (137)
        console.log("PMLP: Current effective chainId from WalletContext:", chainId);
        
        if (!contract) {
            setIsLoading(true);
            console.log("PMLP: Waiting for contract from context...");
            return;
        }
        console.log("PMLP: Contract object received. Attempting to fetch markets for chainId:", chainId);

        const fetchAndProcessData = async () => {
            setIsLoading(true);
            setError(null);
            try {
                const nextMarketIdBN = await contract.nextMarketId();
                console.log(`PMLP (Chain ${chainId}): nextMarketId from contract:`, nextMarketIdBN.toString());

                if (nextMarketIdBN.eq(0)) {
                    console.log(`PMLP (Chain ${chainId}): nextMarketId is 0. No markets to fetch via this counter.`);
                    setAllMarkets([]);
                    setIsLoading(false);
                    return;
                }
                
                const marketCountNum = Number(nextMarketIdBN.toString());
                console.log(`PMLP (Chain ${chainId}): Market count to fetch:`, marketCountNum);
                const marketPromises = [];

                for (let id = 0; id < marketCountNum; id++) {
                    marketPromises.push(contract.getMarketStaticDetails(id));
                }
                const allRawDetails = await Promise.all(marketPromises);
                console.log(`PMLP (Chain ${chainId}): Raw details fetched for all markets:`, JSON.parse(JSON.stringify(allRawDetails))); // Deep copy for logging

                const processedMarkets = allRawDetails.map((rawDetails, index) => {
                    if (!rawDetails || rawDetails.exists !== true) {
                        console.log(`PMLP (Chain ${chainId}): Market at index ${index} (potential ID ${rawDetails ? rawDetails[0] : 'N/A'}) does not exist or is invalid.`);
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
                        state: Number(rawDetails[8]), // <-- What is this value for your OPEN Polygon markets?
                        actualOutcomeValue: rawDetails[9].toString(),
                        exists: rawDetails[10],
                        isEventMarket: rawDetails[11],
                        creationTimestamp: Number(rawDetails[12]),
                    };
                    console.log(`PMLP (Chain ${chainId}): Intermediate data for market ID ${intermediateMarket.id}:`, intermediateMarket);
                    const displayMarket = getMarketDisplayProperties(intermediateMarket);
                     console.log(`PMLP (Chain ${chainId}): Display data for market ID ${intermediateMarket.id} (state: ${displayMarket.state}):`, displayMarket);
                    return displayMarket;
                }).filter(market => market !== null);

                console.log(`PMLP (Chain ${chainId}): All Processed Markets (before reverse):`, processedMarkets);
                setAllMarkets(processedMarkets.reverse());

            } catch (err) {
                console.error(`PMLP (Chain ${chainId}): Failed to fetch markets:`, err);
                setError(err.message || "An error occurred fetching markets.");
            } finally {
                setIsLoading(false);
            }
        };

        fetchAndProcessData();
    }, [contract, chainId]); // Added chainId to re-fetch if network changes via context

    const openMarketsToDisplay = useMemo(() => {
        // Assuming MarketState.Open is 0 from your marketutils.js
        // If your old contract had a different enum order, this '0' is the problem.
        const currentOpenStateValue = MarketState.Open; // This should be 0
        console.log(`PMLP (Chain ${chainId}): Filtering 'allMarkets' (count: ${allMarkets.length}) using state === ${currentOpenStateValue}`);
        
        const filtered = allMarkets.filter(m => m.state === currentOpenStateValue); 
        console.log(`PMLP (Chain ${chainId}): Markets after state === ${currentOpenStateValue} filter (openMarketsToDisplay count: ${filtered.length}):`, filtered);
        return filtered;
    }, [allMarkets, chainId]); // Added chainId for context in logs
    
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