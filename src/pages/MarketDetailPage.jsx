// src/pages/MarketDetailPage.jsx

import React, { useEffect, useState, useContext, useMemo, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ethers } from 'ethers';

// --- THIS IS THE ONLY CHANGE NEEDED ---
import { WalletContext } from '../contexts/WalletContext.jsx';
// ------------------------------------
 
import PredictionForm from '../components/predictions/PredictionForm';
import MarketOddsDisplay from '../components/predictions/MarketOddsDisplay';
import LoadingSpinner from '../components/common/LoadingSpinner';
import ErrorMessage from '../components/common/ErrorMessage';
import { getMarketDisplayProperties, MarketState } from '../utils/marketutils.js';
import './MarketDetailPage.css';

function MarketDetailPage() {
    const { marketId } = useParams();
    const { predictionMarketContract, walletAddress, chainId, isInitialized } = useContext(WalletContext);
    
    const [marketData, setMarketData] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [refreshKey, setRefreshKey] = useState(0);

    const contractAddress = useMemo(() => predictionMarketContract?.address, [predictionMarketContract]);

    useEffect(() => {
        const fetchAllMarketData = async () => {
            if (!isInitialized || !walletAddress) {
                return;
            }
            if (!predictionMarketContract) {
                setError("App not configured for this network.");
                setIsLoading(false);
                return;
            }

            setIsLoading(true);
            setError(null);
            
            try {
                const rawMarket = await predictionMarketContract.getMarketStaticDetails(marketId);

                if (!rawMarket || !rawMarket.exists) {
                    throw new Error(`Market #${marketId} does not exist on this network.`);
                }
                
                const baseMarket = {
                    id: rawMarket.id.toString(),
                    assetSymbol: rawMarket.assetSymbol,
                    state: Number(rawMarket.state),
                    expiryTimestamp: Number(rawMarket.expiryTimestamp),
                    totalStakedYes: rawMarket.totalStakedYes.toString(),
                    totalStakedNo: rawMarket.totalStakedNo.toString(),
                };
                const formattedMarket = getMarketDisplayProperties(baseMarket);
                setMarketData(formattedMarket);
                
            } catch (err) {
                console.error(`MDLP: Error fetching details for market #${marketId}:`, err);
                setError(err.message || "An unknown error occurred.");
            } finally {
                setIsLoading(false);
            }
        };

        fetchAllMarketData();
    
    }, [marketId, contractAddress, walletAddress, chainId, isInitialized, refreshKey]);

    if (isLoading) {
        return <div className="page-container"><LoadingSpinner message={`Loading Market #${marketId}...`} /></div>;
    }
    
    if (error) {
        return <div className="page-container"><ErrorMessage title="Market Data Error" message={error} /></div>;
    }

    if (!marketData) {
        return <div className="page-container"><ErrorMessage title="Not Found" message={`Market #${marketId} could not be loaded.`} /></div>;
    }

    return (
        <div className="page-container market-detail-page-v2">
            <header className="market-header-v2">
                <Link to="/predictions" className="back-link-v2">← All Markets</Link>
                <h1>{marketData.title}</h1>
                <div className="market-meta-v2">
                    <span className="meta-item">Chain ID: {chainId}</span>
                    <span className="meta-item">Expires: {new Date(marketData.expiryTimestamp * 1000).toLocaleString()}</span>
                    <span className={`status-badge ${marketData.statusString.toLowerCase()}`}>{marketData.statusString}</span>
                </div>
            </header>

            <div className="market-body-v2">
                <div className="market-action-zone">
                    <MarketOddsDisplay
                        totalStakedYes={marketData.totalStakedYes}
                        totalStakedNo={marketData.totalStakedNo}
                        tokenSymbol={"BNB"}
                    />
                    
                    <div className="interaction-panel">
                        {marketData.state === 0 && walletAddress ? (
                            <PredictionForm 
                                marketId={marketData.id} 
                                onBetPlaced={() => setRefreshKey(k => k + 1)}
                            />
                        ) : (
                           <div className="market-closed-notice">
                                {marketData.state !== 0 ? "This market is closed." : "Please connect your wallet to predict."}
                            </div>
                        )}
                    </div>
                </div>
                
                <div className="market-info-zone">
                </div>
            </div>
        </div>
    );
}

export default MarketDetailPage;