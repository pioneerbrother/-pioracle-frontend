import React, { useState, useEffect, useContext } from 'react';
import { useParams } from 'react-router-dom';
import { WalletContext } from './WalletProvider';
import MarketDetailPage from './MarketDetailPage'; // We will render the actual page from here
import LoadingSpinner from '../components/common/LoadingSpinner';
import ErrorMessage from '../components/common/ErrorMessage';

function MarketDetailLoader() {
    const { marketId } = useParams();
    const { contract, walletAddress } = useContext(WalletContext);

    // State for this loader component
    const [marketData, setMarketData] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        // The guard clause: Do not run if the contract is not ready.
        if (!contract) {
            setIsLoading(true);
            return;
        }

        const fetchMarket = async () => {
            setIsLoading(true);
            setError('');
            try {
                // Now we are certain the contract exists when we call this.
                const data = await contract.getMarketStaticDetails(marketId);
                if (!data || !data.exists) {
                    throw new Error(`Market #${marketId} not found.`);
                }
                setMarketData(data); // Store the raw data from the contract
            } catch (err) {
                console.error(`Failed to load market #${marketId}:`, err);
                setError(err.message);
            } finally {
                setIsLoading(false);
            }
        };

        fetchMarket();
    // Re-run whenever the contract is ready or the user navigates to a new marketId
    }, [contract, marketId]);

    // Render loading or error states
    if (isLoading) {
        return <div className="page-container"><LoadingSpinner message={`Loading Market #${marketId}...`} /></div>;
    }

    if (error) {
        return <div className="page-container"><ErrorMessage title="Error" message={error} /></div>;
    }

    // If data is loaded successfully, render the actual page component
    // and pass the data down as a prop.
    return <MarketDetailPage marketContractData={marketData} />;
}

export default MarketDetailLoader;