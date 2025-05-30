// pioracle/src/pages/PredictionMarketsListPage.jsx
import React, { useState, useEffect, useContext, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { WalletContext } from '../context/WalletProvider';
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
        console.log("PMLP fetchAllMarkets: Entered. Contract Instance:", !!predictionContractInstance);
        if (!predictionContractInstance) {
            console.log("PMLP fetchAllMarkets: No contract instance, checking connection status.");
            if (connectionStatus?.type === 'error' && connectionStatus.message) {
                setError(`Cannot load markets: WalletProvider error - ${connectionStatus.message}`);
                console.error("PMLP fetchAllMarkets: WalletProvider error", connectionStatus.message);
            }
            if (connectionStatus?.type !== 'info' && connectionStatus?.type !== 'success' && connectionStatus?.type !== null) {
                setIsLoading(false);
            }
            return;
        }

        setIsLoading(true);
        setError(null);
        setRawMarkets([]);
        console.log("PMLP fetchAllMarkets: Set loading true, cleared errors/markets.");

        try {
            console.log("PMLP fetchAllMarkets: Calling nextMarketId()...");
            const nextIdBigNumber = await predictionContractInstance.nextMarketId();
            const nextId = Number(nextIdBigNumber);
            console.log("PMLP fetchAllMarkets: nextMarketId raw:", nextIdBigNumber, "Parsed:", nextId);

            if (nextId === 0) {
                console.log("PMLP fetchAllMarkets: nextMarketId is 0. No markets to fetch.");
                setRawMarkets([]);
                setIsLoading(false);
                return;
            }

            const marketPromises = [];
            for (let i = 0; i < nextId; i++) {
                console.log(`PMLP fetchAllMarkets: Pushing promise for getMarketStaticDetails(${i})`);
                marketPromises.push(predictionContractInstance.getMarketStaticDetails(i));
            }
            
            const marketsDetailsArray = await Promise.all(marketPromises);
            console.log("PMLP fetchAllMarkets: marketsDetailsArray RAW from contract:", JSON.stringify(marketsDetailsArray));

            const processedMarkets = marketsDetailsArray.map((detailsArray, index) => {
                console.log(`PMLP fetchAllMarkets: Processing market index ${index}, raw details:`, JSON.stringify(detailsArray));
                const expectedLength = 13; 
                if (!detailsArray || detailsArray.length < expectedLength || typeof detailsArray[10] === 'undefined' || !detailsArray[10]) {
                    console.warn(`PMLP fetchAllMarkets: Skipping market index ${index} - Invalid structure or exists=false. Array length:`, detailsArray?.length, "Content:", detailsArray);
                    return null; 
                }
                const marketData = {
                    id: detailsArray[0].toString(), assetSymbol: detailsArray[1], priceFeedAddress: detailsArray[2],
                    targetPrice: detailsArray[3].toString(), expiryTimestamp: Number(detailsArray[4]),
                    resolutionTimestamp: Number(detailsArray[5]), totalStakedYesNet: detailsArray[6].toString(),
                    totalStakedNoNet: detailsArray[7].toString(), state: Number(detailsArray[8]), // <<< Check this 'state' value
                    actualOutcomeValue: detailsArray[9].toString(), exists: detailsArray[10],
                    isEventMarket: detailsArray[11], creationTimestamp: Number(detailsArray[12]),
                    oracleDecimals: 8 
                };
                console.log(`PMLP fetchAllMarkets: Processed market index ${index}:`, marketData);
                return marketData;
            }).filter(market => market !== null);
            
            console.log("PMLP fetchAllMarkets: Final processedMarkets (before setRawMarkets):", processedMarkets);
            setRawMarkets(processedMarkets);

        } catch (e) {
            console.error("PMLP fetchAllMarkets: Error during fetch:", e);
            setError("Failed to load markets. Ensure wallet is connected to Polygon Mainnet and contract/ABI are correct.");
        } finally {
            setIsLoading(false);
            console.log("PMLP fetchAllMarkets: Set loading false in finally block.");
        }
    }, [predictionContractInstance, connectionStatus?.type]);

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