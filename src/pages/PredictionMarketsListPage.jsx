// pioracle/src/pages/PredictionMarketsListPage.jsx
// Version WITHOUT page-specific <title> and <meta> tags. Defaults from App.jsx will apply.

import React, { useState, useEffect, useContext, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { WalletContext } from '../context/WalletProvider';
import MarketCard from '../components/predictions/MarketCard';
import LoadingSpinner from '../components/common/LoadingSpinner';
import ErrorMessage from '../components/common/ErrorMessage';
import { 
    getMarketDisplayProperties, 
    MarketState as MarketStateEnumFromUtil 
} from '../utils/marketutils.js'; // Ensure this is your correct, consistently cased filename
import './PredictionMarketsListPage.css';

const MarketState = MarketStateEnumFromUtil;

function PredictionMarketsListPage() {
    const { contract: predictionContractInstance, connectionStatus } = useContext(WalletContext);
    const [rawMarkets, setRawMarkets] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchAllMarkets = useCallback(async () => {
        if (!predictionContractInstance) {
            if (connectionStatus?.type === 'error' && connectionStatus.message) {
                setError(`Cannot load markets: WalletProvider error - ${connectionStatus.message}`);
            }
            if (connectionStatus?.type !== 'info' && connectionStatus?.type !== 'success' && connectionStatus?.type !== null) {
                setIsLoading(false);
            }
            return;
        }
        setIsLoading(true); setError(null); setRawMarkets([]);
        try {
            console.log("PredictionMarketsListPage: Fetching nextMarketId...");
            const nextIdBigNumber = await predictionContractInstance.nextMarketId();
            const nextId = Number(nextIdBigNumber);
            console.log("PredictionMarketsListPage: nextMarketId =", nextId);

            if (nextId === 0) {
                setRawMarkets([]); setIsLoading(false); return;
            }

            const marketPromises = [];
            for (let i = 0; i < nextId; i++) {
                if (typeof predictionContractInstance.getMarketStaticDetails !== 'function') {
                    throw new Error("getMarketStaticDetails function not found on contract instance. ABI might be incorrect.");
                }
                marketPromises.push(predictionContractInstance.getMarketStaticDetails(i));
            }
            
            const marketsDetailsArray = await Promise.all(marketPromises);
            console.log("PredictionMarketsListPage: Received all market details from contract.");

            const processedMarkets = marketsDetailsArray.map((detailsArray) => {
                const expectedLength = 13; // Assumes creationTimestamp is the 13th element (index 12)
                if (!detailsArray || detailsArray.length < expectedLength || typeof detailsArray[10] === 'undefined' || !detailsArray[10]) {
                    console.warn("Skipping market due to incomplete data from contract or 'exists' is false:", detailsArray);
                    return null; 
                }
                return {
                    id: detailsArray[0].toString(), assetSymbol: detailsArray[1], priceFeedAddress: detailsArray[2],
                    targetPrice: detailsArray[3].toString(), expiryTimestamp: Number(detailsArray[4]),
                    resolutionTimestamp: Number(detailsArray[5]), totalStakedYesNet: detailsArray[6].toString(),
                    totalStakedNoNet: detailsArray[7].toString(), state: Number(detailsArray[8]),
                    actualOutcomeValue: detailsArray[9].toString(), exists: detailsArray[10],
                    isEventMarket: detailsArray[11], creationTimestamp: Number(detailsArray[12]),
                    oracleDecimals: 8 
                };
            }).filter(market => market !== null);
            
            console.log("Processed markets before setting state:", processedMarkets);
            setRawMarkets(processedMarkets);

        } catch (e) {
            console.error("Error in fetchAllMarkets:", e);
            setError("Failed to load markets. Ensure wallet is connected to Polygon Mainnet and contract/ABI are correct.");
        } finally {
            setIsLoading(false);
        }
    }, [predictionContractInstance, connectionStatus?.type]);

    useEffect(() => {
        if (predictionContractInstance) {
            fetchAllMarkets();
        } else {
             if (connectionStatus?.type === 'error' || (connectionStatus?.type !== 'info' && connectionStatus?.type !== 'success' && connectionStatus?.type !== null)) {
                setIsLoading(false);
                if(connectionStatus?.type === 'error' && connectionStatus.message) {
                    setError(`WalletProvider Error: ${connectionStatus.message}`);
                } else if (!predictionContractInstance && (connectionStatus?.type !== 'info' && connectionStatus?.type !== null)) {
                     setError("Connect wallet or wait for contract initialization.");
                }
             } else {
                setIsLoading(true); 
             }
        }
    }, [predictionContractInstance, fetchAllMarkets, connectionStatus?.type]);

    const openMarketsToDisplay = useMemo(() => {
        if (!rawMarkets || rawMarkets.length === 0) {
            console.log("openMarketsToDisplay: No raw markets to process.");
            return [];
        }
        const filtered = rawMarkets.filter(market => market.state === MarketState.Open);
        console.log("openMarketsToDisplay: Filtered for open state:", filtered);

        const mapped = filtered.map(market => {
            try {
                return { ...market, ...getMarketDisplayProperties(market) };
            } catch (e) {
                console.error("Error in getMarketDisplayProperties for market:", market, e);
                return null; 
            }
        });
        const final = mapped.filter(market => market !== null)
                            .sort((a, b) => (a.expiryTimestamp || 0) - (b.expiryTimestamp || 0));
        console.log("openMarketsToDisplay: Final displayable markets:", final);
        return final;
    }, [rawMarkets]);

    return (
        // No <title> or <meta> tags here; they will come from App.jsx defaults
        <div className="page-container prediction-markets-list-page">
            <div className="welcome-banner" style={{ textAlign: 'center', margin: '20px 0', padding: '0 15px' }}>
                <h2>Welcome to PiOracle!</h2>
                <p>Make your predictions on exciting cryptocurrency markets, including Bitcoin and Pi Coin! Where do you see their prices heading?</p>
            </div>

            <div className="market-view-controls" style={{ marginBottom: '20px', marginTop: '10px', textAlign: 'center' }}>
                <Link to="/resolved-markets" className="button secondary">View Recently Resolved Markets</Link>
            </div>

            <h2>Open Prediction Markets</h2>

            {isLoading && <LoadingSpinner message="Loading open markets..." />}
            {error && <ErrorMessage title="Error Loading Markets" message={error} onRetry={fetchAllMarkets} />}
            
            {!isLoading && !error && openMarketsToDisplay.length === 0 && (
                <p style={{ textAlign: 'center' }}>No open markets available right now. Check the "Recently Resolved" section or come back soon!</p>
            )}

            <div className="market-list">
                {openMarketsToDisplay.map(market => (
                    <MarketCard key={market.id} market={market} />
                ))}
            </div>

            <section className="how-to-participate" style={{marginTop: '40px', padding: '0 20px', marginBottom: '30px'}}>
                 <h2>How to Participate (on Polygon Mainnet)</h2>
                <ol>
                    {/* ... list items ... */}
                </ol>
            </section>
        </div>
    );
}

export default PredictionMarketsListPage;