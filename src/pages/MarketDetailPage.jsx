// pioracle/src/pages/MarketDetailPage.jsx
import React, { useEffect, useState, useContext, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ethers } from 'ethers';

import { WalletContext } from './WalletProvider'; 
import PredictionForm from '../components/predictions/PredictionForm';
import MarketOddsDisplay from '../components/predictions/MarketOddsDisplay';
import LoadingSpinner from '../components/common/LoadingSpinner';
import ErrorMessage from '../components/common/ErrorMessage';

import { getMarketDisplayProperties, MarketState as MarketStateEnum } from '../utils/marketutils.js';
import './MarketDetailPage.css';

const aggregatorV3InterfaceABI = [
    { "inputs": [], "name": "decimals", "outputs": [{ "internalType": "uint8", "name": "", "type": "uint8" }], "stateMutability": "view", "type": "function" },
    { "inputs": [], "name": "latestRoundData", "outputs": [ { "internalType": "uint80", "name": "roundId", "type": "uint80" }, { "internalType": "int256", "name": "answer", "type": "int256" }, { "internalType": "uint256", "name": "startedAt", "type": "uint256" }, { "internalType": "uint256", "name": "updatedAt", "type": "uint256" }, { "internalType": "uint80", "name": "answeredInRound", "type": "uint80" } ], "stateMutability": "view", "type": "function" }
];

