// src/pages/CreateMarketPage.jsx
import React, { useState, useContext, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ethers } from 'ethers';
import { WalletContext } from './WalletProvider';
import ConnectWalletButton from '../components/common/ConnectWalletButton';
import LoadingSpinner from '../components/common/LoadingSpinner';
import ErrorMessage from '../components/common/ErrorMessage';
import './CreateMarketPage.css';

// Price feed data can be kept for when you use that market type
const SUPPORTED_PRICE_FEEDS = [
    { name: "Bitcoin (BTC/USD)", symbolPrefix: "BTCUSD", address: "0x...", decimals: 8 },
    { name: "Ethereum (ETH/USD)", symbolPrefix: "ETHUSD", address: "0x...", decimals: 8 },
];

function CreateMarketPage() {
    const { walletAddress, contract, signer } = useContext(WalletContext);
    const navigate = useNavigate();

    // Simplified State
    const [marketQuestion, setMarketQuestion] = useState('');
    const [expiryDate, setExpiryDate] = useState('');
    const [expiryTime, setExpiryTime] = useState('23:59');
    const [resolutionDetails, setResolutionDetails] = useState('');
    const [creatorFeePercent, setCreatorFeePercent] = useState("1.0");

    const [listingFeeDisplay, setListingFeeDisplay] = useState('...');
    const [listingFeeWei, setListingFeeWei] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState('');
    
    // Auto-generate the on-chain symbol from the market question
    const assetSymbol = marketQuestion
        .trim()
        .toUpperCase()
        .replace(/[?]/g, '') // Remove question marks for the symbol
        .replace(/ /g, '_')
        .replace(/[^A-Z0-9_]/g, '')
        .substring(0, 60);

    // Fetch listing fee from contract
    useEffect(() => {
        if (contract) {
            const fetchFee = async () => {
                try {
                    const feeInWei = await contract.marketCreationListingFee();
                    setListingFeeWei(feeInWei);
                    setListingFeeDisplay(`${ethers.utils.formatEther(feeInWei)} MATIC`);
                } catch (e) {
                    setSubmitError("Could not load market listing fee.");
                }
            };
            fetchFee();
        }
    }, [contract]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!signer || !contract) {
            setSubmitError("Please connect a wallet to create a market.");
            return;
        }

        setIsSubmitting(true);
        setSubmitError('');
        try {
            const fullExpiryString = `${expiryDate}T${expiryTime}:00Z`;
            const expiryTimestamp = Math.floor(new Date(fullExpiryString).getTime() / 1000);

            if (isNaN(expiryTimestamp) || expiryTimestamp * 1000 < Date.now()) {
                throw new Error("Invalid or past expiry date.");
            }
            
            const _creatorFeeBP = Math.round(parseFloat(creatorFeePercent) * 100);

            // For all user-created markets now, they are "Event Markets"
            const tx = await contract.connect(signer).createUserMarket(
                assetSymbol,
                ethers.constants.AddressZero, // priceFeedAddress
                ethers.BigNumber.from(1),    // targetPrice
                expiryTimestamp,
                true,                        // isEventMarket
                _creatorFeeBP,
                { value: listingFeeWei }
            );
            
            await tx.wait(1);
            navigate('/predictions');

        } catch (err) {
            const reason = err.reason || err.message || "An error occurred.";
            setSubmitError(`Failed to create market: ${reason}`);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="page-container create-market-page">
            <h2>Create Your Prediction Market</h2>
            
            {!walletAddress ? (
                <div className="page-centered">
                    <p>Please connect your wallet to create a market.</p>
                    <ConnectWalletButton /> 
                </div>
            ) : (
                <form onSubmit={handleSubmit} className="create-market-form">
                    <div className="form-group">
                        <label htmlFor="marketQuestion">Market Question (This will be the exact title)</label>
                        <input
                            type="text"
                            id="marketQuestion"
                            value={marketQuestion}
                            onChange={(e) => setMarketQuestion(e.target.value)}
                            placeholder="e.g., Will the US Strike Iran by JUL18?"
                            required
                            maxLength={100}
                        />
                        <small>This question will be displayed directly on the market card.</small>
                    </div>

                    <div className="form-group">
                        <label>On-Chain Asset Symbol (Auto-Generated)</label>
                        <input type="text" value={assetSymbol} readOnly disabled />
                    </div>

                    <div className="form-group form-group-inline">
                        <div>
                            <label htmlFor="expiryDate">Betting Closes On (UTC)</label>
                            <input type="date" id="expiryDate" value={expiryDate} onChange={e => setExpiryDate(e.target.value)} required />
                        </div>
                        <div>
                            <label htmlFor="expiryTime">At (UTC Time)</label>
                            <input type="time" id="expiryTime" value={expiryTime} onChange={e => setExpiryTime(e.target.value)} required />
                        </div>
                    </div>
                    
                    <div className="form-group">
                        <label htmlFor="resolutionDetails">Resolution Details & Source of Truth</label>
                        <textarea id="resolutionDetails" value={resolutionDetails} onChange={e => setResolutionDetails(e.target.value)} required />
                    </div>

                    <p>Market Listing Fee: <strong>{listingFeeDisplay}</strong></p>

                    <button type="submit" disabled={isSubmitting || !listingFeeWei}>
                        {isSubmitting ? <LoadingSpinner /> : `Create Market & Pay Fee`}
                    </button>

                    {submitError && <ErrorMessage message={submitError} />}
                </form>
            )}
        </div>
    );
}

export default CreateMarketPage;