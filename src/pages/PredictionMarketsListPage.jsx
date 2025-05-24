// pioracle/src/pages/PredictionMarketsListPage.jsx
import React, { useEffect, useState, useContext, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom'; // For linking to detail pages via MarketCard
import { WalletContext } from '../context/WalletProvider';
import MarketCard from '../components/predictions/MarketCard';
import LoadingSpinner from '../components/common/LoadingSpinner';
import ErrorMessage from '../components/common/ErrorMessage';
import './PredictionMarketsListPage.css';

// Placeholder helper functions (ideally move to a utils/formatters.js file and import)
// Ensure these are consistent with what MarketCard and other components expect.
const getStatusString = (statusEnum) => {
    // From your MarketDetailPage
    const MarketState = { Open: 0, Resolvable: 1, Resolved_YesWon: 2, Resolved_NoWon: 3, Resolved_Push: 4 };
    if (statusEnum === undefined || statusEnum === null) return "Loading...";
    switch (Number(statusEnum)) {
        case MarketState.Open: return "Open";
        case MarketState.Resolvable: return "Resolving";
        case MarketState.Resolved_YesWon: return "Resolved: YES Won";
        case MarketState.Resolved_NoWon: return "Resolved: NO Won";
        case MarketState.Resolved_Push: return "Push";
        default: return `Unknown (${statusEnum})`;
    }
};

const formatExpiry = (timestamp) => {
    if (!timestamp || timestamp === 0) return "N/A";
    return new Date(timestamp * 1000).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
};
// End Placeholder helper functions

function PredictionMarketsListPage() {
    const walletContextValue = useContext(WalletContext);
    const contractInstanceFromContext = walletContextValue?.contract;
    const walletConnectionStatusType = walletContextValue?.connectionStatus?.type;
    const connectionStatusMessage = walletContextValue?.connectionStatus?.message;

    const [markets, setMarkets] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    
    const prevContractInstanceRef = useRef(null);

    console.log(
        "PredictionMarketsListPage RENDER. isLoading:", isLoading, "Error:", error,
        "Contract from context:", !!contractInstanceFromContext, 
        "Wallet status type:", walletConnectionStatusType
    );

    const fetchMarketsInternal = useCallback(async (contractToUse) => {
        if (!contractToUse) {
            console.log("PredictionMarketsListPage: fetchMarketsInternal - Aborted, no contract instance.");
            setIsLoading(false); 
            setError("Cannot fetch markets: Contract not available at the moment.");
            return;
        }
        console.log("PredictionMarketsListPage: fetchMarketsInternal CALLED for contract:", contractToUse.address);
        setIsLoading(true);
        setError(null);
        const fetchedMarketsLocal = [];
        try {
            const nextIdBigNumber = await contractToUse.nextMarketId();
            const totalMarkets = nextIdBigNumber.toNumber();
            console.log(`PredictionMarketsListPage: Total markets to fetch: ${totalMarkets}`);

            if (totalMarkets > 0) {
                 for (let i = 0; i < totalMarkets; i++) {
                    const details = await contractToUse.getMarketStaticDetails(i); // Expects 12 fields now
                    if (details && (details.exists !== undefined ? details.exists : details[10])) {
                        const assetSymbolStr = details.assetSymbol !== undefined ? details.assetSymbol : details[1];
                        const targetPriceBN = details.targetPrice !== undefined ? details.targetPrice : details[3];
                        const isEventMarketBool = details.isEventMarket !== undefined ? details.isEventMarket : detailsArray[11];

                        let description = `Market #${(details.id !== undefined ? details.id : details[0]).toString()}: ${assetSymbolStr}`;
                        if (isEventMarketBool) {
                            description = `${assetSymbolStr.replace(/_/g, " ")}: Will the outcome be YES?`;
                        } else if (assetSymbolStr.startsWith("BTC/USD_PRICE_ABOVE")) {
                            const price = parseInt(targetPriceBN.toString()) / 100;
                            const datePart = assetSymbolStr.split("_").pop();
                            description = `Will ${assetSymbolStr.split("_PRICE_ABOVE_")[0].replace('BTC/USD', 'BTC/USD')} be ≥ $${price.toFixed(2)} on ${datePart}?`;
                        }
                        fetchedMarketsLocal.push({ 
                            id: (details.id !== undefined ? details.id : details[0]).toString(), 
                            description: description,
                            assetSymbol: assetSymbolStr,
                            status: Number(details.state !== undefined ? details.state : details[8]),
                            expiryTimestamp: (details.expiryTimestamp !== undefined ? details.expiryTimestamp : details[4]).toNumber(),
                            exists: (details.exists !== undefined ? details.exists : details[10]),
                            // Add any other fields MarketCard might need
                        });
                    }
                 }
            }
            setMarkets(fetchedMarketsLocal);
        } catch (e) {
            console.error("PredictionMarketsListPage: Error in fetchMarketsInternal", e);
            setError(e.message || "Failed to fetch markets.");
            setMarkets([]);
        }
        setIsLoading(false);
    }, []); // Empty dependency array makes this function reference stable

    useEffect(() => {
        const currentContractInstance = contractInstanceFromContext;
        const prevContractInstance = prevContractInstanceRef.current;

        console.log(
            "PredictionMarketsListPage: useEffect FIRING.",
            "Current Contract Instance:", !!currentContractInstance, "(Addr:", currentContractInstance?.address + ")",
            "Previous Contract Instance:", !!prevContractInstance, "(Addr:", prevContractInstance?.address + ")",
            "Wallet connection type:", walletConnectionStatusType
        );

        if (walletConnectionStatusType === 'error') {
            console.log("PredictionMarketsListPage: WalletProvider error detected.");
            setError(connectionStatusMessage || "Unknown WalletProvider error");
            setIsLoading(false);
            setMarkets([]);
        } else if (currentContractInstance) {
            if (currentContractInstance !== prevContractInstance || (!isLoading && !error && markets.length === 0 && currentContractInstance)) {
                 console.log("PredictionMarketsListPage: Contract available and changed OR initial fetch needed. Calling fetchMarketsInternal.");
                 fetchMarketsInternal(currentContractInstance);
            } else {
                 console.log("PredictionMarketsListPage: Contract instance present but no fetch triggered (same instance or already loading/error).");
            }
        } else { 
            console.log("PredictionMarketsListPage: No contract instance from WalletProvider yet. Setting loading true.");
            setIsLoading(true); 
            setError(null);     
        }
        
        prevContractInstanceRef.current = currentContractInstance;

    }, [contractInstanceFromContext, walletConnectionStatusType, fetchMarketsInternal, connectionStatusMessage, isLoading, error, markets.length]); // Added more deps for refined condition

    // --- Render Logic ---
    if (error && markets.length === 0) { // Show full page error only if no markets can be shown
         return (
            <div className="page-container prediction-markets-list-page">
                 <header className="list-page-header"><h1>PiOracle - Predict the Future!</h1></header>
                 <ErrorMessage 
                    title="Error Loading Markets" 
                    message={error} 
                    onRetry={() => { if (contractInstanceFromContext) fetchMarketsInternal(contractInstanceFromContext); }}
                    retryDisabled={!contractInstanceFromContext || isLoading} 
                />
                {/* Optionally, include the HowToGuide here as well or link to it */}
            </div>
         );
    }
    
    if (isLoading && markets.length === 0 && !error) { 
         return (
            <div className="page-container prediction-markets-list-page">
                 <header className="list-page-header"><h1>PiOracle - Predict the Future!</h1></header>
                <LoadingSpinner message="Loading Prediction Markets..." />
                {/* Optionally, include the HowToGuide here as well or link to it */}
            </div>
         );
    }
    
    return ( 
        <div className="page-container prediction-markets-list-page">
            <header className="list-page-header">
                <h1>PiOracle - Predict the Future!</h1>
            </header>

            <section className="intro-section">
                <h2>Welcome to PiOracle!</h2>
                <p>
                    Ready to test your foresight? PiOracle is a decentralized prediction market platform
                    where you can predict the outcomes of upcoming events.
                </p>
                <p>
                    <strong>Currently, PiOracle is running on the Polygon Amoy Testnet.</strong>
                    This means you'll be using free "test MATIC" to participate. These tokens have no real-world value
                    and are for testing and familiarization purposes only.
                </p>
                <p>
                    Our first featured events are the **Monaco Grand Prix (May 25th)** and the **Ice Hockey Championship Final (May 25th/26th)**!
                </p>
                <div className="cta-buttons">
                    <a href="#how-to-guide" className="button button-secondary">Quick Guide Below!</a>
                </div>
            </section>
            
            {/* Display non-critical error even if some markets loaded */}
            {error && markets.length > 0 && <ErrorMessage title="Notice" message={error} />}
            {isLoading && markets.length > 0 && <p className="loading-inline">Refreshing markets...</p>} 

            {(!isLoading && markets.length === 0 && !error) ? (
                <p className="info-message">No prediction markets available at the moment. Check back soon!</p>
            ) : (
                markets.length > 0 && ( // Ensure markets array has items before trying to map
                    <>
                        <h2 className="markets-section-title">Current Prediction Markets</h2>
                        <ul className="markets-grid">
                            {markets.map((market) => (
                                <MarketCard 
                                    key={market.id} 
                                    market={market} 
                                    // Pass helper functions if MarketCard needs them directly
                                    // Or ensure MarketCard imports them itself
                                    // getStatusString={getStatusString} 
                                    // formatExpiry={formatExpiry}
                                />
                            ))}
                        </ul>
                    </>
                )
            )}

            <section id="how-to-guide" className="how-to-guide-section">
                <h2>How to Participate (Amoy Testnet)</h2>
                <div className="guide-step">
                    <h3>1. Get a Wallet (MetaMask Recommended)</h3>
                    <p>If you don't have one, install the <a href="https://metamask.io/download/" target="_blank" rel="noopener noreferrer">MetaMask browser extension</a>. Follow their setup instructions.</p>
                </div>
                <div className="guide-step">
                    <h3>2. Add Polygon Amoy Network to MetaMask</h3>
                    <p>Open MetaMask, click the network dropdown, select "Add network," then "Add a network manually," and enter:</p>
                    <ul>
                        <li><strong>Network Name:</strong> Polygon Amoy</li>
                        <li><strong>New RPC URL:</strong> <code>https://rpc-amoy.polygon.technology/</code></li>
                        <li><strong>Chain ID:</strong> <code>80002</code></li>
                        <li><strong>Currency Symbol:</strong> <code>MATIC</code></li>
                        <li><strong>Block explorer URL (Optional):</strong> <code>https://amoy.polygonscan.com/</code></li>
                    </ul>
                </div>
                <div className="guide-step">
                    <h3>3. Get FREE Test MATIC from a Faucet</h3>
                    <p>You'll need test MATIC for transaction fees (gas) and to place predictions. Visit an Amoy faucet:</p>
                    <ul>
                        <li><a href="https://faucet.polygon.technology/" target="_blank" rel="noopener noreferrer">Official Polygon Faucet</a> (Select Amoy)</li>
                        <li><a href="https://www.alchemy.com/faucets/polygon-amoy" target="_blank" rel="noopener noreferrer">Alchemy Amoy Faucet</a></li>
                        <li><i>(Search "Polygon Amoy Faucet" for more options)</i></li>
                    </ul>
                </div>
                <div className="guide-step">
                    <h3>4. Connect Your Wallet to PiOracle</h3>
                    <p>Click the "Connect Wallet" button at the top of this page. Approve in MetaMask.</p>
                </div>
                <div className="guide-step">
                    <h3>5. Place Your Prediction</h3>
                    <p>Navigate to a market, enter your stake (test MATIC), choose your outcome, click "Submit Prediction," and confirm in MetaMask.</p>
                </div>
                <div className="guide-step">
                    <h3>6. Market Resolution & Claiming Winnings</h3>
                    <p>After an event, markets will be resolved. If you won, a "Claim Winnings" button will appear on the market page for you to collect your test MATIC.</p>
                </div>
                <p style={{textAlign: "center", marginTop: "20px", fontWeight: "bold"}}>
                    This is a testnet beta. Have fun predicting!
                </p>
            </section>
        </div> 
    );
}

export default PredictionMarketsListPage;