function MarketDetailPage() {
    const { marketId } = useParams();
    // Destructure contract directly from WalletContext
   
 // --- THIS IS THE INCORRECT LINE ---
// --- THIS IS THE CORRECT LINE ---
const { contract, walletAddress, signer, provider, connectWallet, nativeTokenSymbol } = useContext(WalletContext) || {};

    const [marketDetails, setMarketDetails] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [claimableAmount, setClaimableAmount] = useState(ethers.BigNumber.from(0));
    const [isClaiming, setIsClaiming] = useState(false);
    const [actionMessage, setActionMessage] = useState({ text: "", type: "info" });
    const [refreshKey, setRefreshKey] = useState(0); // To trigger data refetch

    // --- THIS IS THE KEY FIX ---
    // This useEffect is now much simpler and only depends on the essentials.
    // It will ONLY run when the contract is ready, or the marketId/refreshKey changes.
    useEffect(() => {
        // 1. Guard Clause: If the contract from the provider isn't ready, do nothing.
        // The loading spinner from the initial state will continue to show.
        if (!contract) {
            console.log("MarketDetailPage: Waiting for contract instance from WalletProvider...");
            setIsLoading(true); // Explicitly ensure we are in a loading state
            return;
        }

        const numericMarketId = Number(marketId);
        if (isNaN(numericMarketId)) {
            setError("Invalid Market ID.");
            setIsLoading(false);
            return;
        }

        const fetchAllMarketData = async () => {
            setIsLoading(true);
            setError(null);
            console.log(`MarketDetailPage: Contract is ready. Fetching data for Market ID: ${numericMarketId}`);

            try {
                const detailsArray = await contract.getMarketStaticDetails(numericMarketId);
                
                if (!detailsArray || !detailsArray.exists) {
                    throw new Error(`Market ID ${numericMarketId} not found or does not exist.`);
                }
                
                const rawMarketData = {
                    id: detailsArray[0].toString(),
                    assetSymbol: detailsArray[1],
                    priceFeedAddress: detailsArray[2],
                    targetPrice: detailsArray[3].toString(),
                    expiryTimestamp: Number(detailsArray[4]),
                    resolutionTimestamp: Number(detailsArray[5]),
                    totalStakedYesNet: detailsArray[6].toString(),
                    totalStakedNoNet: detailsArray[7].toString(),
                    state: Number(detailsArray[8]),
                    actualOutcomeValue: detailsArray[9].toString(),
                    exists: detailsArray[10],
                    isEventMarket: detailsArray[11],
                    creationTimestamp: Number(detailsArray[12]),
                    oracleDecimals: 8
                };
                
                const displayProps = getMarketDisplayProperties(rawMarketData);
                let finalMarketDetails = { ...rawMarketData, ...displayProps };

                // Fetch live price for open oracle markets
                if (!finalMarketDetails.isEventMarket && finalMarketDetails.state === MarketStateEnum.Open && provider) {
                     // logic to fetch live price can go here if needed
                }
                
                setMarketDetails(finalMarketDetails);

                // Check for claimable winnings if a user is connected
                if (walletAddress && finalMarketDetails.state > MarketStateEnum.Open) {
                    const claimed = await contract.didUserClaim(numericMarketId, walletAddress);
                    if (!claimed) {
                        const amount = await contract.getClaimableAmount(numericMarket_id, walletAddress);
                        setClaimableAmount(amount);
                    }
                }

            } catch (err) {
                console.error(`MarketDetailPage fetchAllMarketData ERROR:`, err);
                setError(err.message || "Failed to load market details.");
            } finally {
                setIsLoading(false);
            }
        };

        fetchAllMarketData();

    }, [marketId, contract, walletAddress, refreshKey, provider]); // Dependency array is now lean and correct


    const handleClaimWinnings = useCallback(async () => {
        // This function remains largely the same, but ensure it uses 'contract' directly
        if (!contract || !signer || !marketDetails || claimableAmount.isZero()) return;
        setIsClaiming(true);
        try {
            const tx = await contract.connect(signer).claimWinnings(marketDetails.id);
            await tx.wait(1);
            setActionMessage({ text: "Winnings claimed successfully!", type: "success" });
            setRefreshKey(k => k + 1);
        } catch (err) {
             const reason = err.reason || err.message || "Failed to claim winnings.";
             setActionMessage({text: `Claim failed: ${reason}`, type: "error"});
        } finally {
            setIsClaiming(false);
        }
    }, [contract, signer, marketDetails, claimableAmount]);

    // --- A MORE RELIABLE WAY TO DETECT WRONG NETWORK ---
    // If a wallet is connected but we DON'T have a signer, it means the network is wrong.
    // WalletProvider only provides a signer when the network is correct.
// In MarketDetailPage.jsx, find and replace the isWrongNetwork definition

// --- The NEW, more reliable check ---
const isWrongNetwork = (walletAddress && !signer); 

    if (isLoading) return <LoadingSpinner message={`Loading Market Details for ID: ${marketId}...`} />;
    if (error) return <ErrorMessage title="Market Data Error" message={error} />;
    if (!marketDetails) return <ErrorMessage title="Not Found" message={`Market (ID: ${marketId}) could not be loaded.`} />;

    const isMarketOpenForBetting = marketDetails.state === MarketStateEnum.Open;

    return (
        <div className="page-container market-detail-page">
            <Link to="/predictions" className="back-link">← All Prediction Markets</Link>
            
            <header className="market-detail-header">
                <h1>{marketDetails.title}</h1>
                <div className="market-meta">
                    <span>Expires: {marketDetails.expiryString}</span>
                    <span className={`status-badge ${marketDetails.statusClassName}`}>{marketDetails.statusString}</span>
                </div>
            </header>

            <section className="market-data-section">
                <MarketOddsDisplay
                    totalStakedYesNet={marketDetails.totalStakedYesNet}
                    totalStakedNoNet={marketDetails.totalStakedNoNet}
                    marketTarget={marketDetails.targetDisplay}
                    isEventMarket={marketDetails.isEventMarket} 
                     tokenSymbol={nativeTokenSymbol || "TOKEN"}                />
             <div className="betting-section">
    {/* The form for placing a bet */}
    {isMarketOpenForBetting && walletAddress && signer && (
        <PredictionForm 
            marketId={marketDetails.id} 
            onBetPlaced={() => setRefreshKey(k => k + 1)}
            
            // --- ADD THESE PROPS ---
            tokenSymbol={nativeTokenSymbol || "TOKEN"} // Pass the native token symbol
            marketTarget={marketDetails.targetDisplay} // Pass the formatted target (e.g., "$110,000")
            isEventMarket={marketDetails.isEventMarket} // Let the form know if it's an event or price market
        />
    )}

                    {/* Notice to connect wallet */}
                    {isMarketOpenForBetting && !walletAddress && (
                        <div className="connect-wallet-notice">
                            <p>Please connect your wallet to place a prediction.</p>
                            <button onClick={connectWallet} className="button primary">Connect Wallet</button>
                        </div>
                    )}
                    
                    {/* Notice for WRONG NETWORK */}
                    {isWrongNetwork && (
                         <div className="network-notice"><p>⚠️ Please switch to the target network to place a bet.</p></div>
                    )}
                </div>
            </section>
        </div>
    );
}

export default MarketDetailPage;