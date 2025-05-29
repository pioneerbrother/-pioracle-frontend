// pioracle/src/pages/PredictionMarketsListPage.jsx
import React, { useState, useEffect, useContext, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { WalletContext } from '../context/WalletProvider';
import MarketCard from '../components/predictions/MarketCard';
import LoadingSpinner from '../components/common/LoadingSpinner';
import ErrorMessage from '../components/common/ErrorMessage';
import { 
    getMarketDisplayProperties, 
    MarketState as MarketStateEnumFromUtil // Alias to avoid potential naming conflicts
} from '../utils/marketutils.js'; // CORRECTED: Using 'marketutils.js' (all lowercase name part)
import './PredictionMarketsListPage.css';

// Use the aliased enum for clarity within this component
const MarketState = MarketStateEnumFromUtil;

function PredictionMarketsListPage() {
    const { contract: predictionContractInstance, connectionStatus } = useContext(WalletContext);
    const [rawMarkets, setRawMarkets] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchAllMarkets = useCallback(async () => {
        if (!predictionContractInstance) {
            if (connectionStatus?.type === 'error') {
                setError(`Cannot load markets: WalletProvider error - ${connectionStatus.message}`);
            }
            // If not trying to connect and no contract, stop loading. Otherwise, let initial isLoading state persist.
            if (connectionStatus?.type !== 'info' && connectionStatus?.type !== 'success' && connectionStatus?.type !== null) {
                setIsLoading(false);
            }
            return;
        }

        setIsLoading(true);
        setError(null);
        setRawMarkets([]); 

        try {
            console.log("PredictionMarketsListPage: Fetching nextMarketId...");
            const nextIdBigNumber = await predictionContractInstance.nextMarketId();
            const nextId = Number(nextIdBigNumber);
            console.log("PredictionMarketsListPage: nextMarketId =", nextId);

            if (nextId === 0) {
                setRawMarkets([]);
                setIsLoading(false);
                return;
            }

            const marketPromises = [];
            for (let i = 0; i < nextId; i++) {
                // Ensure getMarketStaticDetails exists on the contract instance
                if (typeof predictionContractInstance.getMarketStaticDetails !== 'function') {
                    throw new Error("getMarketStaticDetails function not found on contract instance. ABI might be incorrect or contract not fully loaded.");
                }
                marketPromises.push(predictionContractInstance.getMarketStaticDetails(i));
            }
            
            console.log(`PredictionMarketsListPage: Fetching details for ${marketPromises.length} potential markets...`);
            const marketsDetailsArray = await Promise.all(marketPromises);
            console.log("PredictionMarketsListPage: Received details for all markets.");

            const processedMarkets = marketsDetailsArray
                .map((detailsArray) => {
                    // Assuming detailsArray[10] is the 'exists' flag and detailsArray has at least 12 elements for basic data
                    // For contracts with creationTimestamp, it would be 13 elements.
                    const expectedLength = 13; // If creationTimestamp is included in getMarketStaticDetails
                    // const expectedLength = 12; // If creationTimestamp is NOT included

                    if (!detailsArray || detailsArray.length < expectedLength || typeof detailsArray[10] === 'undefined' || !detailsArray[10]) {
                        console.warn("Skipping market due to incomplete data or 'exists' is false:", detailsArray);
                        return null; 
                    }
                    return {
                        id: detailsArray[0].toString(),
                        assetSymbol: detailsArray[1],
                        priceFeedAddress: detailsArray[2],
                        targetPrice: detailsArray[3].toString(),
                        expiryTimestamp: Number(detailsArray[4]),
                        resolutionTimestamp: Number(detailsArray[5]),
                        totalStakedYesNet: detailsArray[6].toString(),
                        totalStakedNoNet: detailsArray[7].toString(),
                        state: Number(detailsArray[8]),
                        actualOutcomeValue: detailsArray[9].toString(),
                        exists: detailsArray[10],
                        isEventMarket: detailsArray[11],
                        creationTimestamp: Number(detailsArray[12]), // Assumes creationTimestamp is the 13th element (index 12)
                        oracleDecimals: 8 // Default, can be refined
                    };
                })
                .filter(market => market !== null); // Remove nulls from non-existent/invalid markets

            setRawMarkets(processedMarkets);

        } catch (e) {
            console.error("Error fetching all markets:", e);
            setError("Failed to load markets. Please ensure your wallet is connected to the correct network (Polygon Mainnet) and the contract is accessible. If the issue persists, the network might be experiencing issues or the ABI is incorrect.");
        } finally {
            setIsLoading(false);
        }
    }, [predictionContractInstance, connectionStatus?.type]); // Removed setters as they are stable

    useEffect(() => {
        if (predictionContractInstance) {
            fetchAllMarkets();
        } else {
             if (connectionStatus?.type === 'error' || (connectionStatus?.type !== 'info' && connectionStatus?.type !== 'success' && connectionStatus?.type !== null)) {
                setIsLoading(false);
                if(connectionStatus?.type === 'error' && connectionStatus.message) {
                    setError(`WalletProvider Error: ${connectionStatus.message}`);
                } else if (!predictionContractInstance) {
                    setError("Waiting for wallet connection or contract initialization...");
                }
             } else {
                setIsLoading(true); 
             }
        }
    }, [predictionContractInstance, fetchAllMarkets, connectionStatus?.type]);


    const openMarketsToDisplay = useMemo(() => {
        if (!rawMarkets || rawMarkets.length === 0) return [];
        return rawMarkets
            .filter(market => market.state === MarketState.Open)
            .map(market => {
                try {
                    return {
                        ...market,
                        ...getMarketDisplayProperties(market) // Ensure this function handles potentially undefined fields gracefully
                    };
                } catch (e) {
                    console.error("Error processing market for display (getMarketDisplayProperties):", market, e);
                    return null; // Skip markets that cause errors during display processing
                }
            })
            .filter(market => market !== null) // Remove any markets that failed display processing
            .sort((a, b) => (a.expiryTimestamp || 0) - (b.expiryTimestamp || 0));
    }, [rawMarkets]);

    return (
        <div className="page-container prediction-markets-list-page">
            <div className="welcome-banner" style={{ textAlign: 'center', margin: '20px 0' }}>
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
                <p style={{ textAlign: 'center' }}>No open markets available right now. Check the "Recently Resolved" section or come back soon!</p>
            )}

            <div className="market-list">
                {openMarketsToDisplay.map(market => (
                    <MarketCard key={market.id} market={market} />
                ))}
            </div>

            <section className="how-to-participate" style={{marginTop: '40px', padding: '0 20px'}}>
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