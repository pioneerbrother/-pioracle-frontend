// pioracle/src/pages/PredictionMarketsListPage.jsx
import React, { useState, useEffect, useContext, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { WalletContext } from './WalletProvider'; // Assuming it's in the same /pages folder
import MarketCard from '../components/predictions/MarketCard';
import LoadingSpinner from '../components/common/LoadingSpinner';
import ErrorMessage from '../components/common/ErrorMessage';
import { 
    getMarketDisplayProperties, 
    MarketState as MarketStateEnumFromUtil 
} from '../utils/marketutils.js';
import './PredictionMarketsListPage.css';

const MarketState = MarketStateEnumFromUtil; // Should be 0 for Open, 1 for Resolved_YES, etc.

function PredictionMarketsListPage() {
    const { contract: predictionContractInstance, connectionStatus, walletAddress } = useContext(WalletContext); // Added walletAddress
    const [rawMarkets, setRawMarkets] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [nextMarketIdDebug, setNextMarketIdDebug] = useState(''); // Added for debugging if you want it

    console.log("PMLP_DEBUG: RENDER - predictionContractInstance:", !!predictionContractInstance, "ConnectionStatus:", connectionStatus?.type, "WalletAddress:", walletAddress);

    // Define processMarketDetails (wrap in useCallback)
// Inside PredictionMarketListPage.jsx

// processMarketDetails: Takes raw data from contract and the market's ID
const processMarketDetails = useCallback((rawContractData, marketId) => {
    console.log(`PMLP_DEBUG_PROCESS: Processing market ID ${marketId}. Raw data:`, rawContractData);
    try {
        if (!rawContractData || rawContractData.exists !== true) {
            console.warn(`PMLP_DEBUG_PROCESS: Market ID ${marketId} 'exists' flag is not true or data missing. Skipping.`);
            return null; 
        }

        // Directly map fields from the contract's return struct
        // Ethers.js returns struct values as an array with named properties
        const intermediateMarket = {
            id: rawContractData.id.toString(), // Use the ID from the struct
            assetSymbol: rawContractData.assetSymbol,
            // 'question' for MarketCard will be derived by getMarketDisplayProperties from assetSymbol or a dedicated field
            
            // For targetPrice, we need to format it based on whether it's an event or priceFeed market.
            // This logic is better placed in getMarketDisplayProperties if it needs decimals info.
            // For now, pass the raw BigNumber or a placeholder.
            targetPrice: rawContractData.targetPrice, // Pass BigNumber, let getMarketDisplayProperties format
            
            expiryTimestamp: rawContractData.expiryTimestamp.toNumber(), // Convert BigNumber to JS number
            resolutionTimestamp: rawContractData.resolutionTimestamp.toNumber(),
            creationTimestamp: rawContractData.creationTimestamp.toNumber(),
            isEventMarket: rawContractData.isEventMarket,
            state: ethers.BigNumber.isBigNumber(rawContractData.state) 
                   ? rawContractData.state.toNumber() 
                   : parseInt(rawContractData.state), // MarketState enum (0-6)
            exists: rawContractData.exists,

            // These might be useful for getMarketDisplayProperties or directly in MarketCard if needed
            totalStakedYes: rawContractData.totalStakedYes.toString(), // Pass as string for large numbers
            totalStakedNo: rawMarketData.totalStakedNo.toString(),
            actualOutcomeValue: rawMarketData.actualOutcomeValue.toString(),
            priceFeedAddress: rawMarketData.priceFeedAddress, // For getMarketDisplayProperties to use if it needs to fetch decimals

            // Fields from the full Market struct NOT directly returned by getMarketStaticDetails:
            // marketCreator, creatorFeeBasisPoints, isUserCreated
            // If MarketCard needs these, you'll have to modify getMarketStaticDetails in Solidity
            // or make additional contract calls (less efficient).
            // For now, we'll assume getMarketDisplayProperties or MarketCard can handle their absence.
        };

        console.log(`PMLP_DEBUG_PROCESS: Intermediate market data for ID ${marketId}:`, intermediateMarket);
        
        // Now, let getMarketDisplayProperties add the display-specific fields
        const displayReadyMarket = getMarketDisplayProperties(intermediateMarket);
        console.log(`PMLP_DEBUG_PROCESS: Display-ready market data for ID ${marketId}:`, displayReadyMarket);
        
        return displayReadyMarket; // This object should now have title, targetDisplay, expiryString etc.

    } catch (e) {
        console.error(`PMLP_DEBUG_PROCESS: Error processing details for market ID ${marketId}:`, e, "Raw Data:", rawContractData);
        return null; 
    }
}, []); // Assuming getMarketDisplayProperties is a pure function imported from utils
const fetchAllMarkets = useCallback(async () => {
    if (!predictionContractInstance) {
        console.log("PMLP_DEBUG: fetchAllMarkets - No contract instance.");
        setIsLoading(false); // Ensure loading is false if we bail early
        return;
    }
    console.log("PMLP_DEBUG: fetchAllMarkets - STARTING.");
    setIsLoading(true);
    setError(null);
    // setRawMarkets([]); // Let's build a new array and set at the end

    try {
        const nextMarketIdBN = await predictionContractInstance.nextMarketId();
        const nextMarketIdNum = nextMarketIdBN.toNumber();
        console.log(`PMLP_DEBUG: fetchAllMarkets - nextMarketIdNum from contract = ${nextMarketIdNum}`);

        if (nextMarketIdNum === 0) {
            console.log("PMLP_DEBUG: fetchAllMarkets - No markets to fetch (nextMarketId is 0).");
            setRawMarkets([]);
            setIsLoading(false);
            return;
        }

        const tempMarketsArray = [];
       // Inside fetchAllMarkets, inside the for loop

for (let idToFetch = 0; idToFetch < nextMarketIdNum; idToFetch++) {
    console.log(`PMLP_DEBUG: fetchAllMarkets - TOP OF LOOP for market ID ${idToFetch}. Next ID to fetch.`); // <-- ADD THIS
    try {
        // ... your existing try block ...
        const rawDetails = await predictionContractInstance.getMarketStaticDetails(idToFetch);
        console.log(`PMLP_DEBUG: fetchAllMarkets - AFTER getMarketStaticDetails for ID ${idToFetch}. Raw data:`, JSON.stringify(rawDetails)); // <-- ADD THIS

     // ... inside the loop ...
if (rawDetails && rawDetails.exists === true) {
    const processedMarket = processMarketDetails(rawDetails, idToFetch); // Call our detailed processor
    if (processedMarket) { // Check if processing was successful
        fetchedMarketsData.push(processedMarket);
        console.log(`PMLP_DEBUG: fetchAllMarkets - Successfully processed and pushed market ID ${idToFetch}`);
    } else {
        console.warn(`PMLP_DEBUG: fetchAllMarkets - processMarketDetails returned null for market ID ${idToFetch}, skipping.`);
    }
} else {
    console.warn(`PMLP_DEBUG: fetchAllMarkets - Market ID ${idToFetch} does not exist or details invalid. Raw:`, JSON.stringify(rawDetails));
}
// ...
    } catch (loopError) {
        console.error(`PMLP_DEBUG: fetchAllMarkets - Error in loop for market ID ${idToFetch}:`, loopError);
    }
    console.log(`PMLP_DEBUG: fetchAllMarkets - BOTTOM OF LOOP for market ID ${idToFetch}.`); // <-- ADD THIS
} // End of for loop
     
        
        console.log("PMLP_DEBUG: fetchAllMarkets - Loop finished. Total items in tempMarketsArray:", tempMarketsArray.length);
        console.log("PMLP_DEBUG: fetchAllMarkets - Setting rawMarkets with:", tempMarketsArray);
        setRawMarkets(tempMarketsArray);

    } catch (error) {
        console.error("PMLP_DEBUG: fetchAllMarkets - General error in try block:", error);
        setError(error.message || "Failed to load markets.");
        setRawMarkets([]);
    } finally {
        setIsLoading(false);
        console.log("PMLP_DEBUG: fetchAllMarkets - FINALLY block. Loading set to false.");
    }
}, [predictionContractInstance, processMarketDetails]); // processMarketDetails MUST be stable (useCallback)// Added connectionStatus.type as it was in original deps for the outer useEffect

    useEffect(() => {
        console.log("PMLP_DEBUG: useEffect - Firing. predictionContractInstance:", !!predictionContractInstance, "connectionStatus:", connectionStatus?.type);
        if (predictionContractInstance) {
            fetchAllMarkets();
        } else {
            // This block handles the state when contract is not yet available
            if (connectionStatus?.type === 'error' && connectionStatus.message) {
                setError(`WalletProvider Error: ${connectionStatus.message}`);
                setIsLoading(false);
            } else if (connectionStatus?.type === 'info' && connectionStatus.message === 'Initializing...') {
                setIsLoading(true); // Still initializing, show loading
            } else {
                // Could be disconnected or modal init failed, or other info states
                // Only set loading false if we're reasonably sure it's not just initial setup
                if(connectionStatus?.type !== 'info') setIsLoading(false);
                console.log("PMLP_DEBUG: useEffect - No contract instance, or in a non-loading info state.");
            }
        }
    }, [predictionContractInstance, fetchAllMarkets, connectionStatus?.type, walletAddress]); // Added walletAddress as a trigger to re-fetch if user connects/disconnects

    const openMarketsToDisplay = useMemo(() => {
        console.log("PMLP_DEBUG: useMemo openMarketsToDisplay - rawMarkets:", rawMarkets);
        if (!rawMarkets || rawMarkets.length === 0) return [];
        
        const filtered = rawMarkets.filter(market => {
            // Assuming MarketState.Open is 0 from your enum
            const isOpen = market.state === MarketState.Open; 
            console.log(`PMLP_DEBUG: useMemo - Filtering market ID ${market.id}, state: ${market.state}, IsOpen: ${isOpen}`);
            return isOpen;
        });
        console.log("PMLP_DEBUG: useMemo - Markets after filtering for Open state:", filtered);

        const mappedAndSorted = filtered.map(market => {
            try {
                return { ...market, ...getMarketDisplayProperties(market) };
            } catch (e) {
                console.error("PMLP_DEBUG: useMemo - Error in getMarketDisplayProperties for market:", market, e);
                return null; 
            }
        }).filter(Boolean).sort((a, b) => (a.expiryTimestamp || 0) - (b.expiryTimestamp || 0));
        
        console.log("PMLP_DEBUG: useMemo - Final openMarketsToDisplay:", mappedAndSorted);
        return mappedAndSorted;
    }, [rawMarkets]);

    // ... (Your JSX return remains the same) ...
    return (
        <div className="page-container prediction-markets-list-page">
            {/* ... Welcome Banner, Link to Resolved Markets, H2 title ... */}
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

            {/* ... How to Participate section ... */}
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