import React, { useState, useEffect, useContext, useMemo } from 'react';
import { Link } from 'react-router-dom'; // If you link back or to market details
import { WalletContext } from '../context/WalletProvider';
import MarketCard from '../components/predictions/MarketCard'; // Reuse your MarketCard
import LoadingSpinner from '../components/common/LoadingSpinner';
import ErrorMessage from '../components/common/ErrorMessage';
import { 
    getMarketDisplayProperties, 
    MarketState as MarketStateEnumFromUtil 
} from '../utils/marketutils.js'; // Assuming this path is correct
import './PredictionMarketsListPage.css'; // Can reuse similar styling

const MarketState = MarketStateEnumFromUtil;

function RecentlyResolvedPage() {
    const { contract: predictionContractInstance, provider } = useContext(WalletContext);
    const [resolvedMarkets, setResolvedMarkets] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchMarkets = async () => {
            if (!predictionContractInstance) {
                setIsLoading(false);
                setError("Prediction contract not available. Please connect your wallet or try again.");
                return;
            }
            setIsLoading(true);
            setError(null);
            try {
                const nextIdBigNumber = await predictionContractInstance.nextMarketId();
                const nextId = Number(nextIdBigNumber);
                if (nextId === 0) {
                    setResolvedMarkets([]);
                    setIsLoading(false);
                    return;
                }

                const marketPromises = [];
                for (let i = 0; i < nextId; i++) {
                    marketPromises.push(predictionContractInstance.getMarketStaticDetails(i));
                }
                const marketsDetailsArray = await Promise.all(marketPromises);
                
                const oneMonthAgo = new Date();
                oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
                const oneMonthAgoTimestamp = Math.floor(oneMonthAgo.getTime() / 1000);

                const processedMarkets = marketsDetailsArray
                    .map((detailsArray, index) => {
                        // Assuming getMarketStaticDetails returns an array-like object
                        // Adjust parsing if your contract returns an object with named properties directly
                        if (!detailsArray || typeof detailsArray[10] === 'undefined' || !detailsArray[10]) return null; // Check exists flag

                        return {
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
                            creationTimestamp: detailsArray.length > 12 ? Number(detailsArray[12]) : 0,
                            oracleDecimals: 8 // Default
                        };
                    })
                    .filter(market => {
                        if (!market) return false;
                        const resolvedStates = [
                            MarketState.Resolved_YesWon, MarketState.Resolved_NoWon, MarketState.Resolved_Push,
                            MarketState.ResolvedEarly_YesWon, MarketState.ResolvedEarly_NoWon
                        ];
                        // Filter for resolved markets within the last month
                        return resolvedStates.includes(market.state) && market.resolutionTimestamp >= oneMonthAgoTimestamp;
                    })
                    .map(market => ({
                        ...market,
                        ...getMarketDisplayProperties(market) // Apply display properties
                    }))
                    .sort((a, b) => (b.resolutionTimestamp || 0) - (a.resolutionTimestamp || 0)); // Sort by most recently resolved

                setResolvedMarkets(processedMarkets);

            } catch (e) {
                console.error("Error fetching resolved markets:", e);
                setError("Failed to load recently resolved markets.");
            }
            setIsLoading(false);
        };

        fetchMarkets();
    }, [predictionContractInstance, provider]); // Re-fetch if contract instance changes

    return (
        <div className="page-container recently-resolved-page"> {/* Use a specific class if needed */}
            <h2>Recently Resolved Markets (Last 30 Days)</h2>

            {isLoading && <LoadingSpinner message="Loading recently resolved markets..." />}
            {error && <ErrorMessage title="Error" message={error} />}
            
            {!isLoading && resolvedMarkets.length === 0 && (
                <p>No markets have been resolved in the last 30 days.</p>
            )}

            <div className="market-list"> {/* Reuse market-list style */}
                 {displayableMarkets.map(market => (
        <MarketCard key={market.id} market={market} />
              
                ))}
            </div>
            <div style={{ textAlign: 'center', marginTop: '20px' }}>
                <Link to="/predictions" className="button secondary">View Open Markets</Link>
            </div>
        </div>
    );
}

export default RecentlyResolvedPage;

