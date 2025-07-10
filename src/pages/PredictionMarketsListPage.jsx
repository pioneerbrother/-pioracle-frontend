// src/pages/PredictionMarketsListPage.jsx

import React, { useState, useEffect, useContext, useMemo } from 'react';
// Corrected the import path for the new context file structure
import { WalletContext } from '../contexts/WalletContext'; 
import MarketCard from '../components/predictions/MarketCard';
import LoadingSpinner from '../components/common/LoadingSpinner';
import ErrorMessage from '../components/common/ErrorMessage';
import ConnectWalletButton from '../components/common/ConnectWalletButton';
import { getMarketDisplayProperties, MarketState } from '../utils/marketutils.js';
import './PredictionMarketsListPage.css';

function PredictionMarketsListPage() {
    // Note: I'm assuming you moved WalletContext to a `contexts` folder. 
    // If it's still in `pages`, change the import path back to './WalletProvider'.
    const { predictionMarketContract, chainId, isInitialized, walletAddress } = useContext(WalletContext);
    
    const [markets, setMarkets] = useState([]);
    const [pageState, setPageState] = useState('initializing');
    const [errorMessage, setErrorMessage] = useState('');

    // --- REWRITTEN useEffect with extensive logging ---
    useEffect(() => {
        const fetchMarkets = async () => {
            console.log("DEBUG: useEffect triggered. Current State:", {
                isInitialized,
                walletAddress: !!walletAddress,
                predictionMarketContract: !!predictionMarketContract,
                chainId,
            });

            if (!isInitialized) {
                console.log("DEBUG: Still initializing. Setting page state to 'initializing'.");
                setPageState('initializing');
                return;
            }
            
            // This now allows non-connected users to see read-only data
            if (!predictionMarketContract) {
                console.log("DEBUG: Contract object not ready yet. This is normal during initial load or on unsupported chains. Waiting...");
                setPageState('loading'); // Show loading while we wait for the provider/contract
                return;
            }

            console.log("DEBUG: Contract is ready. Proceeding to fetch markets.");
            setPageState('loading');
            setErrorMessage('');
            try {
                console.log("DEBUG: Calling `nextMarketId`...");
                const nextIdBN = await predictionMarketContract.nextMarketId();
                const totalMarkets = nextIdBN.toNumber();
                console.log(`DEBUG: Success! nextMarketId is ${totalMarkets}`);

                if (totalMarkets === 0) {
                    console.log("DEBUG: No markets found on this contract. Setting markets to empty and state to success.");
                    setMarkets([]);
                    setPageState('success');
                    return;
                }

                console.log(`DEBUG: Creating ${totalMarkets} promises to fetch market details...`);
                const marketPromises = [];
                for (let i = 0; i < totalMarkets; i++) {
                    // Fetching newest first
                    const marketIdToFetch = totalMarkets - 1 - i;
                    marketPromises.push(predictionMarketContract.getMarketStaticDetails(marketIdToFetch));
                }
                
                console.log("DEBUG: Awaiting all promises with Promise.all...");
                const rawMarkets = await Promise.all(marketPromises);
                console.log("DEBUG: Success! Received raw data for all markets:", rawMarkets);

                // Assuming getMarketDisplayProperties exists and works correctly
                const formattedMarkets = rawMarkets
                    .filter(market => market && market.exists === true)
                    .map(raw => getMarketDisplayProperties(raw)) // Pass the whole raw object
                    .sort((a, b) => parseInt(b.id) - parseInt(a.id)); // Sorting is good, but already fetched in reverse

                console.log("DEBUG: Formatted markets successfully:", formattedMarkets);
                setMarkets(formattedMarkets);
                setPageState('success');

            } catch (err) {
                console.error("PMLP: CRITICAL ERROR during market fetch:", err);
                setPageState('error');
                setErrorMessage("A contract error occurred. Please check the network or contract configuration. See console for details.");
                setMarkets([]); // Clear markets on error
            }
        };

        fetchMarkets();
    }, [predictionMarketContract, chainId, isInitialized]); // Removed walletAddress from dependency array as contract availability is the key trigger.
    
    const openMarkets = useMemo(() => {
        return markets.filter(m => m.state === MarketState.Open || m.state === MarketState.Resolvable);
    }, [markets]);

    const renderContent = () => {
        switch (pageState) {
            case 'initializing':
            case 'loading':
                return <LoadingSpinner />;
            case 'prompt_connect': // This case might not be hit with the new logic, but is good to have
                return <div className="prompt-container"><p>Please connect your wallet to view markets.</p><ConnectWalletButton /></div>;
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
                return <p className="no-markets-message">No open markets found on this network. Be the first to create one!</p>;
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