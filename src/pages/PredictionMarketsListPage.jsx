// pioracle/src/pages/PredictionMarketsListPage.jsx
import React, { useState, useEffect, useContext, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { ethers } from 'ethers'; // Ensure ethers is imported if used for BigNumber or constants
import { WalletContext } from './WalletProvider'; // Assuming WalletProvider.jsx is in the same /pages folder
import MarketCard from '../components/predictions/MarketCard';
import LoadingSpinner from '../components/common/LoadingSpinner';
import ErrorMessage from '../components/common/ErrorMessage';
import { 
    getMarketDisplayProperties, 
    MarketState as MarketStateEnumFromUtil 
} from '../utils/marketutils.js';
// import { BigNumber } from 'ethers'; // Not needed if you import the whole 'ethers' object

import './PredictionMarketsListPage.css';

const MarketState = MarketStateEnumFromUtil;

function PredictionMarketsListPage() {
    const { contract: predictionContractInstance, connectionStatus, walletAddress } = useContext(WalletContext);
    const [rawMarkets, setRawMarkets] = useState([]); // This will store objects from getMarketDisplayProperties
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [nextMarketIdDebug, setNextMarketIdDebug] = useState(''); // For debugging nextMarketId if needed

    console.log("PMLP_DEBUG: RENDER - predictionContractInstance:", !!predictionContractInstance, "ConnectionStatus:", connectionStatus?.type, "WalletAddress:", walletAddress);

    // processMarketDetails: Takes raw data from contract, its ID, and returns the display-ready object
    const processMarketDetails = useCallback((rawContractData, marketId) => {
        console.log(`PMLP_DEBUG_PROCESS: START - Processing market ID ${marketId}. Raw data:`, rawContractData);
        try {
            // Ensure the rawContractData has the 'exists' property from your getMarketStaticDetails return
            if (!rawContractData || typeof rawContractData.exists !== 'boolean') {
                 console.warn(`PMLP_DEBUG_PROCESS: Market ID ${marketId} has no 'exists' field or data is malformed. Raw:`, rawContractData, "Skipping.");
                 return null;
            }
            if (rawContractData.exists !== true) {
                console.warn(`PMLP_DEBUG_PROCESS: Market ID ${marketId} 'exists' flag is false. Skipping.`);
                return null; 
            }

            // Create an intermediate object with JS-friendly types from BigNumbers
            // This intermediate object is what getMarketDisplayProperties will work with.
            const intermediateMarket = {
                id: rawContractData.id.toString(),
                assetSymbol: rawContractData.assetSymbol,
                priceFeedAddress: rawContractData.priceFeedAddress,
                targetPrice: rawContractData.targetPrice, // Pass as BigNumber if getMarketDisplayProperties handles it
                expiryTimestamp: rawContractData.expiryTimestamp.toNumber(),
                resolutionTimestamp: rawContractData.resolutionTimestamp.toNumber(),
                creationTimestamp: rawContractData.creationTimestamp.toNumber(),
                isEventMarket: rawMarketData.isEventMarket,
                state: ethers.BigNumber.isBigNumber(rawContractData.state) // Convert enum/uint8 to number
                    ? rawContractData.state.toNumber() 
                    : parseInt(rawContractData.state),
                exists: rawContractData.exists,
                totalStakedYes: rawContractData.totalStakedYes.toString(),
                totalStakedNo: rawContractData.totalStakedNo.toString(),
                actualOutcomeValue: rawContractData.actualOutcomeValue.toString(),
                // Fields from the full Market struct that are NOT in getMarketStaticDetails:
                // marketCreator, creatorFeeBasisPoints, isUserCreated
                // If MarketCard needs these, they must be added to getMarketStaticDetails in Solidity
                // and then mapped here. For now, they will be undefined.
                marketCreator: rawContractData.marketCreator, // If getMarketStaticDetails returns it
                creatorFeeBasisPoints: rawContractData.creatorFeeBasisPoints, // If getMarketStaticDetails returns it
            };
            console.log(`PMLP_DEBUG_PROCESS: Intermediate market data for ID ${marketId}:`, intermediateMarket);
            
            // getMarketDisplayProperties adds UI-specific fields like title, formatted dates, status strings
            const displayReadyMarket = getMarketDisplayProperties(intermediateMarket);
            if (!displayReadyMarket) {
                console.warn(`PMLP_DEBUG_PROCESS: getMarketDisplayProperties returned null for market ID ${marketId}. Skipping.`);
                return null;
            }
            console.log(`PMLP_DEBUG_PROCESS: Display-ready market data for ID ${marketId} from getMarketDisplayProperties:`, displayReadyMarket);
            
            return displayReadyMarket;

        } catch (e) {
            console.error(`PMLP_DEBUG_PROCESS: Error processing details for market ID ${marketId}:`, e, "Raw Data:", rawContractData);
            return null; 
        }
    }, [getMarketDisplayProperties]); // Dependency: getMarketDisplayProperties (if it's memoized)

    const fetchAllMarkets = useCallback(async () => {
        if (!predictionContractInstance) {
            console.log("PMLP_DEBUG: fetchAllMarkets - No contract instance.");
            setIsLoading(false); 
            return;
        }
        
        console.log("PMLP_DEBUG: fetchAllMarkets - STARTING. Setting loading true, clearing error.");
        setIsLoading(true);
        setError(null);

        try {
            const nextMarketIdBN = await predictionContractInstance.nextMarketId();
            const nextMarketIdNum = nextMarketIdBN.toNumber();
            console.log(`PMLP_DEBUG: fetchAllMarkets - nextMarketIdNum from contract = ${nextMarketIdNum}`);
            setNextMarketIdDebug(nextMarketIdNum.toString());


            if (nextMarketIdNum === 0) {
                console.log("PMLP_DEBUG: fetchAllMarkets - No markets to fetch (nextMarketId is 0).");
                setRawMarkets([]);
                // setIsLoading(false); // Finally block will handle this
                return; // Return early from try block
            }

            const tempMarketsArray = [];
            for (let idToFetch = 0; idToFetch < nextMarketIdNum; idToFetch++) {
                console.log(`PMLP_DEBUG: fetchAllMarkets - TOP OF LOOP for market ID ${idToFetch}.`);
                try {
                    const rawDetails = await predictionContractInstance.getMarketStaticDetails(idToFetch);
                    console.log(`PMLP_DEBUG: fetchAllMarkets - AFTER getMarketStaticDetails for ID ${idToFetch}. Raw data:`, rawDetails);

                    // The rawDetails.exists check is now primary within processMarketDetails
                    const processedMarket = processMarketDetails(rawDetails, idToFetch);
                    if (processedMarket) { // processMarketDetails returns null if market doesn't exist or error
                        tempMarketsArray.push(processedMarket);
                        console.log(`PMLP_DEBUG: fetchAllMarkets - Successfully processed and pushed market ID ${idToFetch}`);
                    } else {
                        console.warn(`PMLP_DEBUG: fetchAllMarkets - processMarketDetails decided to skip market ID ${idToFetch}.`);
                    }
                } catch (loopError) {
                    console.error(`PMLP_DEBUG: fetchAllMarkets - Error in loop for market ID ${idToFetch} (e.g., getMarketStaticDetails reverted):`, loopError);
                }
                console.log(`PMLP_DEBUG: fetchAllMarkets - BOTTOM OF LOOP for market ID ${idToFetch}.`);
            }
            
            console.log("PMLP_DEBUG: fetchAllMarkets - Loop finished. Total items in tempMarketsArray:", tempMarketsArray.length);
            setRawMarkets(tempMarketsArray);

        } catch (error) {
            console.error("PMLP_DEBUG: fetchAllMarkets - General error in try block:", error);
            setError(error.message || "Failed to load markets.");
            setRawMarkets([]);
        } finally {
            setIsLoading(false);
            console.log("PMLP_DEBUG: fetchAllMarkets - FINALLY block. Loading set to false.");
        }
    }, [predictionContractInstance, processMarketDetails]); // processMarketDetails is a dependency

    useEffect(() => {
        console.log("PMLP_DEBUG: useEffect - Firing. predictionContractInstance:", !!predictionContractInstance, "connectionStatus:", connectionStatus?.type, "walletAddress:", walletAddress);
        if (predictionContractInstance) {
            fetchAllMarkets();
        } else {
            if (connectionStatus?.type === 'error' && connectionStatus.message) {
                setError(`WalletProvider Error: ${connectionStatus.message}`);
                setIsLoading(false);
            } else if (connectionStatus?.type === 'info' && connectionStatus.message && connectionStatus.message.toLowerCase().includes('initializing')) {
                setIsLoading(true); // WalletProvider still initializing
            } else {
                // Not an error, not initializing, but no contract. Could be disconnected state.
                // Or if Web3Modal init failed.
                setIsLoading(false); 
                console.log("PMLP_DEBUG: useEffect - No contract instance, not initializing. May be disconnected or modal error.");
            }
        }
    }, [predictionContractInstance, fetchAllMarkets, connectionStatus?.type, walletAddress]);

// Inside PredictionMarketListPage.jsx

// ... (other code) ...

    const openMarketsToDisplay = useMemo(() => {
        console.log("PMLP_DEBUG: useMemo openMarketsToDisplay - ENTERED. rawMarkets IS:", rawMarkets);
        if (!rawMarkets || rawMarkets.length === 0) {
            console.log("PMLP_DEBUG: useMemo - rawMarkets empty or null, returning [].");
            return [];
        }
    
        const filtered = rawMarkets.filter(market => { // Removed unused 'index' for now
            if (!market || typeof market.state === 'undefined' || typeof market.id === 'undefined') {
                console.warn("PMLP_DEBUG: useMemo - Filtering out invalid market object:", market);
                return false;
            }
            console.log(`PMLP_DEBUG: useMemo - Filtering item: ID ${market.id}, State: ${market.state}, MarketState.Open CONST: ${MarketState.Open}`);
            const isOpen = market.state === MarketState.Open; 
            console.log(`PMLP_DEBUG: useMemo - IsOpen for market ID ${market.id}: ${isOpen}`);
            return isOpen;
        });

        // Corrected log for line ~182
        console.log(`PMLP_DEBUG: useMemo - Markets after filtering for Open state (length ${filtered.length}):`, filtered);
    
        const sorted = filtered.sort((a, b) => (a.expiryTimestamp || 0) - (b.expiryTimestamp || 0));
        
        // Corrected log for line ~188
        console.log(`PMLP_DEBUG: useMemo - Final openMarketsToDisplay (length ${sorted.length}):`, sorted);
        
        return sorted;
    }, [rawMarkets]);

// ... (rest of the component) ...

    return (
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
                <div style={{ textAlign: 'center', padding: '20px', border: '1px dashed #ccc', margin: '20px' }}>
                    <p>No open markets available right now.</p>
                    <p>Why not <Link to="/create-market">create a new one</Link>?</p>
                    <p>Or check the "Recently Resolved" section.</p>
                </div>
            )}

            <div className="market-list">
                {openMarketsToDisplay.map(market => (
                    <MarketCard key={market.id} market={market} />
                ))}
            </div>

            <section className="how-to-participate" style={{marginTop: '40px', padding: '0 20px', marginBottom: '30px'}}>
                <h2>How to Participate (on Polygon Mainnet)</h2>
                <ol>
                    <li><strong>Get a Wallet (MetaMask Recommended):</strong> Ensure you have a browser extension wallet like MetaMask installed and configured for the Polygon Mainnet.</li>
                    <li><strong>Get MATIC:</strong> You'll need MATIC tokens in your wallet to pay for transaction gas fees and to place your predictions. You can acquire MATIC from most major exchanges.</li>
                    <li><strong>Connect Your Wallet:</strong> Click the "Connect Wallet" button at the top of PiOracle.</li>
                    <li><strong>Browse Markets:</strong> Explore the available "Open Prediction Markets".</li>
                    <li><strong>Make Your Prediction:</strong> Click on a market, select your predicted outcome (YES or NO), and enter the amount of MATIC you wish to stake.</li>
                    <li><strong>Confirm Transaction:</strong> Approve the transaction in your MetaMask wallet.</li>
                    <li><strong>Check Back & Claim:</strong> After a market resolves (check "Recently Resolved Markets" or "My Predictions"), if your prediction was correct, return to the market page to claim your winnings!</li>
                </ol>
            </section>
        </div>
    );
}

export default PredictionMarketsListPage;