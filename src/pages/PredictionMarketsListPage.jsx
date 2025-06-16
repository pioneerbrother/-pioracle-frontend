// src/pages/PredictionMarketsListPage.jsx
import React, { useState, useEffect, useContext, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { WalletContext } from './WalletProvider';
import MarketCard from '../components/predictions/MarketCard';
import LoadingSpinner from '../components/common/LoadingSpinner';
import ErrorMessage from '../components/common/ErrorMessage';
import { getMarketDisplayProperties, MarketState as MarketStateEnum } from '../utils/marketutils.js';
import './PredictionMarketsListPage.css'; // This stylesheet will contain the grid logic

function PredictionMarketsListPage() {
    const { contract } = useContext(WalletContext);
    const [allMarkets, setAllMarkets] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    // This useEffect hook is now the single source of truth for fetching and processing data
    useEffect(() => {
        if (!contract) {
            // Keep showing loading spinner if contract isn't ready
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

                // Create an array of promises to fetch all market details in parallel
                const marketDetailPromises = [];
                for (let id = 0; id < nextMarketIdNum; id++) {
                    marketDetailPromises.push(contract.getMarketStaticDetails(id));
                }
                const allRawDetails = await Promise.all(marketDetailPromises);

                // Process the raw data into a clean, display-ready format
                const processedMarkets = allRawDetails.map((rawDetails, index) => {
                    if (!rawDetails || rawDetails.exists !== true) {
                        return null; // Skip non-existent markets
                    }
                    // This structure must match what getMarketDisplayProperties expects
                    const intermediateMarket = {
                        id: rawDetails.id.toString(),
                        assetSymbol: rawDetails.assetSymbol,
                        // ... map all other fields from rawDetails ...
                        state: Number(rawDetails.state),
                        exists: rawDetails.exists,
                        // etc.
                    };
                    return getMarketDisplayProperties(intermediateMarket);
                }).filter(market => market !== null); // Filter out any nulls

                setAllMarkets(processedMarkets);

            } catch (err) {
                console.error("PMLP: Failed to fetch markets:", err);
                setError(err.message || "An error occurred while fetching markets.");
            } finally {
                setIsLoading(false);
            }
        };

        fetchAndProcessData();
    }, [contract]); // This effect re-runs only when the contract is ready

    // Memoized selectors for different market states
    const openMarketsToDisplay = useMemo(() => 
        allMarkets
            .filter(m => m.state === MarketStateEnum.Open)
            .sort((a, b) => a.expiryTimestamp - b.expiryTimestamp),
        [allMarkets]
    );

    const featuredMarket = useMemo(() => {
        // Find the featured market from the list of OPEN markets
        return openMarketsToDisplay.find(market => 
            market.title && market.title.toUpperCase().includes('TRUMP MUSK TOGETHER')
        );
    }, [openMarketsToDisplay]);


    // The main return statement for the page
    return (
        <div className="page-container prediction-list-page">
            
            {/* --- Featured Market Section --- */}
            {featuredMarket && (
                <div className="featured-market-container">
                    <h2>The Billion-Dollar Feud</h2>
                    <p>After trading public insults and financial threats, the alliance between Trump and Musk appears broken. Is a reconciliation possible?</p>
                    <Link to={`/predictions/${featuredMarket.id}`} className="featured-market-button">
                        Predict the Outcome
                    </Link>
                </div>
            )}
            
            {/* --- Main Content Area --- */}
            <div className="market-list-header">
                 <h2 className="section-title">Open Prediction Markets</h2>
                 <Link to="/recently-resolved" className="button secondary">View Recently Resolved</Link>
            </div>
            
            {isLoading && <LoadingSpinner message="Loading open markets..." />}
            {error && <ErrorMessage title="Error Loading Markets" message={error} />}
            
            {!isLoading && !error && openMarketsToDisplay.length === 0 && (
                <div className="no-markets-message">
                    <p>No open markets available right now.</p>
                    <p>Why not <Link to="/create-market">create a new one</Link>?</p>
                </div>
            )}
            
            {/* --- THE NEW GRID LAYOUT --- */}
            {!isLoading && !error && openMarketsToDisplay.length > 0 && (
                <div className="market-grid">
                    {openMarketsToDisplay.map(market => (
                        <MarketCard key={market.id} market={market} />
                    ))}
                </div>
            )}

        </div>
    );
}

export default PredictionMarketsListPage;