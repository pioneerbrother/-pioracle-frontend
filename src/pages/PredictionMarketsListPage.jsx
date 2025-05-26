// pioracle/src/pages/PredictionMarketsListPage.jsx
import React, { useEffect, useState, useContext, useCallback, useRef, useMemo } from 'react';
import { Link } from 'react-router-dom'; // For linking from MarketCard
import { WalletContext } from '../context/WalletProvider';
import MarketCard from '../components/predictions/MarketCard';
import LoadingSpinner from '../components/common/LoadingSpinner';
import ErrorMessage from '../components/common/ErrorMessage';
import './PredictionMarketsListPage.css'; // Ensure this CSS file exists and is styled

// Placeholder helper functions (ideally move to utils/formatters.js and import)
// Ensure these are consistent with what MarketCard expects if it uses them.
// For this component, these are mainly for the <MarketCard /> component if it doesn't define its own.
const getStatusString = (statusEnum) => {
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
    const loadedTargetChainIdHex = walletContextValue?.loadedTargetChainIdHex; // For dynamic text

    const [markets, setMarkets] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    
    const prevContractInstanceRef = useRef(null);
    // const prevWalletStatusTypeRef = useRef(null); // Not strictly needed if contractInstance change is the main driver

    const nativeTokenSymbol = useMemo(() => { // To display correct token in guide
        if (loadedTargetChainIdHex) {
            const targetChainIdNum = parseInt(loadedTargetChainIdHex, 16);
            if (targetChainIdNum === 80002) return "MATIC"; // Amoy
            if (targetChainIdNum === 137) return "MATIC";  // Polygon Mainnet
        }
        return "ETH"; // Default for local Hardhat
    }, [loadedTargetChainIdHex]);

    const currentNetworkName = useMemo(() => { // For guide text
        if (loadedTargetChainIdHex) {
            const targetChainIdNum = parseInt(loadedTargetChainIdHex, 16);
            if (targetChainIdNum === 80002) return "Polygon Amoy Testnet";
            if (targetChainIdNum === 137) return "Polygon Mainnet";
        }
        return "Local Hardhat Network";
    }, [loadedTargetChainIdHex]);


    console.log(
        "PredictionMarketsListPage RENDER. isLoading:", isLoading, "Error:", error,
        "Contract from context:", !!contractInstanceFromContext, 
        "Wallet status type:", walletConnectionStatusType
    );

    const fetchMarketsInternal = useCallback(async (contractToUse) => {
        if (!contractToUse) {
            console.warn("PredictionMarketsListPage: fetchMarketsInternal - Aborted, no contract instance.");
            setIsLoading(false); 
            // setError("Contract not available to fetch markets."); // Avoid setting error if just waiting for provider
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
                    const details = await contractToUse.getMarketStaticDetails(i); // Expects 12 fields
                  // ... inside fetchMarketsInternal loop in PredictionMarketsListPage.jsx
if (details && (details.exists !== undefined ? details.exists : details[10])) {
    fetchedMarketsLocal.push({
        id: (details.id !== undefined ? details.id : details[0]).toString(),
        assetSymbol: details.assetSymbol !== undefined ? details.assetSymbol : details[1],
        targetPrice: (details.targetPrice !== undefined ? details.targetPrice : details[3]).toString(),
        priceFeedAddress: details.priceFeedAddress !== undefined ? details.priceFeedAddress : details[2], // Pass if needed by utils
        isEventMarket: details.isEventMarket !== undefined ? details.isEventMarket : details[11],
        expiryTimestamp: (details.expiryTimestamp !== undefined ? details.expiryTimestamp : details[4]).toNumber(),
        state: Number(details.state !== undefined ? details.state : details[8]),
        exists: (details.exists !== undefined ? details.exists : details[10]),
        // Pass other raw fields if getMarketDisplayProperties needs them
    });
}
// ...
                 }
            }
            setMarkets(fetchedMarketsLocal);
        } catch (e) {
            console.error("PredictionMarketsListPage: Error in fetchMarketsInternal", e);
            setError(e.message || "Failed to fetch markets.");
            setMarkets([]);
        }
        setIsLoading(false);
    }, []); // Stable useCallback, takes contractToUse as argument

    useEffect(() => {
        const currentContractInstance = contractInstanceFromContext;
        const prevContractInstance = prevContractInstanceRef.current;

        console.log(
            "PredictionMarketsListPage: useEffect FIRING.",
            "Current Contract Instance:", !!currentContractInstance, "(Addr:", currentContractInstance?.address, ")",
            "Previous Contract Instance Ref:", !!prevContractInstance, "(Addr:", prevContractInstance?.address, ")",
            "Wallet connection type:", walletConnectionStatusType
        );

        if (walletConnectionStatusType === 'error') {
            console.log("PredictionMarketsListPage: WalletProvider error detected in useEffect.");
            setError(connectionStatusMessage || "Unknown WalletProvider error");
            setIsLoading(false);
            setMarkets([]);
        } else if (currentContractInstance) {
            if (currentContractInstance !== prevContractInstance) { // Fetch if contract instance reference changes
                 console.log("PredictionMarketsListPage: Contract instance available and has changed (or initial). Calling fetchMarketsInternal.");
                 fetchMarketsInternal(currentContractInstance);
            } else if (isLoading && markets.length === 0 && !error) {
                 // This case handles if we are still loading but contract ref hasn't changed yet.
                 // However, fetchMarketsInternal should have been called if currentContractInstance is valid.
                 // This might be redundant or could help if there's a very specific timing issue.
                 console.log("PredictionMarketsListPage: Still loading, no markets, no error, contract ref same. Consider if fetch needed.");
            } else {
                 console.log("PredictionMarketsListPage: Contract instance present but no fetch triggered (ref same or not initial load).");
                 // If it was loading from a previous trigger but now has markets or an error, ensure isLoading is false.
                 if(isLoading) setIsLoading(false);
            }
        } else { 
            console.log("PredictionMarketsListPage: No contract instance from WalletProvider yet. Setting loading true.");
            setIsLoading(true); 
            setError(null);     
        }
        
        prevContractInstanceRef.current = currentContractInstance; // Update the ref for the next render

    }, [contractInstanceFromContext, walletConnectionStatusType, fetchMarketsInternal, connectionStatusMessage, isLoading, error, markets]);
    // Added markets to dependency array to re-evaluate the isLoading state if markets get populated by an out-of-band update.
    // This useEffect is getting complex, careful management of isLoading and error is key.


    // --- Render Logic ---
    if (walletConnectionStatusType === 'error' && !error) {
        // Prioritize WalletProvider error if page hasn't set its own more specific one yet
        return (
            <div className="page-container prediction-markets-list-page">
                 <header className="list-page-header"><h1>PiOracle - Predict the Future!</h1></header>
                 <ErrorMessage title="Connection Error" message={connectionStatusMessage} />
            </div>
         );
    }
    if (error && markets.length === 0) { 
         return (
            <div className="page-container prediction-markets-list-page">
                 <header className="list-page-header"><h1>PiOracle - Predict the Future!</h1></header>
                 <ErrorMessage 
                    title="Error Loading Markets" 
                    message={error} 
                    onRetry={() => { if (contractInstanceFromContext) fetchMarketsInternal(contractInstanceFromContext); }}
                    retryDisabled={!contractInstanceFromContext || isLoading} 
                />
            </div>
         );
    }
    
    if (isLoading && markets.length === 0 && !error) { 
         return (
            <div className="page-container prediction-markets-list-page">
                 <header className="list-page-header"><h1>PiOracle - Predict the Future!</h1></header>
                <LoadingSpinner message="Loading Prediction Markets..." />
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
                    <strong>Currently, PiOracle is running on the {currentNetworkName}.</strong>
                    This means you'll be using free "test {nativeTokenSymbol}" (if on a testnet like Amoy or Localhost) or real "{nativeTokenSymbol}" (if on Mainnet) to participate. 
                    {(currentNetworkName === "Polygon Amoy Testnet" || currentNetworkName === "Local Hardhat Network") && 
                        "Test tokens have no real-world value and are for testing and familiarization purposes only."
                    }
                    {currentNetworkName === "Polygon Mainnet" && 
                        <strong>Please predict responsibly as real funds are involved.</strong>
                    }
                </p>
                <p>
                    Our first featured events are the **Monaco Grand Prix (May 25th)** and the **Ice Hockey Championship Final (May 25th/26th)**! 
                    (Ensure event details are accurate for mainnet launch).
                </p>
                <div className="cta-buttons">
                    <a href="#how-to-guide" className="button button-secondary">Quick Guide Below!</a>
                </div>
            </section>
            
            {error && markets.length > 0 && <ErrorMessage title="Market List Notice" message={error} />}
            {isLoading && markets.length > 0 && <p className="loading-inline">Refreshing markets...</p>} 

            {(!isLoading && markets.length === 0 && !error) ? (
                <p className="info-message">No prediction markets available at the moment. Check back soon!</p>
            ) : (
                markets.length > 0 && ( 
                    <>
                        <h2 className="markets-section-title">Current Prediction Markets</h2>
                        <ul className="markets-grid">
                            {markets.map((market) => (
                                <MarketCard key={market.id} market={market} />
                            ))}
                        </ul>
                    </>
                )
            )}

            <section id="how-to-guide" className="how-to-guide-section">
                <h2>How to Participate (on {currentNetworkName})</h2>
                <div className="guide-step">
                    <h3>1. Get a Wallet (MetaMask Recommended)</h3>
                    <p>If you don't have one, install the <a href="https://metamask.io/download/" target="_blank" rel="noopener noreferrer">MetaMask browser extension</a>.</p>
                </div>
                <div className="guide-step">
                    <h3>2. Configure MetaMask for {currentNetworkName}</h3>
                    {currentNetworkName === "Polygon Amoy Testnet" && (
                        <>
                        <p>Open MetaMask, click network dropdown, "Add network," then "Add a network manually," and enter:</p>
                        <ul>
                            <li><strong>Network Name:</strong> Polygon Amoy</li>
                            <li><strong>New RPC URL:</strong> <code>https://rpc-amoy.polygon.technology/</code></li>
                            <li><strong>Chain ID:</strong> <code>80002</code></li>
                            <li><strong>Currency Symbol:</strong> MATIC</li>
                            <li><strong>Block explorer URL:</strong> <code>https://amoy.polygonscan.com/</code></li>
                        </ul>
                        </>
                    )}
                    {currentNetworkName === "Polygon Mainnet" && (
                        <>
                        <p>Polygon Mainnet is usually pre-configured in MetaMask. If not, use these details:</p>
                        <ul>
                            <li><strong>Network Name:</strong> Polygon Mainnet</li>
                            <li><strong>New RPC URL:</strong> <code>https://polygon-rpc.com</code></li>
                            <li><strong>Chain ID:</strong> <code>137</code></li>
                            <li><strong>Currency Symbol:</strong> MATIC</li>
                            <li><strong>Block explorer URL:</strong> <code>https://polygonscan.com/</code></li>
                        </ul>
                        </>
                    )}
                     {currentNetworkName === "Local Hardhat Network" && (
                        <>
                        <p>Add your local Hardhat node to MetaMask:</p>
                        <ul>
                            <li><strong>Network Name:</strong> Local Host 8545 (or similar)</li>
                            <li><strong>New RPC URL:</strong> <code>http://127.0.0.1:8545</code></li>
                            <li><strong>Chain ID:</strong> <code>31337</code></li>
                            <li><strong>Currency Symbol:</strong> ETH</li>
                        </ul>
                        </>
                    )}
                    <p>Save and ensure {currentNetworkName} is selected.</p>
                </div>
                <div className="guide-step">
                    <h3>3. Get {nativeTokenSymbol}</h3>
                    { (currentNetworkName === "Polygon Amoy Testnet") && 
                        <p>For Amoy, get FREE test {nativeTokenSymbol} from a faucet: 
                            <a href="https://faucet.polygon.technology/" target="_blank" rel="noopener noreferrer">Polygon Faucet</a>, 
                            <a href="https://www.alchemy.com/faucets/polygon-amoy" target="_blank" rel="noopener noreferrer">Alchemy Faucet</a>.
                        </p>
                    }
                    { (currentNetworkName === "Local Hardhat Network") &&
                        <p>Your local Hardhat accounts are pre-funded with test {nativeTokenSymbol}. Import one into MetaMask using its private key.</p>
                    }
                    { (currentNetworkName === "Polygon Mainnet") &&
                        <p>You'll need real {nativeTokenSymbol}. Acquire it from exchanges and send to your MetaMask wallet on Polygon Mainnet.</p>
                    }
                </div>
                {/* ... (Steps 4, 5, 6 for Connect, Place Prediction, Resolution/Claiming - similar to before, ensure they use nativeTokenSymbol) ... */}
                 <div className="guide-step"><h3>4. Connect & Predict...</h3> <p>Follow UI prompts!</p></div>

                <p style={{textAlign: "center", marginTop: "20px", fontWeight: "bold"}}>
                    {currentNetworkName === "Polygon Mainnet" ? "Predict responsibly!" : "This is a test environment. Have fun!"}
                </p>
            </section>
        </div> 
    );
}

export default PredictionMarketsListPage;