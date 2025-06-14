// src/components/predictions/PredictionForm.jsx
import React, { useState, useContext } from 'react';
import { ethers } from 'ethers';
import { WalletContext } from '../../pages/WalletProvider';
import './PredictionForm.css';

function PredictionForm({
    marketId,
    onBetPlaced,
    marketTarget,
    isEventMarket,
    tokenSymbol
}) {
    const { walletAddress, signer, contract } = useContext(WalletContext);
    const [stakeAmount, setStakeAmount] = useState('');
    const [predictedOutcome, setPredictedOutcome] = useState('YES');
    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState({ text: '', type: '' });

    const yesLabel = isEventMarket ? "Predict: YES" : `Predict: YES (Price will be ≥ ${marketTarget})`;
    const noLabel = isEventMarket ? "Predict: NO" : `Predict: NO (Price will be < ${marketTarget})`;

    const handleSubmit = async (e) => {
        e.preventDefault();
        setMessage({ text: '', type: '' });

        // Backup guard clauses
        if (!walletAddress || !signer || !contract) {
            setMessage({ text: 'Please connect your wallet.', type: 'error' });
            return;
        }
        if (!stakeAmount || parseFloat(stakeAmount) <= 0) {
            setMessage({ text: 'Please enter a stake amount greater than zero.', type: 'error' });
            return;
        }
        
        setIsLoading(true);
        try {
            const amountInWei = ethers.utils.parseUnits(stakeAmount, 18);
            const predictYesBool = predictedOutcome === 'YES';

            const tx = await contract.connect(signer).placeBet(marketId, predictYesBool, { value: amountInWei });
            
            setMessage({ text: `Bet submitted... waiting for confirmation.`, type: 'info' });
            await tx.wait(1);

            setMessage({ text: 'Bet placed successfully!', type: 'success' });
            setStakeAmount(''); 
            if (onBetPlaced) onBetPlaced();
        } catch (err) {
            const reason = err.reason || err.message || "An unknown error occurred.";
            setMessage({ text: `Error: ${reason}`, type: 'error' });
        }
        setIsLoading(false);
    };

    // --- THIS IS THE KEY FIX ---
    // This variable continuously checks if the form is in a valid state to be submitted.
    const canSubmit = !isLoading && stakeAmount && parseFloat(stakeAmount) > 0;

    return (
        <div className="prediction-form-container">
            <h3>Make Your Prediction</h3>
            <form onSubmit={handleSubmit} className="prediction-form">
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
                    />
                </div>
                <div className="form-group">
                    <label>Choose Your Predicted Outcome:</label>
                    <div className="radio-group">
                        <label htmlFor={`predictYes-${marketId}`}>
                            <input type="radio" id={`predictYes-${marketId}`} value="YES" checked={predictedOutcome === 'YES'} onChange={() => setPredictedOutcome('YES')} />
                            {yesLabel}
                        </label>
                        <label htmlFor={`predictNo-${marketId}`}>
                            <input type="radio" id={`predictNo-${marketId}`} value="NO" checked={predictedOutcome === 'NO'} onChange={() => setPredictedOutcome('NO')} />
                            {noLabel}
                        </label>
                    </div>
                </div>
                {/* The button's disabled state is now tied to the 'canSubmit' variable */}
                <button type="submit" disabled={!canSubmit}>
                    {isLoading ? "Submitting..." : "Submit Prediction"}
                </button>
                {message.text && <p className={`form-message type-${message.type}`}>{message.text}</p>}
            </form>
        </div>
    );
}

export default PredictionForm;