// pioracle/src/pages/PredictionMarketsListPage.jsx
import React, { useEffect, useState, useContext, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import { WalletContext } from '../context/WalletProvider';
import MarketCard from '../components/predictions/MarketCard';
import LoadingSpinner from '../components/common/LoadingSpinner';
import ErrorMessage from '../components/common/ErrorMessage';
import './PredictionMarketsListPage.css';

const getStatusString = (status) => `Status ${Number(status)}`; // Refined placeholder
const formatExpiry = (ts) => ts ? new Date(ts * 1000).toLocaleDateString() : "N/A"; // Refined placeholder

function PredictionMarketsListPage() {
    const walletContextValue = useContext(WalletContext);
    const contractInstanceFromContext = walletContextValue?.contract;
    const walletConnectionStatusType = walletContextValue?.connectionStatus?.type;
    const connectionStatusMessage = walletContextValue?.connectionStatus?.message;

    const [markets, setMarkets] = useState([]);
    const [isLoading, setIsLoading] = useState(true); // Start true
    const [error, setError] = useState(null);
    
    // To track if the contract instance reference actually changes
    const prevContractInstanceRef = useRef(null); 

    console.log(
        "PredictionMarketsListPage RENDER. isLoading:", isLoading, "Error:", error,
        "Contract from context:", !!contractInstanceFromContext, 
        "Wallet status type:", walletConnectionStatusType
    );

    const fetchMarketsInternal = useCallback(async (contractToUse) => {
        if (!contractToUse) {
            console.log("PredictionMarketsListPage: fetchMarketsInternal - Aborted, no contract instance.");
            setIsLoading(false); // Ensure loading stops if called without contract
            // setError("Cannot fetch markets: Contract not available."); // Optional: set error
            return;
        }
        console.log("PredictionMarketsListPage: fetchMarketsInternal CALLED for contract:", contractToUse.address);
        setIsLoading(true); // Set loading true for THIS fetch attempt
        setError(null);     // Clear previous page-specific errors
        
        const fetchedMarketsLocal = [];
        try {
            const nextIdBigNumber = await contractToUse.nextMarketId();
            const totalMarkets = nextIdBigNumber.toNumber();
            console.log(`PredictionMarketsListPage: Total markets to fetch: ${totalMarkets}`);

            if (totalMarkets > 0) {
                 for (let i = 0; i < totalMarkets; i++) {
                    const details = await contractToUse.getMarketStaticDetails(i);
                    if (details && (details.exists !== undefined ? details.exists : details[10])) { // Check exists flag
                        const assetSymbolStr = details.assetSymbol !== undefined ? details.assetSymbol : details[1];
                        const targetPriceBN = details.targetPrice !== undefined ? details.targetPrice : details[3];
                        let description = `Market #${(details.id !== undefined ? details.id : details[0]).toString()}: ${assetSymbolStr}`;
                        if (assetSymbolStr.includes("WINNER") || assetSymbolStr.includes("CHAMP")) {
                            description = `${assetSymbolStr.split("_WINNER")[0].split("_CHAMP")[0].replace(/_/g, " ")}: Will the outcome be YES?`;
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
                        });
                    }
                 }
            }
            setMarkets(fetchedMarketsLocal);
        } catch (e) {
            console.error("PredictionMarketsListPage: Error in fetchMarketsInternal", e);
            setError(e.message || "Failed to fetch markets.");
            setMarkets([]); // Clear markets on error
        }
        setIsLoading(false); // Set loading false after fetch attempt (success or fail)
    }, []); // Empty array: fetchMarketsInternal function reference is stable

    useEffect(() => {
        console.log(
            "PredictionMarketsListPage: useEffect FIRING.",
            "Contract instance from context:", !!contractInstanceFromContext, 
            "(Prev ref:", !!prevContractInstanceRef.current, 
            "Instance changed:", contractInstanceFromContext !== prevContractInstanceRef.current + ")",
            "Wallet connection type:", walletConnectionStatusType
        );

        if (walletConnectionStatusType === 'error') {
            console.log("PredictionMarketsListPage: WalletProvider error detected in useEffect.");
            setError(connectionStatusMessage || "Unknown WalletProvider error");
            setIsLoading(false);
            setMarkets([]);
        } else if (contractInstanceFromContext) {
            // Fetch if:
            // 1. It's the first time we have a contract instance (prevContractInstanceRef.current is null) OR
            // 2. The contract instance reference has actually changed (e.g., read-only to signer)
            if (contractInstanceFromContext !== prevContractInstanceRef.current) {
                 console.log("PredictionMarketsListPage: Contract instance available and changed (or initial). Calling fetchMarketsInternal.");
                 fetchMarketsInternal(contractInstanceFromContext);
            } else {
                 console.log("PredictionMarketsListPage: Contract instance available but ref did not change. No fetch needed by this effect run.");
                 // If still loading but contract didn't change, it means a previous fetch is in progress or completed.
                 // isLoading will be set to false by fetchMarketsInternal itself.
            }
        } else { 
            // No contract instance from context yet, and no WalletProvider error.
            // This means WalletProvider is likely still initializing.
            console.log("PredictionMarketsListPage: No contract instance from WalletProvider yet. Setting loading true.");
            setIsLoading(true); 
            setError(null);     
        }
        
        // Update the ref for the next render AFTER this effect's logic has run
        prevContractInstanceRef.current = contractInstanceFromContext;

    }, [contractInstanceFromContext, walletConnectionStatusType, fetchMarketsInternal, connectionStatusMessage]);
    // Main dependencies: if contract instance changes or wallet status type changes, re-evaluate.
    // fetchMarketsInternal is stable. connectionStatusMessage is for setting error.

    if (error) {
        return (
            <ErrorMessage 
                title="Error Loading Markets" 
                message={error} 
                onRetry={() => { if (contractInstanceFromContext) fetchMarketsInternal(contractInstanceFromContext); }}
                retryDisabled={!contractInstanceFromContext || isLoading} 
            />
        );
    }

    // Show loading spinner if isLoading is true AND (either no markets yet OR no error to prevent flicker if error clears)
    if (isLoading && (markets.length === 0 || !error)) { 
        return <LoadingSpinner message="Loading Prediction Markets..." />; 
    }
    
    return ( 
        <div className="page-container prediction-markets-list-page">
            <header className="list-page-header">
                <h1>PiOracle - Predict the Future</h1>
            </header>
            
            {/* Optional: Show inline refreshing message if isLoading but markets are already displayed */}
            {/* {isLoading && markets.length > 0 && <p className="loading-inline">Refreshing markets...</p>}  */}

            {(!isLoading && markets.length === 0 && !error) ? (
                <p className="info-message">No prediction markets available at the moment. Check back soon!</p>
            ) : (
                <ul className="markets-grid">
                    {markets.map((market) => (
                        <MarketCard key={market.id} market={market} />
                    ))}
                </ul>
            )}
        </div>
    );
}

export default PredictionMarketsListPage;