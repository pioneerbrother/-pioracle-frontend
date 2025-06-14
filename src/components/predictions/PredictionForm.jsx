// src/components/predictions/PredictionForm.jsx
import React, { useState, useContext } from 'react';
import { ethers } from 'ethers';
import { WalletContext } from '../../pages/WalletProvider';
import './PredictionForm.css';

// This component is now simpler and trusts the props it's given.
function PredictionForm({
    marketId,
    onBetPlaced,
    marketTarget,
    isEventMarket,
    tokenSymbol // <-- It will now use this prop
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
        // ... (The handleSubmit logic remains the same, no changes needed here)
    };

    return (
        <div className="prediction-form-container">
            <h3>Make Your Prediction</h3>
            <form onSubmit={handleSubmit} className="prediction-form">
                <div className="form-group">
                    {/* It now uses the tokenSymbol prop directly */}
                    <label htmlFor={`stakeAmount-${marketId}`}>Your Stake ({tokenSymbol})</label>
                    <input
                        type="number"
                        id={`stakeAmount-${marketId}`}
                        value={stakeAmount}
                        onChange={(e) => setStakeAmount(e.target.value)}
                        placeholder="e.g., 0.1"
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
                <button type="submit" disabled={isLoading}>
                    {isLoading ? "Submitting..." : "Submit Prediction"}
                </button>
                {message.text && <p className={`form-message type-${message.type}`}>{message.text}</p>}
            </form>
        </div>
    );
}

export default PredictionForm;