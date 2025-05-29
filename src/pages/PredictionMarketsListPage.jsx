// pioracle/src/pages/PredictionMarketsListPage.jsx
import React, { useState, useEffect, useContext, useMemo, useCallback } from 'react'; // Ensure ALL hooks used are imported
import { Link } from 'react-router-dom';
import { WalletContext } from '../context/WalletProvider';
import MarketCard from '../components/predictions/MarketCard';
import LoadingSpinner from '../components/common/LoadingSpinner';
import ErrorMessage from '../components/common/ErrorMessage';
import { 
    getMarketDisplayProperties, 
    MarketState as MarketStateEnumFromUtil 
} from '../utils/marketDisplayUtils.js'; // Corrected import path
import './PredictionMarketsListPage.css';

const MarketState = MarketStateEnumFromUtil; // Alias for clarity

function PredictionMarketsListPage() {
    const { contract: predictionContractInstance, provider, connectionStatus } = useContext(WalletContext);
    const [rawMarkets, setRawMarkets] = useState([]); // Stores raw data from contract
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchAllMarkets = useCallback(async () => {
        if (!predictionContractInstance) {
            if (connectionStatus?.type === 'error') {
                setError("Cannot load markets: WalletProvider error - " + connectionStatus.message);
                setIsLoading(false); // Set loading false if there's a definitive error
            } else if (connectionStatus?.type !== 'info' && connectionStatus?.type !== null && connectionStatus?.type !== 'success') {
                // If not connecting, not success, and no contract, then stop loading
                setIsLoading(false);
                // setError("Contract not available and wallet not actively connecting."); // Optional: more specific message
            }
            // If connectionStatus is 'info' (connecting) or 'success' (but contract still null briefly),
            // we might want to let isLoading be true or be handled by the outer useEffect.
            // For now, if no contract, we exit or set loading false.
            return; // Exit if no contract instance yet
        }

        setIsLoading(true);
        setError(null);
        setRawMarkets([]); // Clear previous markets

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
                marketPromises.push(predictionContractInstance.getMarketStaticDetails(i));
            }
            
            console.log(`PredictionMarketsListPage: Fetching details for ${marketPromises.length} potential markets...`);
            const marketsDetailsArray = await Promise.all(marketPromises);
            console.log("PredictionMarketsListPage: Received details for all markets.");

            const processedMarkets = marketsDetailsArray
                .map((detailsArray) => {
                    if (!detailsArray || typeof detailsArray[10] === 'undefined' || !detailsArray[10]) return null;
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
                        creationTimestamp: detailsArray.length > 12 ? Number(detailsArray[12]) : 0,
                        oracleDecimals: 8
                    };
                })
                .filter(market => market !== null && market.exists);

            setRawMarkets(processedMarkets);
        } catch (e) {
            console.error("Error fetching all markets:", e);
            setError("Failed to load markets. Please ensure your wallet is connected to the correct network (Polygon Mainnet) and the contract is accessible. If the issue persists, the network might be experiencing issues.");
        } finally { // Use finally to ensure setIsLoading(false) is always called
            setIsLoading(false);
        }
    }, [predictionContractInstance, connectionStatus?.type, setError, setIsLoading, setRawMarkets]); // Added setters to dependency array if they are stable (usually they are)

    useEffect(() => {
        if (predictionContractInstance) {
            fetchAllMarkets();
        } else {
             if (connectionStatus?.type === 'error' || (connectionStatus?.type !== 'info' && connectionStatus?.type !== 'success' && connectionStatus?.type !== null)) {
                setIsLoading(false); // Stop loading if no contract and not actively trying to connect/already connected
                if(connectionStatus?.type === 'error') setError(`WalletProvider Error: ${connectionStatus.message}`);
             } else {
                setIsLoading(true); // Assume it's loading or waiting for connection/contract
             }
        }
    }, [predictionContractInstance, fetchAllMarkets, connectionStatus?.type])


    const openMarketsToDisplay = useMemo(() => {
        if (!rawMarkets) return [];
        return rawMarkets
            .filter(market => market.state === MarketState.Open) // Filter for ONLY OPEN markets
            .map(market => ({ // Apply display properties AFTER filtering
                ...market,
                ...getMarketDisplayProperties(market) 
            }))
            .sort((a, b) => (a.expiryTimestamp || 0) - (b.expiryTimestamp || 0)); // Sort by soonest expiry first
    }, [rawMarkets]);

    return (
        <div className="page-container prediction-markets-list-page">
            <div className="welcome-banner" style={{ textAlign: 'center', margin: '20px 0' }}>
                <h2>Welcome to PiOracle!</h2>
                <p>Make your predictions on exciting cryptocurrency markets, including Bitcoin and Pi Coin! Where do you see their prices heading?</p>
                {/* 
                <Link to="/how-it-works" className="button quick-guide-button" style={{margin: '10px auto', display: 'inline-block'}}>
                    Quick Guide
                </Link> 
                */}
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