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
        if (!contract) {
            setIsLoading(true);
            return;
        }

        const fetchAndProcessData = async () => {
            setIsLoading(true);
            setError(null);
            console.log("PMLP: Contract ready. Fetching all markets...");

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

                // --- THIS IS THE DEFINITIVE DATA PROCESSING LOGIC ---
                const processedMarkets = allRawDetails.map((rawDetails) => {
                    if (!rawDetails || rawDetails.exists !== true) {
                        return null; // Skip non-existent markets
                    }
                    
                    // 1. Create a clean intermediate object directly from the contract array
                    const intermediateMarket = {
                        id: rawDetails[0].toString(),
                        assetSymbol: rawDetails[1],
                        priceFeedAddress: rawDetails[2],
                        targetPrice: rawDetails[3].toString(),
                        expiryTimestamp: Number(rawDetails[4]), // <-- CRITICAL: Convert BigNumber to Number
                        resolutionTimestamp: Number(rawDetails[5]),
                        totalStakedYesNet: rawDetails[6].toString(),
                        totalStakedNoNet: rawDetails[7].toString(),
                        state: Number(rawDetails[8]),
                        actualOutcomeValue: rawDetails[9].toString(),
                        exists: rawDetails[10],
                        isEventMarket: rawDetails[11],
                        creationTimestamp: Number(rawDetails[12]),
                    };

                    // 2. Pass this clean object to get the final display properties
                    return getMarketDisplayProperties(intermediateMarket);

                }).filter(market => market !== null); // Filter out any that failed processing

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

    // All the useMemo hooks for filtering and finding the featured market remain the same
    const openMarketsToDisplay = useMemo(() => 
        allMarkets.filter(m => m.state === 0).sort((a, b) => a.expiryTimestamp - b.expiryTimestamp),
        [allMarkets]
    );

    const featuredMarket = useMemo(() => {
        return openMarketsToDisplay.find(market => 
            market.title && market.title.toUpperCase().includes('TRUMP MUSK TOGETHER')
        );
    }, [openMarketsToDisplay]);

    // The return statement with JSX remains the same
    return (
        <div className="page-container prediction-list-page">
            {/* ... Your featured market banner and other JSX ... */}

            <div className="market-grid">
                {openMarketsToDisplay.map(market => (
                    <MarketCard key={market.id} market={market} />
                ))}
            </div>
            
            {/* ... Loading, Error, and No Markets messages ... */}
        </div>
    );
}

export default PredictionMarketsListPage;