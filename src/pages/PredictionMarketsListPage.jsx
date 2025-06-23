// src/pages/PredictionMarketsListPage.jsx
import React, { useState, useEffect, useContext, useMemo } from 'react';
import { Link } from 'react-router-dom';
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
        // Guard Clause: Do not run if the contract is not yet initialized.
        if (!contract) {
            setIsLoading(true);
            return;
        }

        const fetchAndProcessData = async () => {
            setIsLoading(true);
            setError(null);
            console.log("PMLP: Contract ready. Fetching all markets...");

            try {
                // --- THIS IS THE CORRECTED BIG NUMBER LOGIC ---
                // 1. Get the count as a BigNumber. Assume your contract has a counter like this.
                const nextMarketIdBN = await contract.marketIdCounter(); // Or `nextMarketId()`

                // 2. Check if the count is zero.
                if (nextMarketIdBN.eq(0)) {
                    setAllMarkets([]);
                    setIsLoading(false);
                    return;
                }
                
                // 3. Convert BigNumber to a regular number FOR THE LOOP ONLY.
                // This is safe for any reasonable number of markets (up to 9 quadrillion).
                const marketCountNum = Number(nextMarketIdBN.toString());

                const marketPromises = [];
                // Loop safely using the converted number.
                for (let id = 0; id < marketCountNum; id++) {
                    marketPromises.push(contract.getMarketStaticDetails(id));
                }
                const allRawDetails = await Promise.all(marketPromises);
                // --- END OF CORRECTED LOGIC ---

                const processedMarkets = allRawDetails.map((rawDetails) => {
                    if (!rawDetails || rawDetails.exists !== true) {
                        return null; 
                    }
                    
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

                }).filter(market => market !== null);

                setAllMarkets(processedMarkets);

            } catch (err) {
                console.error("PMLP: Failed to fetch markets:", err);
                setError(err.message || "An error occurred.");
            } finally {
                setIsLoading(false);
            }
        };

        fetchAndProcessData();
    }, [contract]);

    // Your useMemo hooks are correct and do not need to change.
    const openMarketsToDisplay = useMemo(() => 
        allMarkets.filter(m => m.state === 0).sort((a, b) => a.expiryTimestamp - b.expiryTimestamp),
        [allMarkets]
    );
    
    // The rest of your component's return statement can remain the same.
    return (
        <div className="page-container prediction-list-page">
            {isLoading ? (
                <LoadingSpinner message="Fetching markets..." />
            ) : error ? (
                <ErrorMessage title="Error Loading Markets" message={error} />
            ) : (
                <div className="market-grid">
                    {openMarketsToDisplay.length > 0 ? (
                        openMarketsToDisplay.map(market => (
                            <MarketCard key={market.id} market={market} />
                        ))
                    ) : (
                        <p>No open markets found.</p>
                    )}
                </div>
            )}
        </div>
    );
}

export default PredictionMarketsListPage;