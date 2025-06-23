// src/pages/MarketDetailPage.jsx
import React, { useContext, useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ethers } from 'ethers';

// Keep all your necessary imports
import { WalletContext } from './WalletProvider';
import PredictionForm from '../components/predictions/PredictionForm';
import MarketOddsDisplay from '../components/predictions/MarketOddsDisplay';
import { getMarketDisplayProperties, MarketState } from '../utils/marketutils.js';
import './MarketDetailPage.css';

// The component now receives the raw contract data as a prop
function MarketDetailPage({ marketContractData }) {
    const { marketId } = useParams();
    // We still need the context for wallet info and the native token symbol
    const { walletAddress, signer, connectWallet, nativeTokenSymbol, contract } = useContext(WalletContext) || {};

    // Use useMemo to process the data only when it changes. This is efficient.
    const marketDetails = useMemo(() => {
        if (!marketContractData) return null;

        const intermediateMarket = {
            id: marketContractData[0].toString(),
            assetSymbol: marketContractData[1],
            priceFeedAddress: marketContractData[2],
            targetPrice: marketContractData[3].toString(),
            expiryTimestamp: Number(marketContractData[4]),
            resolutionTimestamp: Number(marketContractData[5]),
            totalStakedYesNet: marketContractData[6].toString(),
            totalStakedNoNet: marketContractData[7].toString(),
            state: Number(marketContractData[8]),
            actualOutcomeValue: marketContractData[9].toString(),
            exists: marketContractData[10],
            isEventMarket: marketContractData[11],
            creationTimestamp: Number(marketContractData[12]),
        };
        
        return getMarketDisplayProperties(intermediateMarket);
    }, [marketContractData]);

    // --- All your other logic for claiming, checking status, etc. can go here ---
    // You will need to re-implement the claimableAmount fetching logic here,
    // as it depends on the walletAddress which isn't available in the loader.
    // This is a good place for it.

    if (!marketDetails) {
        // This is a safety net in case something goes wrong
        return <div className="page-container">Error displaying market data.</div>;
    }

    // Your original JSX can now safely use 'marketDetails'
    return (
        <div className="page-container market-detail-page-v2">
            <header className="market-header-v2">
                <Link to="/predictions" className="back-link-v2">← All Markets</Link>
                <h1>{marketDetails.title}</h1>
                 {/* ... the rest of your beautiful JSX ... */}
            </header>
            <div className="market-body-v2">
                {/* ... all your other divs and components ... */}
            </div>
        </div>
    );
}

export default MarketDetailPage;