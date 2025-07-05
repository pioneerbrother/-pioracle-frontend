// src/pages/PredictionMarketsListPage.jsx

import React, { useState, useEffect, useContext } from 'react';
import { WalletContext } from './WalletProvider'; // Ensure this path is correct
import MarketCard from '../components/predictions/MarketCard';
import LoadingSpinner from '../components/common/LoadingSpinner';
import ErrorMessage from '../components/common/ErrorMessage';
import { getMarketDisplayProperties } from '../utils/marketutils.js';
import './PredictionMarketsListPage.css';

function PredictionMarketsListPage() {
    const { predictionMarketContract, chainId, isInitialized, walletAddress } = useContext(WalletContext);
    const [allMarkets, setAllMarkets] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchMarkets = async () => {
            if (!isInitialized) {
                setIsLoading(true); return;
            }
            if (!walletAddress) {
                setIsLoading(false); setError("Please connect your wallet to view markets."); setAllMarkets([]); return;
            }
            if (!predictionMarketContract) {
                setIsLoading(false); setError(`This application is not configured for the current network (Chain ID: ${chainId}).`); setAllMarkets([]); return;
            }

            setIsLoading(true);
            setError(null);
            console.log(`PMLP (Chain ${chainId}): Contract is valid. Fetching markets using getAllMarkets()...`);

            try {
                // --- THIS IS THE FIX ---
                // The contract function is named `getAllMarkets`, not `getExistingMarketIds`.
                // This one function returns all market data at once, which is more efficient.
                const rawMarketsFromContract = await predictionMarketContract.getAllMarkets();
                
                if (rawMarketsFromContract.length === 0) {
                    setAllMarkets([]);
                } else {
                    // The rest of the logic is now much simpler.
                    // We just need to format the data we already received.
                    const formattedMarkets = rawMarketsFromContract
                        .map(raw => {
                            const market = {
                                id: raw.id.toString(),
                                assetSymbol: raw.assetSymbol,
                                state: Number(raw.state),
                                expiryTimestamp: Number(raw.expiryTimestamp),
                            };
                            return getMarketDisplayProperties(market);
                        })
                        .sort((a, b) => parseInt(b.id) - parseInt(a.id)); // Sort by newest first

                    setAllMarkets(formattedMarkets);
                }
            } catch (err) {
                console.error("PMLP: A critical error occurred while fetching markets:", err);
                setError("A contract error occurred. The network may be busy or the contract has an issue.");
            } finally {
                setIsLoading(false);
            }
        };

        fetchMarkets();
    }, [predictionMarketContract, chainId, isInitialized, walletAddress]);
    
    const openMarketsToDisplay = allMarkets.filter(m => m.state === 0);

    return (
        <div className="page-container prediction-list-page">
            <h1>Open Markets (Chain ID: {chainId || 'Not Connected'})</h1>
            
            {isLoading && <LoadingSpinner message="Fetching markets..." />}
            
            {error && !isLoading && <ErrorMessage title="Error Loading Markets" message={error} />}
            
            {!isLoading && !error && (
                 <div className="market-grid">
                    {openMarketsToDisplay.length > 0 ? (
                        openMarketsToDisplay.map(market => <MarketCard key={market.id} market={market} />)
                    ) : (
                        <p>No open markets found on this network. Create one!</p>
                    )}
                </div>
            )}
        </div>
    );
}

export default PredictionMarketsListPage;