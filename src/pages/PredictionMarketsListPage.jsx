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
            return;
        }

        const fetchAndProcessData = async () => {
            setIsLoading(true);
            setError(null);
            try {
                const nextMarketIdBN = await contract.nextMarketId();
                if (nextMarketIdBN.eq(0)) {
                    setAllMarkets([]);
                    setIsLoading(false);
                    return;
                }
                
                const marketCountNum = Number(nextMarketIdBN.toString());
                const marketPromises = [];

                for (let id = 0; id < marketCountNum; id++) {
                    marketPromises.push(contract.getMarketStaticDetails(id));
                }
                const allRawDetails = await Promise.all(marketPromises);

                const processedMarkets = allRawDetails.map((rawDetails) => {
                    if (!rawDetails || !rawDetails.exists !== true) return null; 
                    
                    // --- THIS IS THE FINAL FIX: Using the correct field names from the ABI ---
                    const intermediateMarket = {
                        id: rawDetails[0].toString(),
                        assetSymbol: rawDetails[1],
                        priceFeedAddress: rawDetails[2],
                        targetPrice: rawDetails[3].toString(),
                        expiryTimestamp: Number(rawDetails[4]),
                        resolutionTimestamp: Number(rawDetails[5]),
                        totalStakedYes: rawDetails[6].toString(), // CORRECTED
                        totalStakedNo: rawDetails[7].toString(),  // CORRECTED
                        state: Number(rawDetails[8]),
                        actualOutcomeValue: rawDetails[9].toString(),
                        exists: rawDetails[10],
                        isEventMarket: rawDetails[11],
                        creationTimestamp: Number(rawDetails[12]),
                    };
                    return getMarketDisplayProperties(intermediateMarket);
                }).filter(market => market !== null);

                setAllMarkets(processedMarkets.reverse());

            } catch (err) {
                console.error("PMLP: Failed to fetch markets:", err);
                setError(err.message || "An error occurred fetching markets.");
            } finally {
                setIsLoading(false);
            }
        };

        fetchAndProcessData();
    }, [contract]);

    const openMarketsToDisplay = useMemo(() => 
        allMarkets.filter(m => m.state === 0),
        [allMarkets]
    );
    
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