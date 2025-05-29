// pioracle/src/pages/PredictionMarketsListPage.jsx
import React, { useState, useEffect, useContext, useMemo } from 'react';
import { Link } from 'react-router-dom'; // Ensure Link is imported
import { WalletContext } from '../context/WalletProvider';
import MarketCard from '../components/predictions/MarketCard';
import LoadingSpinner from '../components/common/LoadingSpinner';
import ErrorMessage from '../components/common/ErrorMessage';
import { 
    getMarketDisplayProperties, 
    MarketState as MarketStateEnumFromUtil
} from '../utils/MarketDisplayUtils.js'; // Explicitly add .js
import './PredictionMarketsListPage.css';

const MarketState = MarketStateEnumFromUtil;

function PredictionMarketsListPage() {
    const { contract: predictionContractInstance, provider, connectionStatus } = useContext(WalletContext);
    const [rawMarkets, setRawMarkets] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchAllMarkets = useCallback(async () => { // Wrapped in useCallback
        if (!predictionContractInstance) {
            if (connectionStatus?.type === 'error') {
                setError("Cannot load markets: WalletProvider error - " + connectionStatus.message);
            }
            setIsLoading(false);
            return;
        }
        setIsLoading(true);
        setError(null);
        try {
            const nextIdBigNumber = await predictionContractInstance.nextMarketId();
            const nextId = Number(nextIdBigNumber);
            if (nextId === 0) {
                setRawMarkets([]);
                setIsLoading(false);
                return;
            }

            const marketPromises = [];
            for (let i = 0; i < nextId; i++) {
                marketPromises.push(predictionContractInstance.getMarketStaticDetails(i));
            }
            const marketsDetailsArray = await Promise.all(marketPromises);

            const processedMarkets = marketsDetailsArray
                .map((detailsArray) => { // Removed index as it's not used here
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
            setError("Failed to load markets. The connected network might be experiencing issues or the contract is not found at the configured address.");
        }
        setIsLoading(false);
    }, [predictionContractInstance, connectionStatus]); // Dependencies for useCallback

    useEffect(() => {
        if (predictionContractInstance) {
            fetchAllMarkets();
        } else if (connectionStatus?.type !== 'info' && connectionStatus?.type !== null) {
            setIsLoading(false);
        }
    }, [predictionContractInstance, fetchAllMarkets, connectionStatus]);


    const openMarketsToDisplay = useMemo(() => {
        if (!rawMarkets) return [];
        return rawMarkets
            .filter(market => market.state === MarketState.Open) // <<< --- SIMPLIFIED FILTER: ONLY OPEN MARKETS ---
            .map(market => ({
                ...market,
                ...getMarketDisplayProperties(market)
            }))
            .sort((a, b) => (a.expiryTimestamp || 0) - (b.expiryTimestamp || 0)); // Sort by soonest expiry first
    }, [rawMarkets]);

    return (
        <div className="page-container prediction-markets-list-page">
            <div className="welcome-banner">
                <h2>Welcome to PiOracle!</h2>
                <p>Make your predictions on exciting cryptocurrency markets, including Bitcoin and the highly anticipated Pi Coin! Where do you see their prices heading?</p>
                {/* Assuming you might create a /how-it-works page later */}
                {/* <Link to="/how-it-works" className="button quick-guide-button" style={{margin: '10px auto', display: 'block', width: 'fit-content'}}>
                    Quick Guide
                </Link> */}
            </div>

            {/* --- PLACEMENT OF THE LINK --- */}
            <div className="market-view-controls" style={{ marginBottom: '20px', marginTop: '20px', textAlign: 'center' }}>
                <Link to="/resolved-markets" className="button secondary">View Recently Resolved Markets</Link>
            </div>
            {/* --- END PLACEMENT --- */}


            <h2>Open Prediction Markets</h2> {/* Changed title to reflect content */}

            {isLoading && openMarketsToDisplay.length === 0 && <LoadingSpinner message="Loading open markets..." />}
            {error && <ErrorMessage title="Error Loading Markets" message={error} onRetry={fetchAllMarkets} />}
            
            {!isLoading && openMarketsToDisplay.length === 0 && !error && (
                <p>No open markets available right now. Check the "Recently Resolved" section or come back soon!</p>
            )}

            <div className="market-list">
                {openMarketsToDisplay.map(market => (
                    <MarketCard key={market.id} market={market} />
                ))}
            </div>

            <section className="how-to-participate" style={{marginTop: '40px'}}>
                {/* ... (your How to Participate section) ... */}
                 <h2>How to Participate (on Polygon Mainnet)</h2>
                <ol>
                    <li><strong>Get a Wallet (MetaMask Recommended):</strong> Ensure you have a browser extension wallet like MetaMask installed and configured for the Polygon Mainnet.</li>
                    <li><strong>Get MATIC:</strong> You'll need MATIC tokens in your wallet to pay for transaction gas fees and to place your predictions. You can acquire MATIC from most major exchanges.</li>
                    <li><strong>Connect Your Wallet:</strong> Click the "Connect Wallet" button on PiOracle.</li>
                    <li><strong>Browse Markets:</strong> Explore the available prediction markets.</li>
                    <li><strong>Make Your Prediction:</strong> Choose a market, select your predicted outcome (YES or NO), and enter the amount of MATIC you wish to stake.</li>
                    <li><strong>Confirm Transaction:</strong> Approve the transaction in your MetaMask wallet.</li>
                    <li><strong>Check Back & Claim:</strong> After a market resolves, if your prediction was correct, return to the market page to claim your winnings!</li>
                </ol>
            </section>
        </div>
    );
}

export default PredictionMarketsListPage;