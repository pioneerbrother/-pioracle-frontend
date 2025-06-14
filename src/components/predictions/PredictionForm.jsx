// src/components/predictions/PredictionForm.jsx
import React, { useState, useContext, useEffect, useMemo } from 'react';
import { ethers } from 'ethers';
import { WalletContext } from '../../pages/WalletProvider';
// We assume this hook and CSS file exist and are correct
// import { useBettingEligibility } from '../../hooks/useBettingEligibility'; 
import './PredictionForm.css';

// This helper can be simplified as WalletProvider now provides the symbol directly
// But leaving it here as a robust fallback.
const getNativeTokenSymbol = (chainIdHex) => {
    if (chainIdHex) {
        const hexChainId = chainIdHex.startsWith('0x') ? chainIdHex : `0x${chainIdHex}`;
        try {
            const id = parseInt(hexChainId, 16);
            if (id === 137 || id === 80002) return "MATIC";
            return "ETH";
        } catch (e) { /* fallback */ }
    }
    return "ETH"; 
};


function PredictionForm({
    marketId,
    onBetPlaced,
    marketTarget,
    isEventMarket // This prop is now the key to our UI fix
}) {
    const { walletAddress, signer, contract, loadedTargetChainIdHex } = useContext(WalletContext);
    const [stakeAmount, setStakeAmount] = useState('');
    const [predictedOutcome, setPredictedOutcome] = useState('YES');
    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState({ text: '', type: '' });

    const nativeToken = useMemo(() => getNativeTokenSymbol(loadedTargetChainIdHex), [loadedTargetChainIdHex]);
    
    // --- THIS IS THE NEW LOGIC FOR DYNAMIC LABELS ---
    const yesLabel = isEventMarket ? "Predict: YES" : `Predict: YES (Price will be ≥ ${marketTarget})`;
    const noLabel = isEventMarket ? "Predict: NO" : `Predict: NO (Price will be < ${marketTarget})`;


    const handleSubmit = async (e) => {
        e.preventDefault();
        setMessage({ text: '', type: '' });

        if (!walletAddress || !signer || !contract) {
            setMessage({ text: 'Please connect your wallet.', type: 'error' });
            return;
        }
        if (!stakeAmount || parseFloat(stakeAmount) <= 0) {
            setMessage({ text: 'Please enter a valid stake amount.', type: 'error' });
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

    return (
        <div className="prediction-form-container">
            <h3>Make Your Prediction</h3>
            <form onSubmit={handleSubmit} className="prediction-form">
                <div className="form-group">
                    <label htmlFor={`stakeAmount-${marketId}`}>Your Stake ({nativeToken})</label>
                    <input
                        type="number"
                        id={`stakeAmount-${marketId}`}
                        value={stakeAmount}
                        onChange={(e) => setStakeAmount(e.target.value)}
                        placeholder="e.g., 0.1"
                        min="0"
                        step="any"
                        required
                        className="form-control"
                    />
                </div>

                <div className="form-group">
                    <label>Choose Your Predicted Outcome:</label>
                    <div className="radio-group">
                        <label htmlFor={`predictYes-${marketId}`} className="radio-label">
                            <input
                                type="radio"
                                id={`predictYes-${marketId}`}
                                name={`prediction-${marketId}`}
                                value="YES"
                                checked={predictedOutcome === 'YES'}
                                onChange={() => setPredictedOutcome('YES')}
                            />
                            {/* --- Use the new dynamic label --- */}
                            {yesLabel}
                        </label>
                        <label htmlFor={`predictNo-${marketId}`} className="radio-label">
                            <input
                                type="radio"
                                id={`predictNo-${marketId}`}
                                name={`prediction-${marketId}`}
                                value="NO"
                                checked={predictedOutcome === 'NO'}
                                onChange={() => setPredictedOutcome('NO')}
                            />
                            {/* --- Use the new dynamic label --- */}
                            {noLabel}
                        </label>
                    </div>
                </div>
                
                <button type="submit" disabled={isLoading} className="button primary submit-prediction-button">
                    {isLoading ? "Submitting..." : "Submit Prediction"}
                </button>

                {message.text && (
                    <p className={`form-message type-${message.type}`} style={{ marginTop: '10px' }}>
                        {message.text}
                    </p>
                )}
            </form>
        </div>
    );
}

export default PredictionForm;