// pioracle/src/pages/PredictionMarketsListPage.jsx
import React, { useState, useEffect, useContext, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { WalletContext } from '../context/WalletProvider'; // Ensure this path is correct
import MarketCard from '../components/predictions/MarketCard'; // Ensure this path is correct
import LoadingSpinner from '../components/common/LoadingSpinner'; // Ensure this path is correct
import ErrorMessage from '../components/common/ErrorMessage';   // Ensure this path is correct
import { 
    getMarketDisplayProperties, 
    MarketState as MarketStateEnumFromUtil 
} from '../utils/marketutils.js'; // Using lowercase and explicit .js
import './PredictionMarketsListPage.css'; // Your styles for this page

const MarketState = MarketStateEnumFromUtil; // Alias for clarity

function PredictionMarketsListPage() {
    const { contract: predictionContractInstance, connectionStatus } = useContext(WalletContext);
    const [rawMarkets, setRawMarkets] = useState([]); // Stores raw data from contract before display processing
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchAllMarkets = useCallback(async () => {
        if (!predictionContractInstance) {
            if (connectionStatus?.type === 'error' && connectionStatus.message) {
                setError(`Cannot load markets: WalletProvider error - ${connectionStatus.message}`);
            }
            // If not actively trying to connect and no contract, stop loading.
            // Otherwise, let initial isLoading state persist or be handled by useEffect.
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
                    const expectedLength = 13; // Assumes getMarketStaticDetails returns 13 items including creationTimestamp
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
                        creationTimestamp: Number(detailsArray[12]),
                        oracleDecimals: 8 
                    };
                })
                .filter(market => market !== null);

            setRawMarkets(processedMarkets);

        } catch (e) {
            console.error("Error fetching all markets:", e);
            setError("Failed to load markets. Please ensure your wallet is connected to the correct network (Polygon Mainnet) and the contract is accessible. If the issue persists, the network might be experiencing issues or the ABI is incorrect.");
        } finally {
            setIsLoading(false);
        }
    }, [predictionContractInstance, connectionStatus?.type]); // Removed state setters from deps

    useEffect(() => {
        if (predictionContractInstance) {
            fetchAllMarkets();
        } else {
             if (connectionStatus?.type === 'error' || (connectionStatus?.type !== 'info' && connectionStatus?.type !== 'success' && connectionStatus?.type !== null)) {
                setIsLoading(false);
                if(connectionStatus?.type === 'error' && connectionStatus.message) {
                    setError(`WalletProvider Error: ${connectionStatus.message}`);
                } else if (!predictionContractInstance) {
                    // Don't set error if just waiting for wallet, but stop loading if it's clear nothing will load soon.
                    // setError("Connect wallet to load markets."); // Or just let it be blank
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
                        ...getMarketDisplayProperties(market) 
                    };
                } catch (e) {
                    console.error("Error processing market for display (getMarketDisplayProperties):", market, e);
                    return null; 
                }
            })
            .filter(market => market !== null)
            .sort((a, b) => (a.expiryTimestamp || 0) - (b.expiryTimestamp || 0)); // Soonest expiry first
    }, [rawMarkets]);

    return (
        <>
            {/* --- REACT 19 NATIVE HEAD TAGS --- */}
            <title>PiOracle | Open Prediction Markets | Polygon Blockchain</title>
            <meta name="description" content="Explore and predict on open cryptocurrency markets including Bitcoin, Pi Coin, and more on PiOracle.online. Decentralized predictions on the Polygon blockchain with low fees." />
            <meta name="keywords" content="prediction market, crypto, cryptocurrency, polygon, matic, bitcoin prediction, pi coin prediction, open markets, pioracle, decentralized prediction" />
            {/* Add Open Graph meta tags for social sharing if desired */}
            {/* 
            <meta property="og:title" content="PiOracle | Open Prediction Markets" />
            <meta property="og:description" content="Predict Bitcoin, Pi Coin, and more on a decentralized Polygon platform." />
            <meta property="og:image" content="https://pioracle.online/your-social-image.png" /> 
            <meta property="og:url" content="https://pioracle.online/predictions" />
            <meta property="og:type" content="website" />
            */}
            {/* --- END REACT 19 NATIVE HEAD TAGS --- */}

            <div className="page-container prediction-markets-list-page">
                <div className="welcome-banner" style={{ textAlign: 'center', margin: '20px 0', padding: '0 15px' }}>
                    <h2>Welcome to PiOracle!</h2>
                    <p>Make your predictions on exciting cryptocurrency markets, including Bitcoin and Pi Coin! Where do you see their prices heading?</p>
                    {/* You can add a "Quick Guide" button later if you create that page */}
                    {/* <Link to="/how-it-works" className="button quick-guide-button" style={{margin: '10px auto', display: 'inline-block'}}>
                        Quick Guide
                    </Link> */}
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
        </>
    );
}

export default PredictionMarketsListPage;