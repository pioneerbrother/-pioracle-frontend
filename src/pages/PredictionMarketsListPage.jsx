// src/pages/PredictionMarketsListPage.jsx

import React, { useState, useEffect, useContext, useMemo } from 'react';
import { WalletContext } from './WalletProvider';
import MarketCard from '../components/predictions/MarketCard';
import LoadingSpinner from '../components/common/LoadingSpinner';
import ErrorMessage from '../components/common/ErrorMessage';
import ConnectWalletButton from '../components/common/ConnectWalletButton';
import { getMarketDisplayProperties, MarketState } from '../utils/marketutils.js';
import './PredictionMarketsListPage.css';

function PredictionMarketsListPage() {
    const { predictionMarketContract, chainId, isInitialized, walletAddress } = useContext(WalletContext);
    const [markets, setMarkets] = useState([]);
    const [pageState, setPageState] = useState('initializing');
    const [errorMessage, setErrorMessage] = useState('');

    useEffect(() => {
        const fetchMarkets = async () => {
            if (!isInitialized) { setPageState('initializing'); return; }
            if (!walletAddress) { setPageState('prompt_connect'); return; }
            if (!predictionMarketContract) {
                setPageState('loading');
                return;
            }

            setPageState('loading');
            setErrorMessage('');
            try {
                const nextIdBN = await predictionMarketContract.nextMarketId();
                const totalMarkets = nextIdBN.toNumber();

                if (totalMarkets === 0) {
                    setMarkets([]);
                    setPageState('success');
                    return;
                }

                const marketPromises = [];
                for (let i = 0; i < totalMarkets; i++) {
                    marketPromises.push(predictionMarketContract.getMarketStaticDetails(i));
                }
                const rawMarkets = await Promise.all(marketPromises);

                const formattedMarkets = rawMarkets
                    .filter(market => market && market.exists === true)
                    .map(raw => getMarketDisplayProperties({ /* ... your mapping logic ... */ }))
                    .sort((a, b) => parseInt(b.id) - parseInt(a.id));

                setMarkets(formattedMarkets);
                setPageState('success');
            } catch (err) {
                console.error("PMLP: CRITICAL ERROR during market fetch:", err);
                setPageState('error');
                setErrorMessage("A contract error occurred. Please check the network or contract configuration.");
            }
        };

        fetchMarkets();
    }, [predictionMarketContract, chainId, isInitialized, walletAddress]);
    
    const openMarkets = useMemo(() => {
        return markets.filter(m => m.state === MarketState.Open);
    }, [markets]);

    const renderContent = () => {
        // ... (The robust switch/case rendering logic) ...
    };
    
    return (
        <div className="page-container prediction-list-page">
            <h1>Open Markets (Chain ID: {chainId || 'Not Connected'})</h1>
            {renderContent()}
        </div>
    );
}

export default PredictionMarketsListPage;