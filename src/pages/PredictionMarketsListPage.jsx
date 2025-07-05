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
        // Create a separate, async function inside useEffect to handle fetching.
        const fetchMarkets = async () => {
            // --- Defensive Guard Clauses ---
            // 1. Wait for the wallet provider to be fully initialized.
            if (!isInitialized) {
                console.log("PMLP: Waiting for provider initialization...");
                setIsLoading(true);
                return;
            }
            // 2. A wallet must be connected.
            if (!walletAddress) {
                console.log("PMLP: Wallet not connected.");
                setIsLoading(false);
                setError("Please connect your wallet to view markets.");
                setAllMarkets([]); // Clear any old data
                return;
            }
            // 3. The contract object must exist for the current chain.
            if (!predictionMarketContract) {
                console.log(`PMLP: Contract not found for chain ${chainId}.`);
                setIsLoading(false);
                setError(`This application is not configured for the current network (Chain ID: ${chainId}).`);
                setAllMarkets([]); // Clear any old data
                return;
            }

            // If we pass all guards, we can proceed.
            setIsLoading(true);
            setError(null);
            console.log(`PMLP (Chain ${chainId}): Contract instance is valid. Attempting to fetch market IDs...`);

            try {
                // --- Using the function name you correctly identified ---
                const marketIds = await predictionMarketContract.getExistingMarketIds();
                
                if (!marketIds || marketIds.length === 0) {
                    console.log("PMLP: No market IDs found.");
                    setAllMarkets([]);
                } else {
                    console.log(`PMLP: Found ${marketIds.length} market IDs. Fetching details...`);
                    // Fetch details for each market ID
                    const marketPromises = marketIds.map(async (id) => {
                        const info = await predictionMarketContract.getMarketInfo(id);
                        return { 
                            id: id.toString(),
                            assetSymbol: info.assetSymbol,
                            state: Number(info.state),
                            expiryTimestamp: Number(info.expiryTimestamp),
                        }; 
                    });
                    const rawMarkets = await Promise.all(marketPromises);
                    const formattedMarkets = rawMarkets
                        .map(getMarketDisplayProperties)
                        .sort((a, b) => parseInt(b.id) - parseInt(a.id));
                    
                    setAllMarkets(formattedMarkets);
                    console.log("PMLP: Successfully fetched and formatted all markets.");
                }
            } catch (err) {
                // This will catch the 'is not a function' error and give a clear message.
                console.error("PMLP: CRITICAL ERROR during market fetch:", err);
                if (err instanceof TypeError && err.message.includes("is not a function")) {
                     setError("A critical mismatch exists between the App and the Smart Contract (ABI). Please contact support.");
                } else {
                     setError("A contract error occurred. The network may be busy or the contract has an issue.");
                }
            } finally {
                setIsLoading(false);
            }
        };

        fetchMarkets();
    // This effect hook will re-run whenever any of these critical properties change.
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