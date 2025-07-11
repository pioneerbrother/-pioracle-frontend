// src/pages/PredictionMarketsListPage.jsx

import React, { useState, useEffect, useContext, useMemo } from 'react';

// This path must be correct for your project structure
import { WalletContext } from '../contexts/WalletContext'; 
import MarketCard from '../components/predictions/MarketCard';
import LoadingSpinner from '../components/common/LoadingSpinner';
import ErrorMessage from '../components/common/ErrorMessage';
import { getMarketDisplayProperties, MarketState } from '../utils/marketutils.js';
import './PredictionMarketsListPage.css';

function PredictionMarketsListPage() {
    const { predictionMarketContract, chainId, isInitialized } = useContext(WalletContext);
    
    const [markets, setMarkets] = useState([]);
    const [pageState, setPageState] = useState('initializing');
    const [errorMessage, setErrorMessage] = useState('');

    useEffect(() => {
        const fetchMarkets = async () => {
            console.log("DEBUG (PMLP): useEffect triggered. Contract ready?", !!predictionMarketContract);

            if (!isInitialized || !predictionMarketContract) {
                setPageState('loading');
                return;
            }

            setPageState('loading');
            setErrorMessage('');
            try {
                console.log("DEBUG (PMLP): Calling `nextMarketId`...");
                const nextIdBN = await predictionMarketContract.nextMarketId();
                const totalMarkets = nextIdBN.toNumber();
                console.log(`DEBUG (PMLP): Success! nextMarketId is ${totalMarkets}`);

                if (totalMarkets === 0) {
                    console.log("DEBUG (PMLP): No markets found on this contract. Displaying empty list.");
                    setMarkets([]);
                    setPageState('success');
                    return;
                }

                console.log(`DEBUG (PMLP): Creating ${totalMarkets} promises to fetch market details...`);
                const marketPromises = [];
                for (let i = 0; i < totalMarkets; i++) {
                    const marketIdToFetch = totalMarkets - 1 - i; // Fetch newest first
                    marketPromises.push(predictionMarketContract.getMarketStaticDetails(marketIdToFetch));
                }
                
                console.log("DEBUG (PMLP): Awaiting all promises with Promise.all...");
                const rawMarkets = await Promise.all(marketPromises);
                console.log("DEBUG (PMLP): Success! Received raw data for all markets:", rawMarkets);
                
                // CRITICAL: This is where errors often happen silently.
                console.log("DEBUG (PMLP): Formatting raw market data...");
                const formattedMarkets = rawMarkets
                    .filter(market => market && market.exists === true)
                    .map(raw => getMarketDisplayProperties(raw)); // Assuming this utility function exists and works
                
                console.log("DEBUG (PMLP): Formatted markets successfully:", formattedMarkets);
                setMarkets(formattedMarkets);
                setPageState('success');

            } catch (err) {
                // This will catch any error during the fetching or processing.
                console.error("PMLP: CRITICAL ERROR during market fetch:", err);
                setPageState('error');
                setErrorMessage("Could not load markets. The contract might be on a different network or an error occurred. Check the console.");
                setMarkets([]);
            }
        };

        fetchMarkets();
    }, [predictionMarketContract, chainId, isInitialized]); // Stable dependency array
    
    // This part correctly filters the markets for display
    const openMarkets = useMemo(() => {
        return markets.filter(m => m.state === MarketState.Open || m.state === MarketState.Resolvable);
    }, [markets]);

    const renderContent = () => {
        switch (pageState) {
            case 'initializing':
            case 'loading':
                return <LoadingSpinner />;
            case 'error':
                return <ErrorMessage message={errorMessage} />;
            case 'success':
                if (openMarkets.length > 0) {
                    return (
                        <div className="markets-grid">
                            {openMarkets.map(market => (
                                <MarketCard key={market.id} market={market} />
                            ))}
                        </div>
                    );
                }
                return <p className="no-markets-message">No open markets found on this network.</p>;
            default:
                return null;
        }
    };
    
    return (
        <div className="page-container prediction-list-page">
            <h1>Open Markets (Chain ID: {chainId || 'Not Connected'})</h1>
            {renderContent()}
        </div>
    );
}

export default PredictionMarketsListPage;