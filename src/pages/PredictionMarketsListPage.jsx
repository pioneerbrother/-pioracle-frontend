// pioracle/src/pages/PredictionMarketsListPage.jsx
import React, { useState, useEffect, useContext, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { WalletContext } from './WalletProvider';
import MarketCard from '../components/predictions/MarketCard';
import LoadingSpinner from '../components/common/LoadingSpinner';
import ErrorMessage from '../components/common/ErrorMessage';
import { 
    getMarketDisplayProperties, 
    MarketState as MarketStateEnumFromUtil 
} from '../utils/marketutils.js';
import { BigNumber } from 'ethers'; // Import BigNumber directly from ethers
import './PredictionMarketsListPage.css';

const MarketState = MarketStateEnumFromUtil;

function PredictionMarketsListPage() {
    const { contract: predictionContractInstance, connectionStatus, walletAddress } = useContext(WalletContext);
    const [rawMarkets, setRawMarkets] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    const processMarketDetails = useCallback((rawContractData, marketId) => {
        console.log(`PMLP_DEBUG_PROCESS: Processing market ID ${marketId}. Raw data:`, rawContractData);
        try {
            if (!rawContractData || rawContractData.exists !== true) {
                console.warn(`PMLP_DEBUG_PROCESS: Market ID ${marketId} 'exists' flag is not true or data missing. Skipping.`);
                return null; 
            }

            const intermediateMarket = {
                id: rawContractData.id.toString(),
                assetSymbol: rawContractData.assetSymbol,
                targetPrice: rawContractData.targetPrice,
                expiryTimestamp: BigNumber.isBigNumber(rawContractData.expiryTimestamp) 
                    ? rawContractData.expiryTimestamp.toNumber() 
                    : rawContractData.expiryTimestamp,
                resolutionTimestamp: BigNumber.isBigNumber(rawContractData.resolutionTimestamp) 
                    ? rawContractData.resolutionTimestamp.toNumber() 
                    : rawContractData.resolutionTimestamp,
                creationTimestamp: BigNumber.isBigNumber(rawContractData.creationTimestamp) 
                    ? rawContractData.creationTimestamp.toNumber() 
                    : rawContractData.creationTimestamp,
                isEventMarket: rawContractData.isEventMarket,
                state: BigNumber.isBigNumber(rawContractData.state) 
                    ? rawContractData.state.toNumber() 
                    : parseInt(rawContractData.state),
                exists: rawContractData.exists,
                totalStakedYes: rawContractData.totalStakedYes?.toString() || '0',
                totalStakedNo: rawContractData.totalStakedNo?.toString() || '0',
                actualOutcomeValue: rawContractData.actualOutcomeValue?.toString() || '0',
                priceFeedAddress: rawContractData.priceFeedAddress,
            };

            console.log(`PMLP_DEBUG_PROCESS: Intermediate market data for ID ${marketId}:`, intermediateMarket);
            
            const displayReadyMarket = getMarketDisplayProperties(intermediateMarket);
            console.log(`PMLP_DEBUG_PROCESS: Display-ready market data for ID ${marketId}:`, displayReadyMarket);
            
            return displayReadyMarket;

        } catch (e) {
            console.error(`PMLP_DEBUG_PROCESS: Error processing details for market ID ${marketId}:`, e, "Raw Data:", rawContractData);
            return null; 
        }
    }, []);

    const fetchAllMarkets = useCallback(async () => {
        if (!predictionContractInstance) {
            console.log("PMLP_DEBUG: fetchAllMarkets - No contract instance.");
            setIsLoading(false);
            return;
        }
        
        console.log("PMLP_DEBUG: fetchAllMarkets - STARTING.");
        setIsLoading(true);
        setError(null);

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
            
            for (let idToFetch = 0; idToFetch < nextMarketIdNum; idToFetch++) {
                console.log(`PMLP_DEBUG: fetchAllMarkets - TOP OF LOOP for market ID ${idToFetch}. Next ID to fetch.`);
                
                try {
                    const rawDetails = await predictionContractInstance.getMarketStaticDetails(idToFetch);
                    console.log(`PMLP_DEBUG: fetchAllMarkets - AFTER getMarketStaticDetails for ID ${idToFetch}. Raw data:`, rawDetails);

                    if (rawDetails && rawDetails.exists === true) {
                        const processedMarket = processMarketDetails(rawDetails, idToFetch);
                        if (processedMarket) {
                            tempMarketsArray.push(processedMarket);
                            console.log(`PMLP_DEBUG: fetchAllMarkets - Successfully processed and pushed market ID ${idToFetch}`);
                        } else {
                            console.warn(`PMLP_DEBUG: fetchAllMarkets - processMarketDetails returned null for market ID ${idToFetch}, skipping.`);
                        }
                    } else {
                        console.warn(`PMLP_DEBUG: fetchAllMarkets - Market ID ${idToFetch} does not exist or details invalid. Raw:`, rawDetails);
                    }
                } catch (loopError) {
                    console.error(`PMLP_DEBUG: fetchAllMarkets - Error in loop for market ID ${idToFetch}:`, loopError);
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
    }, [predictionContractInstance, processMarketDetails]);

    useEffect(() => {
        console.log("PMLP_DEBUG: useEffect - Firing. predictionContractInstance:", !!predictionContractInstance, "connectionStatus:", connectionStatus?.type);
        if (predictionContractInstance) {
            fetchAllMarkets();
        } else {
            if (connectionStatus?.type === 'error' && connectionStatus.message) {
                setError(`WalletProvider Error: ${connectionStatus.message}`);
                setIsLoading(false);
            } else if (connectionStatus?.type === 'info' && connectionStatus.message === 'Initializing...') {
                setIsLoading(true);
            } else {
                if(connectionStatus?.type !== 'info') setIsLoading(false);
                console.log("PMLP_DEBUG: useEffect - No contract instance, or in a non-loading info state.");
            }
        }
    }, [predictionContractInstance, fetchAllMarkets, connectionStatus?.type, walletAddress]);

 const openMarketsToDisplay = useMemo(() => {
    console.log("PMLP_DEBUG: useMemo openMarketsToDisplay - ENTERED. rawMarkets IS:", rawMarkets); // Log the whole array
    if (!rawMarkets || rawMarkets.length === 0) {
        console.log("PMLP_DEBUG: useMemo - rawMarkets empty or null, returning [].");
        return [];
    }
    
    const filtered = rawMarkets.filter((market, index) => { // Add index for logging
        console.log(`PMLP_DEBUG: useMemo - Filtering item index ${index}:`, market); // Log the individual market object
        console.log(`PMLP_DEBUG: useMemo - Market ID: ${market.id}, Market State: ${market.state}, MarketState.Open CONST: ${MarketState.Open}`);
        const isOpen = market.state === MarketState.Open; 
        console.log(`PMLP_DEBUG: useMemo - IsOpen for market ID ${market.id}: ${isOpen}`);
        return isOpen;
    });
    console.log("PMLP_DEBUG: useMemo - Markets after filtering for Open state:", filtered);

    // ... rest of your map and sort ...
    const mappedAndSorted = filtered.map(market => { /* ... */ }).filter(Boolean).sort((a, b) => (a.expiryTimestamp || 0) - (b.expiryTimestamp || 0));
    console.log("PMLP_DEBUG: useMemo - Final openMarketsToDisplay:", mappedAndSorted);
    return mappedAndSorted;
}, [rawMarkets]); // Dependency is correct

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