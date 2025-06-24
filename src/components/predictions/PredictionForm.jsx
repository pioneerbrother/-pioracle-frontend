// src/components/predictions/PredictionForm.jsx
import React, { useState, useContext } from 'react';
import { ethers } from 'ethers';
import { WalletContext } from '../../pages/WalletProvider';
import './PredictionForm.css'; // Make sure this import is here

function PredictionForm({
    marketId,
    onBetPlaced,
    marketTarget,
    isEventMarket,
    tokenSymbol
}) {
    const { signer, contract } = useContext(WalletContext);
    const [stakeAmount, setStakeAmount] = useState('');
    const [predictedOutcome, setPredictedOutcome] = useState('YES');
    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState({ text: '', type: '' });

    const yesLabel = isEventMarket ? "Predict: YES" : `Predict: YES`;
    const noLabel = isEventMarket ? "Predict: NO" : `Predict: NO`;

    const handleSubmit = async (e) => {
        e.preventDefault();
        setMessage({ text: '', type: '' });
        if (!signer || !contract) { return; }
        if (!stakeAmount || parseFloat(stakeAmount) <= 0) {
            setMessage({ text: 'Please enter a valid stake amount.', type: 'error' });
            return;
        }
        
        setIsLoading(true);
        try {
           const amountInWei = ethers.utils.parseUnits(stakeAmount, 18); // Ethers v5
            const predictYesBool = predictedOutcome === 'YES';
            const tx = await contract.connect(signer).placeBet(marketId, predictYesBool, { value: amountInWei });
            setMessage({ text: `Submitting... Tx: ${tx.hash.substring(0,10)}...`, type: 'info' });
            await tx.wait(1); // Wait for 1 confirmation

            // --- ADD DELAY HERE ---
            console.log("PredictionForm: Bet confirmed on-chain. Waiting 3 seconds before triggering UI refresh...");
            setTimeout(() => {
                console.log("PredictionForm: 3-second delay finished. Calling onBetPlaced.");
                setMessage({ text: 'Bet placed successfully! Refreshing market data...', type: 'success' });
                setStakeAmount(''); 
                if (onBetPlaced) onBetPlaced(); // This calls setRefreshKey in MarketDetailPage
            }, 3000); // 3000 milliseconds = 3 seconds
            // --- END OF DELAY ---

        } catch (err) {
            const reason = err.reason || err.message || "An unknown error occurred.";
            setMessage({ text: `Error: ${reason}`, type: 'error' });
        }
        setIsLoading(false);
    };

    const canSubmit = !isLoading && stakeAmount && parseFloat(stakeAmount) > 0;

    return (
        <div className="prediction-form-card">
            <h3 className="form-title">Make Your Prediction</h3>
            <form onSubmit={handleSubmit}>
                <div className="form-group">
                    <label htmlFor={`stakeAmount-${marketId}`}>Your Stake ({tokenSymbol})</label>
                    <input
                        type="number"
                        id={`stakeAmount-${marketId}`}
                        value={stakeAmount}
                        onChange={(e) => setStakeAmount(e.target.value)}
                        placeholder="e.g., 0.1"
                        min="0"
                        step="any"
                        required
                        className="form-input"
                    />
                </div>

                <div className="form-group">
                    <label>Choose Your Predicted Outcome:</label>
                    <div className="radio-group">
                        <label className="radio-option">
                            <input type="radio" name={`prediction-${marketId}`} value="YES" checked={predictedOutcome === 'YES'} onChange={() => setPredictedOutcome('YES')} />
                            <span className="radio-text">{yesLabel}</span>
                        </label>
                        <label className="radio-option">
                            <input type="radio" name={`prediction-${marketId}`} value="NO" checked={predictedOutcome === 'NO'} onChange={() => setPredictedOutcome('NO')} />
                            <span className="radio-text">{noLabel}</span>
                        </label>
                    </div>
                </div>
                
                <button type="submit" disabled={!canSubmit} className="submit-button">
                    {isLoading ? "Submitting..." : "Submit Prediction"}
                </button>

                {message.text && (
                    <div className={`form-message ${message.type}`}>
                        {message.text}
                    </div>
                )}
            </form>
        </div>
    );
}

export default PredictionForm;