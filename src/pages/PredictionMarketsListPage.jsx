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
                // This is a valid state when switching networks
                setPageState('loading');
                return;
            }

            setPageState('loading');
            setErrorMessage('');
            console.log(`PMLP: Contract valid for chain ${chainId}. Fetching markets...`);

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
                    .filter(market => market && market.exists === true) // Filter out non-existent markets
                    .map(raw => getMarketDisplayProperties({
                        id: raw.id.toString(),
                        assetSymbol: raw.assetSymbol,
                        state: Number(raw.state),
                        expiryTimestamp: Number(raw.expiryTimestamp),
                        totalStakedYes: raw.totalStakedYes.toString(),
                        totalStakedNo: raw.totalStakedNo.toString(),
                    }))
                    .sort((a, b) => parseInt(b.id) - parseInt(a.id));

                setMarkets(formattedMarkets);
                setPageState('success');
            } catch (err) {
                console.error("PMLP: CRITICAL ERROR during market fetch:", err);
                setPageState('error');
                setErrorMessage("A contract error occurred. Please check the network or configuration.");
            }
        };

        fetchMarkets();
    }, [predictionMarketContract, chainId, isInitialized, walletAddress]);
    
    const openMarkets = useMemo(() => {
        return markets.filter(m => m.state === MarketState.Open);
    }, [markets]);

    const renderContent = () => {
        switch (pageState) {
            case 'initializing':
            case 'loading':
                return <LoadingSpinner message="Fetching markets..." />;
            case 'prompt_connect':
                return (
                    <div className="centered-prompt">
                        <p>Please connect your wallet to view the markets.</p>
                        <ConnectWalletButton />
                    </div>
                );
            case 'error':
                return <ErrorMessage title="Error Loading Markets" message={errorMessage} />;
            case 'success':
                return (
                    <div className="market-grid">
                        {openMarkets.length > 0 ? (
                            openMarkets.map(market => <MarketCard key={market.id} market={market} />)
                        ) : (
                            <p>No open markets found on this network. Be the first to create one!</p>
                        )}
                    </div>
                );
            default:
                return null;
        }
    };
    
    return (
        <div className="page-container prediction-list-page">
            <h1>Open Markets (Chain ID: {chainId || 'Not Connected'})</h1>
            {renderContent()}
        </div>
    );
}

export default PredictionMarketsListPage;