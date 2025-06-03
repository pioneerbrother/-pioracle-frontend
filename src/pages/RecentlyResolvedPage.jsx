import React, { useState, useEffect, useContext, useMemo } from 'react';
import { Link } from 'react-router-dom'; // If you link back or to market details
import { WalletContext } from './WalletProvider'; 
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
    // const [resolvedMarkets, setResolvedMarkets] = useState([]); // OLD
    const [rawResolvedMarkets, setRawResolvedMarkets] = useState([]); // NEW: Store raw data
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchMarkets = async () => {
            if (!predictionContractInstance) { /* ... */ setIsLoading(false); return; }
            setIsLoading(true); setError(null);
            try {
                const nextIdBigNumber = await predictionContractInstance.nextMarketId();
                const nextId = Number(nextIdBigNumber);
                if (nextId === 0) { setRawResolvedMarkets([]); setIsLoading(false); return; }

                const marketPromises = [];
                for (let i = 0; i < nextId; i++) {
                    marketPromises.push(predictionContractInstance.getMarketStaticDetails(i));
                }
                const marketsDetailsArray = await Promise.all(marketPromises);
                
                const oneMonthAgo = new Date();
                oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
                const oneMonthAgoTimestamp = Math.floor(oneMonthAgo.getTime() / 1000);

                const processedMarkets = marketsDetailsArray
                    .map((detailsArray) => { /* ... your existing mapping to raw market objects ... */ 
                        if (!detailsArray || typeof detailsArray[10] === 'undefined' || !detailsArray[10]) return null;
                        return {
                            id: detailsArray[0].toString(), assetSymbol: detailsArray[1], priceFeedAddress: detailsArray[2],
                            targetPrice: detailsArray[3].toString(), expiryTimestamp: Number(detailsArray[4]),
                            resolutionTimestamp: Number(detailsArray[5]), totalStakedYesNet: detailsArray[6].toString(),
                            totalStakedNoNet: detailsArray[7].toString(), state: Number(detailsArray[8]),
                            actualOutcomeValue: detailsArray[9].toString(), exists: detailsArray[10],
                            isEventMarket: detailsArray[11], creationTimestamp: detailsArray.length > 12 ? Number(detailsArray[12]) : 0,
                            oracleDecimals: 8 
                        };
                    })
                    .filter(market => {
                        if (!market) return false;
                        const resolvedStates = [ /* ... resolved states ... */ 
                            MarketState.Resolved_YesWon, MarketState.Resolved_NoWon, MarketState.Resolved_Push,
                            MarketState.ResolvedEarly_YesWon, MarketState.ResolvedEarly_NoWon
                        ];
                        return resolvedStates.includes(market.state) && market.resolutionTimestamp >= oneMonthAgoTimestamp;
                    });
                setRawResolvedMarkets(processedMarkets); // Set raw filtered markets
            } catch (e) { /* ... error handling ... */ }
            setIsLoading(false);
        };
        if (predictionContractInstance) fetchMarkets(); // Fetch if contract is available
    }, [predictionContractInstance, provider]);

    // --- NEW: Create displayableMarkets using useMemo ---
    const displayableMarkets = useMemo(() => {
        if (!rawResolvedMarkets || rawResolvedMarkets.length === 0) return [];
        return rawResolvedMarkets
            .map(market => {
                try {
                    return { ...market, ...getMarketDisplayProperties(market) };
                } catch (e) {
                    console.error("Error processing market for display (getMarketDisplayProperties):", market, e);
                    return null;
                }
            })
            .filter(market => market !== null)
            .sort((a, b) => (b.resolutionTimestamp || 0) - (a.resolutionTimestamp || 0));
    }, [rawResolvedMarkets]);
    // --- END NEW ---


    if (isLoading) return <LoadingSpinner message="Loading recently resolved markets..." />;
    // ... (rest of the component before return, error handling, etc.) ...

    return (
        <div className="page-container recently-resolved-page">
            <h2>Recently Resolved Markets (Last 30 Days)</h2>
            {/* ... isLoading and error messages ... */}
            {!isLoading && !error && displayableMarkets.length === 0 && (
                <p>No markets have been resolved in the last 30 days.</p>
            )}
            <div className="market-list">
                {displayableMarkets.map(market => ( // <<< NOW USES 'displayableMarkets'
                    <MarketCard key={market.id} market={market} />
                ))}
            </div>
            {/* ... link back to open markets ... */}
        </div>
    );
}
export default RecentlyResolvedPage;