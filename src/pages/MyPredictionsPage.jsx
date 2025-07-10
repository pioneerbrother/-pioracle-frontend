// src/pages/MyPredictionsPage.jsx
import React, { useState, useEffect, useContext, useMemo } from 'react';
import { Link } from 'react-router-dom';

// This path must be correct for your project structure
import { WalletContext } from '../contexts/WalletContext'; 

import MarketCard from '../components/predictions/MarketCard';
import LoadingSpinner from '../components/common/LoadingSpinner';
import ErrorMessage from '../components/common/ErrorMessage';
import { getMarketDisplayProperties } from '../utils/marketutils.js';
import './PredictionMarketsListPage.css'; // Reusing styles

function MyPredictionsPage() {
    // Get the necessary items from our context
    const { predictionMarketContract, walletAddress, chainId } = useContext(WalletContext);
    
    // State for this page
    const [myStakedMarkets, setMyStakedMarkets] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    // --- REWRITTEN useEffect to prevent infinite loops ---
    useEffect(() => {
        const fetchMyStakes = async () => {
            // Pre-condition check: Do not run if the contract or user address isn't ready.
            if (!predictionMarketContract || !walletAddress) {
                // If the user isn't connected, we can show a specific message.
                if (!walletAddress) {
                    setIsLoading(false); // Stop loading, we know the reason.
                }
                return; // Exit the function early.
            }

            setIsLoading(true);
            setError(null);
            console.log(`MyPredictionsPage: Fetching stakes for user ${walletAddress} on chain ${chainId}...`);

            try {
                const nextMarketIdBN = await predictionMarketContract.nextMarketId();
                const totalMarkets = nextMarketIdBN.toNumber();

                if (totalMarkets === 0) {
                    setMyStakedMarkets([]);
                    setIsLoading(false);
                    return;
                }
                
                const marketDetailsPromises = [];
                for (let i = 0; i < totalMarkets; i++) {
                    marketDetailsPromises.push(
                        // We get both the market details and the user's specific stake in one go
                        Promise.all([
                            predictionMarketContract.getMarketStaticDetails(i),
                            predictionMarketContract.getUserStakeInMarket(i, walletAddress)
                        ])
                    );
                }

                const results = await Promise.all(marketDetailsPromises);
                console.log("MyPredictionsPage: Fetched all market and stake data.", results);

                const stakedMarkets = results
                    .map(([marketDetails, userStake]) => {
                        const hasStake = userStake.stakeYes.gt(0) || userStake.stakeNo.gt(0);
                        // Only process and keep markets where the user has a stake
                        if (marketDetails.exists && hasStake) {
                            const displayProps = getMarketDisplayProperties(marketDetails);
                            // Add the user's stake to the object for display
                            return {
                                ...displayProps,
                                userStakeYes: userStake.stakeYes.toString(),
                                userStakeNo: userStake.stakeNo.toString()
                            };
                        }
                        return null;
                    })
                    .filter(market => market !== null) // Filter out the nulls (markets with no stake)
                    .sort((a, b) => parseInt(b.id) - parseInt(a.id)); // Newest first

                console.log("MyPredictionsPage: Filtered down to markets user has staked on:", stakedMarkets);
                setMyStakedMarkets(stakedMarkets);

            } catch (err) {
                console.error("MyPredictionsPage: Failed to fetch user predictions:", err);
                setError(err.message || "An error occurred while fetching your predictions.");
            } finally {
                setIsLoading(false);
            }
        };

        fetchMyStakes();

    // The dependency array is the key to stopping the loop.
    // This effect will ONLY re-run if the contract object or wallet address changes.
    }, [predictionMarketContract, walletAddress, chainId]);

    const renderContent = () => {
        if (isLoading) {
            return <LoadingSpinner message="Loading your predictions..." />;
        }
        if (!walletAddress) {
            return <p className="no-markets-message">Please connect your wallet to see your predictions.</p>;
        }
        if (error) {
            return <ErrorMessage title="Error Loading Predictions" message={error} />;
        }
        if (myStakedMarkets.length === 0) {
            return (
                <div className="no-markets-message">
                    <p>You have not placed any bets on this network yet.</p>
                    <Link to="/predictions" className="button">View Open Markets</Link>
                </div>
            );
        }
        return (
            <div className="market-grid">
                {myStakedMarkets.map(market => (
                    <MarketCard key={market.id} market={market} showUserStake={true} />
                ))}
            </div>
        );
    };

    return (
        <div className="page-container prediction-list-page">
            <div className="market-list-header">
                <h2 className="section-title">My Predictions</h2>
                <Link to="/predictions" className="button secondary">← Back to All Markets</Link>
            </div>
            {renderContent()}
        </div>
    );
}

export default MyPredictionsPage;


    