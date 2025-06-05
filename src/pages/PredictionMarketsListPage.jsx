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
    const processMarketDetails = useCallback((rawMarketData, id) => {
        console.log(`PMLP_DEBUG: processMarketDetails for ID ${id}, Data:`, rawMarketData);
        if (!rawMarketData || typeof rawMarketData.question === 'undefined') { // Basic check for valid data
            console.warn(`PMLP_DEBUG: Invalid or incomplete rawMarketData for ID ${id}`);
            return null; // Or return a market object with an error flag
        }
        try {
            // Example processing, adjust to your Market struct from Solidity
            return {
                id: id.toString(),
                assetSymbol: rawMarketData.assetSymbol || "N/A",
                question: rawMarketData.question || "No question",
                // Assuming your struct returns these directly or you have getters
                // Ensure BigNumbers are converted to JS numbers or strings where appropriate for display
                targetPrice: rawMarketData.targetPrice ? ethers.utils.formatUnits(rawMarketData.targetPrice, 8) : "N/A", // Example for 8 decimals
                expiryTimestamp: rawMarketData.expiryTimestamp ? rawMarketData.expiryTimestamp.toNumber() : 0,
                bettingEndTime: rawMarketData.bettingEndTime ? rawMarketData.bettingEndTime.toNumber() : 0,
                isEventMarket: rawMarketData.isEventMarket || false,
                state: typeof rawMarketData.state !== 'undefined' ? rawMarketData.state : -1, // Default to an invalid state if undefined
                creator: rawMarketData.marketCreator || ethers.constants.AddressZero,
                feePercentage: rawMarketData.creatorFeeBasisPoints ? rawMarketData.creatorFeeBasisPoints / 100 : 0, // Convert BP to percent
                // Add any other fields your MarketCard needs
            };
        } catch (e) {
            console.error(`PMLP_DEBUG: Error processing market ID ${id}:`, e, "Raw Data:", rawMarketData);
            return null;
        }
    }, []);


    const fetchAllMarkets = useCallback(async () => {
        if (!predictionContractInstance) {
            console.log("PMLP_DEBUG: fetchAllMarkets - No contract instance yet.");
             if (connectionStatus?.type === 'error' && connectionStatus.message) {
                setError(`Cannot load markets: WalletProvider error - ${connectionStatus.message}`);
                setIsLoading(false);
            }
            return;
        }
        console.log("PMLP_DEBUG: fetchAllMarkets - STARTING. Setting loading true, clearing error.");
        setIsLoading(true);
        setError(null);
        // setRawMarkets([]); // Clear only if absolutely necessary, or build into new array first

        try {
            console.log("PMLP_DEBUG: fetchAllMarkets - Calling nextMarketId()...");
            const nextMarketIdBN = await predictionContractInstance.nextMarketId();
            const nextMarketIdNum = nextMarketIdBN.toNumber();
            setNextMarketIdDebug(nextMarketIdNum.toString());
            console.log("PMLP_DEBUG: fetchAllMarkets - Actual nextMarketId from contract =", nextMarketIdNum);

            const fetchedMarketsData = [];
            if (nextMarketIdNum > 0) { // Only loop if there are markets
                for (let idToFetch = 0; idToFetch < nextMarketIdNum; idToFetch++) {
                    console.log(`PMLP_DEBUG: fetchAllMarkets - Loop: Attempting to fetch details for market ID ${idToFetch}`);
                    try {
                        // Ensure 'getMarketStaticDetails' is the correct function name and returns all necessary fields
                        // including 'state', 'question', 'assetSymbol', 'expiryTimestamp', etc.
                        const rawDetails = await predictionContractInstance.getMarketStaticDetails(idToFetch);
                        console.log(`PMLP_DEBUG: fetchAllMarkets - Raw details for market ID ${idToFetch}:`, rawDetails);

                        if (rawDetails && typeof rawDetails.question !== 'undefined' && rawDetails.exists) { // Check if market 'exists'
                            const processedDetail = processMarketDetails(rawDetails, idToFetch);
                            if (processedDetail) {
                                fetchedMarketsData.push(processedDetail);
                            } else {
                                console.warn(`PMLP_DEBUG: fetchAllMarkets - processMarketDetails returned null for market ID ${idToFetch}`);
                            }
                        } else {
                            console.warn(`PMLP_DEBUG: fetchAllMarkets - Invalid or non-existent market details for ID ${idToFetch}. Raw:`, rawDetails);
                        }
                    } catch (loopError) {
                        console.error(`PMLP_DEBUG: fetchAllMarkets - Error fetching/processing market ID ${idToFetch}:`, loopError);
                    }
                }
            }
            
            console.log("PMLP_DEBUG: fetchAllMarkets - All fetched & processed markets (before setRawMarkets):", fetchedMarketsData);
            setRawMarkets(fetchedMarketsData);

        } catch (error) {
            console.error("PMLP_DEBUG: fetchAllMarkets - General error fetching markets:", error);
            setError(error.message || "Failed to load markets.");
            setRawMarkets([]); 
        } finally {
            console.log("PMLP_DEBUG: fetchAllMarkets - FINISHED. Set loading false.");
            setIsLoading(false);
        }
    }, [predictionContractInstance, processMarketDetails, connectionStatus?.type]); // Added connectionStatus.type as it was in original deps for the outer useEffect

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