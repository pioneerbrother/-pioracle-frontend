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
} from '../utils/marketutils.js'; // Ensure correct path and lowercase 'marketutils.js'
import './PredictionMarketsListPage.css';

const MarketState = MarketStateEnumFromUtil;

function PredictionMarketsListPage() {
    const { contract: predictionContractInstance, connectionStatus } = useContext(WalletContext);
    const [rawMarkets, setRawMarkets] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    console.log("PMLP RENDER: predictionContractInstance:", predictionContractInstance, "ConnectionStatus:", connectionStatus);

      const fetchAllMarkets = useCallback(async () => {
        if (!predictionContractInstance) {
            // ... (existing initial checks and error setting) ...
            if (connectionStatus?.type === 'error' && connectionStatus.message) {
                setError(`Cannot load markets: WalletProvider error - ${connectionStatus.message}`);
            }
            if (connectionStatus?.type !== 'info' && connectionStatus?.type !== 'success' && connectionStatus?.type !== null) {
                setIsLoading(false);
            }
            return;
        }
         console.log("PMLP fetchAllMarkets: Set loading true, cleared errors/markets.");
        setIsLoading(true);
        setError(null);
        setRawMarkets([]); 
        

      try {
        console.log("PMLP fetchAllMarkets: Calling nextMarketId() for debug check...");
        const _nextMarketId = await predictionContractInstance.nextMarketId();
        setNextMarketIdDebug(_nextMarketId.toString()); // Update debug state
        console.log("PMLP fetchAllMarkets: Actual nextMarketId from contract =", _nextMarketId.toString());

           const marketsDetailsArray = [];
        // Loop from market ID 0 up to _nextMarketId - 1
        for (let i = 0; i < _nextMarketId.toNumber(); i++) { // Use .toNumber() for BigNumber iteration limit
            console.log(`PMLP fetchAllMarkets: DEBUG - Attempting to fetch details for market ID ${i}`);
            try {
                const marketDetails = await predictionContractInstance.getMarketStaticDetails(i);
                console.log(`PMLP fetchAllMarkets: DEBUG - Raw details for market ID ${i}:`, marketDetails);
                
                // Additional check: Does marketDetails indicate the market exists?
                // Your struct has `bool exists;`. If your `getMarketStaticDetails` returns this, check it.
                // For now, let's assume all IDs up to nextMarketId - 1 are valid markets if getMarketStaticDetails doesn't revert.
                
                marketsDetailsArray.push(marketDetails);

            } catch (loopError) {
                console.error(`PMLP fetchAllMarkets: Error fetching details for market ID ${i}:`, loopError);
                // Optionally, you could push a placeholder or skip this market
                // For now, let's let it continue to fetch others.
            }
        }
        console.log("PMLP fetchAllMarkets: marketsDetailsArray (after loop, before processing):", marketsDetailsArray);

        // Process the raw details
        const processedMarkets = marketsDetailsArray.map((details, index) => processMarketDetails(details, index)).filter(Boolean);
        console.log("PMLP fetchAllMarkets: Final processedMarkets (before setRawMarkets):", processedMarkets);
        
        setRawMarkets(processedMarkets);

    } catch (error) {
        console.error("PMLP fetchAllMarkets: Error fetching markets:", error);
        setFetchError(error.message || "Failed to load markets.");
    } finally {
        console.log("PMLP fetchAllMarkets: Set loading false in finally block.");
        setIsLoading(false);
    }
}, [predictionContractInstance, processMarketDetails]); // processMarketDetails should be a useCallback too
         

    useEffect(() => {
        console.log("PMLP useEffect: Firing. predictionContractInstance:", !!predictionContractInstance, "connectionStatus:", connectionStatus?.type);
        if (predictionContractInstance) {
            fetchAllMarkets();
        } else {
             if (connectionStatus?.type === 'error' || (connectionStatus?.type !== 'info' && connectionStatus?.type !== 'success' && connectionStatus?.type !== null)) {
                setIsLoading(false);
                if(connectionStatus?.type === 'error' && connectionStatus.message) {
                    setError(`WalletProvider Error: ${connectionStatus.message}`);
                } else if (!predictionContractInstance && (connectionStatus?.type !== 'info' && connectionStatus?.type !== null)) {
                     // setError("Connect wallet or wait for contract initialization."); // Can be noisy
                     console.log("PMLP useEffect: No contract instance, not an error/disconnected state yet.");
                }
             } else {
                setIsLoading(true); 
                console.log("PMLP useEffect: No contract instance, setting isLoading true.");
             }
        }
    }, [predictionContractInstance, fetchAllMarkets, connectionStatus?.type]);

    const openMarketsToDisplay = useMemo(() => {
        console.log("PMLP useMemo openMarketsToDisplay: rawMarkets:", rawMarkets);
        if (!rawMarkets || rawMarkets.length === 0) return [];
        
        const filtered = rawMarkets.filter(market => {
            console.log(`PMLP useMemo: Filtering market ID ${market.id}, state: ${market.state}, MarketState.Open: ${MarketState.Open}`);
            return market.state === MarketState.Open; // MarketState.Open should be 0
        });
        console.log("PMLP useMemo: Markets after filtering for Open state:", filtered);

        const mapped = filtered.map(market => {
            try {
                return { ...market, ...getMarketDisplayProperties(market) };
            } catch (e) {
                console.error("PMLP useMemo: Error in getMarketDisplayProperties for market:", market, e);
                return null; 
            }
        });
        const final = mapped.filter(market => market !== null)
                            .sort((a, b) => (a.expiryTimestamp || 0) - (b.expiryTimestamp || 0));
        console.log("PMLP useMemo: Final openMarketsToDisplay:", final);
        return final;
    }, [rawMarkets]);

    // ... (Rest of the component: welcome banner, link to resolved, title, loading/error/empty states, market list mapping, how to participate) ...
    // This return part should be the same as the last full version I provided.
    return (
        <div className="page-container prediction-markets-list-page">
            {/* ... (Welcome Banner, Link to Resolved Markets, H2 title "Open Prediction Markets") ... */}
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
    );
}

export default PredictionMarketsListPage;