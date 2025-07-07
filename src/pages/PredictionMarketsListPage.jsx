// src/pages/PredictionMarketsListPage.jsx

import React, { useState, useEffect, useContext } from 'react';
 
import MarketCard from '../components/predictions/MarketCard';
import LoadingSpinner from '../components/common/LoadingSpinner';
import ErrorMessage from '../components/common/ErrorMessage';
import { getMarketDisplayProperties } from '../utils/marketutils.js';
import './PredictionMarketsListPage.css';

function PredictionMarketsListPage() {
    const { predictionMarketContract, chainId, isInitialized, walletAddress } = useContext(WalletContext);
    const [allMarkets, setAllMarkets] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchMarkets = async () => {
            if (!isInitialized) { setIsLoading(true); return; }
            if (!walletAddress) { setIsLoading(false); setError("Please connect your wallet to view markets."); setAllMarkets([]); return; }
            if (!predictionMarketContract) { setIsLoading(false); setError(`App not configured for Chain ID: ${chainId}.`); setAllMarkets([]); return; }

            setIsLoading(true);
            setError(null);
            console.log(`PMLP (Chain ${chainId}): Contract is valid. Using nextMarketId fetch logic...`);

            try {
                const nextId = await predictionMarketContract.nextMarketId();
                const totalMarkets = nextId.toNumber();

                if (totalMarkets === 0) {
                    console.log("PMLP: No markets created on this contract.");
                    setAllMarkets([]);
                    setIsLoading(false);
                    return;
                }

                const marketPromises = [];
                for (let i = 0; i < totalMarkets; i++) {
                    marketPromises.push(predictionMarketContract.getMarketStaticDetails(i));
                }
                
                const rawMarkets = await Promise.all(marketPromises);

                // --- MODIFICATION: The filter for `market.exists` is removed for this test ---
                const formattedMarkets = rawMarkets
                    // .filter(market => market.exists === true) // Temporarily disabled to see all data
                    .map(raw => {
                        const baseMarket = {
                            id: raw.id.toString(),
                            assetSymbol: raw.assetSymbol,
                            state: Number(raw.state),
                            expiryTimestamp: Number(raw.expiryTimestamp),
                            totalStakedYes: raw.totalStakedYes.toString(),
                            totalStakedNo: raw.totalStakedNo.toString(),
                            exists: raw.exists, // Pass the 'exists' flag through
                        };
                        return getMarketDisplayProperties(baseMarket);
                    })
                    .sort((a, b) => parseInt(b.id) - parseInt(a.id));

                setAllMarkets(formattedMarkets);
                console.log("PMLP: Successfully fetched and formatted all markets.", formattedMarkets);

            } catch (err) {
                console.error("PMLP: CRITICAL ERROR during market fetch:", err);
                setError("A contract error occurred. Please check the network or contract configuration.");
            } finally {
                setIsLoading(false);
            }
        };

        fetchMarkets();
    }, [predictionMarketContract, chainId, isInitialized, walletAddress]);
    
    // --- MODIFICATION: Display ALL markets, not just open ones ---
    const marketsToDisplay = allMarkets;

    return (
        <div className="page-container prediction-list-page">
            {/* The title is updated to be more accurate for this test */}
            <h1>All Existing Markets (Chain ID: {chainId || 'Not Connected'})</h1>
            
            {isLoading && <LoadingSpinner message="Fetching markets..." />}
            
            {error && !isLoading && <ErrorMessage title="Error Loading Markets" message={error} />}
            
            {!isLoading && !error && (
                 <div className="market-grid">
                    {marketsToDisplay.length > 0 ? (
                        marketsToDisplay.map(market => <MarketCard key={market.id} market={market} />)
                    ) : (
                        <p>No markets found on this network. Create one!</p>
                    )}
                </div>
            )}
        </div>
    );
}

export default PredictionMarketsListPage;