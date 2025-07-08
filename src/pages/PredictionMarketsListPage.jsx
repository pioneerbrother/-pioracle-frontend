// src/pages/PredictionMarketsListPage.jsx

import React, { useState, useEffect, useContext } from 'react';
import { WalletContext } from './WalletProvider';
 
import MarketCard from '../components/predictions/MarketCard';
import LoadingSpinner from '../components/common/LoadingSpinner';
import ErrorMessage from '../components/common/ErrorMessage';
import ConnectWalletButton from '../components/common/ConnectWalletButton';
import { getMarketDisplayProperties } from '../utils/marketutils.js';
import './PredictionMarketsListPage.css';

function PredictionMarketsListPage() {
    const { predictionMarketContract, chainId, isInitialized, walletAddress } = useContext(WalletContext);
    const [markets, setMarkets] = useState([]);
    const [pageState, setPageState] = useState('initializing'); // initializing, loading, success, error
    const [errorMessage, setErrorMessage] = useState('');

    useEffect(() => {
        // This is the core logic that decides what to do
        const fetchAndProcessMarkets = async () => {
            // Guard conditions at the top
            if (!isInitialized) {
                setPageState('initializing');
                return;
            }
            if (!walletAddress) {
                setPageState('prompt_connect'); // New state for clarity
                return;
            }
            if (!predictionMarketContract) {
                // This can happen briefly when switching networks. A loading state is appropriate.
                setPageState('loading'); 
                return;
            }

            setPageState('loading');
            setErrorMessage('');
            console.log(`PMLP (Chain ${chainId}): Contract is valid. Starting fetch...`);

            try {
                // Using your new simplified getter strategy
                const marketIds = await predictionMarketContract.getExistingMarketIds();
                console.log(`PMLP: Found ${marketIds.length} existing market IDs.`);

                if (marketIds.length === 0) {
                    setMarkets([]);
                    setPageState('success'); // Success, but no markets to show
                    return;
                }

                // Fetch details for each valid market ID
                const marketPromises = marketIds.map(id => predictionMarketContract.getMarketInfo(id));
                const rawMarkets = await Promise.all(marketPromises);
                
                const formattedMarkets = rawMarkets
                    .map(raw => {
                        const baseMarket = {
                            id: raw.id.toString(),
                            assetSymbol: raw.assetSymbol,
                            state: Number(raw.state),
                            expiryTimestamp: Number(raw.expiryTimestamp),
                            creationTimestamp: Number(raw.creationTimestamp),
                            totalStakedYes: raw.totalStakedYes.toString(),
                            totalStakedNo: raw.totalStakedNo.toString(),
                        };
                        return getMarketDisplayProperties(baseMarket);
                    })
                    .sort((a, b) => b.creationTimestamp - a.creationTimestamp); // Sort by newest first

                setMarkets(formattedMarkets);
                setPageState('success');
                console.log("PMLP: Successfully fetched and formatted all markets.", formattedMarkets);

            } catch (err) {
                console.error("PMLP: CRITICAL ERROR during market fetch:", err);
                setPageState('error');
                setErrorMessage("A contract error occurred. Please check the network or contract configuration.");
            }
        };

        fetchAndProcessMarkets();
    }, [predictionMarketContract, chainId, isInitialized, walletAddress]);
    
    // --- Render Logic Based on State ---
    const renderContent = () => {
        switch (pageState) {
            case 'initializing':
            case 'loading':
                return <LoadingSpinner message="Fetching markets..." />;
            case 'prompt_connect':
                 return (
                    <div className="centered-prompt">
                        <p>Please connect your wallet to view the markets.</p>
                        <ConnectWalletButton />
                    </div>
                 );
            case 'error':
                return <ErrorMessage title="Error Loading Markets" message={errorMessage} />;
            case 'success':
                return (
                    <div className="market-grid">
                        {markets.length > 0 ? (
                            markets.map(market => <MarketCard key={market.id} market={market} />)
                        ) : (
                            <p>No open markets found on this network. Be the first to create one!</p>
                        )}
                    </div>
                );
            default:
                return null; // Should not happen
        }
    };
    
    return (
        <div className="page-container prediction-list-page">
            <h1>All Existing Markets (Chain ID: {chainId || 'Not Connected'})</h1>
            {renderContent()}
        </div>
    );
}

export default PredictionMarketsListPage;