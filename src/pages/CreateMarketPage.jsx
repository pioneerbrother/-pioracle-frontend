// src/pages/CreateMarketPage.jsx
import React, { useState, useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ethers } from 'ethers';
import { WalletContext } from './WalletProvider';
import ConnectWalletButton from '../components/common/ConnectWalletButton';
import LoadingSpinner from '../components/common/LoadingSpinner';
import ErrorMessage from '../components/common/ErrorMessage';
import './CreateMarketPage.css';

function CreateMarketPage() {
    const { walletAddress, contract, signer, nativeTokenSymbol } = useContext(WalletContext);
    const navigate = useNavigate();
    const [marketQuestion, setMarketQuestion] = useState('');
    const [expiryDate, setExpiryDate] = useState('');
    const [expiryTime, setExpiryTime] = useState('23:59');
    const [resolutionDetails, setResolutionDetails] = useState('');
    const [listingFeeDisplay, setListingFeeDisplay] = useState('Loading...');
    const [listingFeeWei, setListingFeeWei] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState('');
    
    const assetSymbol = marketQuestion.trim().toUpperCase().replace(/[?]/g, '').replace(/ /g, '_').replace(/[^A-Z0-9_]/g, '').substring(0, 60);

    useEffect(() => {
        if (!contract) {
            setListingFeeDisplay('...');
            return;
        }

        const fetchFee = async () => {
            setSubmitError('');
            try {
                // --- THIS IS THE FINAL FIX: Using the correct function name from the ABI ---
                const feeInWei = await contract.marketCreationListingFee();
                // --- END OF FIX ---
                
                setListingFeeWei(feeInWei);
                setListingFeeDisplay(`${ethers.formatEther(feeInWei)} ${nativeTokenSymbol || ''}`);
            } catch (e) {
                console.error("Error fetching listing fee:", e);
                setSubmitError("Could not load market listing fee. Please ensure you are on the correct network.");
                setListingFeeDisplay('Error');
            }
        };

        fetchFee();
    }, [contract, nativeTokenSymbol]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!signer || !contract) {
            setSubmitError("Please connect your wallet and ensure you are on the correct network.");
            return;
        }

        setIsSubmitting(true);
        setSubmitError('');
        try {
            const fullExpiryString = `${expiryDate}T${expiryTime}:00Z`;
            const expiryTimestamp = Math.floor(new Date(fullExpiryString).getTime() / 1000);

            if (isNaN(expiryTimestamp) || expiryTimestamp * 1000 < Date.now()) throw new Error("Invalid or past expiry date.");
            
            const tx = await contract.connect(signer).createUserMarket(
                assetSymbol, ethers.ZeroAddress, ethers.toBigInt(1), expiryTimestamp, true, 0, { value: listingFeeWei }
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
                <div className="page-centered"><p>Please connect your wallet to create a market.</p><ConnectWalletButton /></div>
            ) : (
                <form onSubmit={handleSubmit} className="create-market-form">
                    <div className="form-group">
                        <label htmlFor="marketQuestion">Market Question (This will be the exact title)</label>
                        <input type="text" id="marketQuestion" value={marketQuestion} onChange={(e) => setMarketQuestion(e.target.value)} placeholder="e.g., Will PiOracle have over 500 users on BNB Chain by August 1st?" required maxLength={100} />
                    </div>
                    <div className="form-group"><label>On-Chain Asset Symbol (Auto-Generated)</label><input type="text" value={assetSymbol} readOnly disabled /></div>
                    <div className="form-group form-group-inline">
                        <div><label htmlFor="expiryDate">Betting Closes On (UTC)</label><input type="date" id="expiryDate" value={expiryDate} onChange={e => setExpiryDate(e.target.value)} required /></div>
                        <div><label htmlFor="expiryTime">At (UTC Time)</label><input type="time" id="expiryTime" value={expiryTime} onChange={e => setExpiryTime(e.target.value)} required /></div>
                    </div>
                    <div className="form-group"><label htmlFor="resolutionDetails">Resolution Details & Source of Truth</label><textarea id="resolutionDetails" value={resolutionDetails} placeholder="Explain how this market will be resolved and what data source will be used." onChange={e => setResolutionDetails(e.target.value)} required /></div>
                    <p className="fee-label">Market Listing Fee: <strong>{listingFeeDisplay}</strong></p>
                    <button type="submit" disabled={isSubmitting || !listingFeeWei || !signer}>{isSubmitting ? <LoadingSpinner /> : `Create Market & Pay Fee`}</button>
                    {submitError && <ErrorMessage message={submitError} />}
                </form>
            )}
        </div>
    );
}

export default CreateMarketPage;