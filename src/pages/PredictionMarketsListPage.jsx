// src/pages/PredictionMarketsListPage.jsx

import React, { useState, useEffect, useContext } from 'react';
import { WalletContext } from './WalletProvider';
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
            if (!isInitialized) { setIsLoading(true); return; }
            if (!walletAddress) { setIsLoading(false); setError("Please connect your wallet to view markets."); setAllMarkets([]); return; }
            if (!predictionMarketContract) { setIsLoading(false); setError(`This application is not configured for the current network (Chain ID: ${chainId}).`); setAllMarkets([]); return; }

            setIsLoading(true);
            setError(null);
            console.log(`PMLP (Chain ${chainId}): Contract is valid. Fetching markets using get_all_markets()...`);

            try {
                // --- THIS IS THE CORRECTED FIX ---
                // The contract function is named `get_all_markets`.
                const rawMarketsFromContract = await predictionMarketContract.get_all_markets();
                
                if (rawMarketsFromContract.length === 0) {
                    setAllMarkets([]);
                } else {
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
                        .sort((a, b) => parseInt(b.id) - parseInt(a.id));

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