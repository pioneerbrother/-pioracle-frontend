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
            // 1. Wait until the WalletProvider is fully initialized.
            if (!isInitialized) {
                console.log("PMLP: Waiting for WalletProvider to initialize...");
                setIsLoading(true);
                return;
            }

            // 2. A wallet must be connected to proceed.
            if (!walletAddress) {
                setIsLoading(false);
                setError("Please connect your wallet to view markets.");
                setAllMarkets([]); // Clear any old data
                return;
            }

            // 3. A contract instance for the current network must exist.
            if (!predictionMarketContract) {
                setIsLoading(false);
                setError(`This application is not configured for the current network (Chain ID: ${chainId}). Please switch to a supported network.`);
                setAllMarkets([]); // Clear any old data
                return;
            }

            // If all checks pass, we are ready to fetch data.
            setIsLoading(true);
            setError(null);
            console.log(`PMLP (Chain ${chainId}): Contract is valid. Fetching markets...`);

            try {
                const marketIds = await predictionMarketContract.getExistingMarketIds();
                
                if (marketIds.length === 0) {
                    setAllMarkets([]);
                } else {
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
                }
            } catch (err) {
                console.error("PMLP: A critical error occurred while fetching markets:", err);
                let userMessage = "A contract error occurred. The network may be busy or misconfigured.";
                if (err.code === 'CALL_EXCEPTION') {
                    userMessage = "Could not communicate with the smart contract. This can happen if the contract is not deployed correctly or the blockchain network is congested. Please verify the contract address and try again later.";
                }
                setError(userMessage);
            } finally {
                setIsLoading(false);
            }
        };

        fetchMarkets();
    // This effect now correctly depends on all connection properties.
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