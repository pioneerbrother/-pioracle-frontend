// pioracle/src/components/predictions/PredictionForm.jsx
import React, { useState, useContext, useEffect, useMemo } from 'react';
import { ethers } from 'ethers';
import { WalletContext } from '../../context/WalletProvider'; // Adjust path as needed
import { useBettingEligibility } from '../../hooks/useBettingEligibility'; // Import the hook
import './PredictionForm.css'; // Make sure you have this CSS file for styling

// Helper function to get native token symbol (can be moved to utils or WalletContext)
const getNativeTokenSymbol = (chainIdHex) => {
    if (chainIdHex) {
        // Ensure chainIdHex is treated as hex if it's not already prefixed
        const hexChainId = chainIdHex.startsWith('0x') ? chainIdHex : `0x${chainIdHex}`;
        try {
            const targetChainIdNum = parseInt(hexChainId, 16);
            if (targetChainIdNum === 80002 || targetChainIdNum === 137) return "MATIC"; // Amoy or Polygon Mainnet
            if (targetChainIdNum === 1 || targetChainIdNum === 5 || targetChainIdNum === 11155111) return "ETH"; // Mainnet, Goerli, Sepolia
            // Add more mappings as needed
        } catch (e) {
            console.warn("Could not parse chainIdHex for native token symbol:", chainIdHex, e);
        }
    }
    return "ETH"; // Default
};


function PredictionForm({
    marketId,
    onBetPlaced,         // Callback function after a bet is successfully placed
    marketTarget,        // Descriptive target string (e.g., "$111,000") for display in labels
    assetSymbol,         // Asset symbol string (e.g., "BTCUSD_PRICE_ABOVE...")
    currentOraclePriceData, // Prop: { price: BigNumber, decimals: number } | null
    isFetchingOraclePrice,  // Prop: boolean, true if live oracle price is being fetched
    marketTargetPrice,      // Prop: The contract's targetPrice (BigNumber or string convertible to BigNumber)
    isEventMarket           // Prop: boolean, true if it's an event market
}) {
    const { walletAddress, signer, contract, loadedTargetChainIdHex } = useContext(WalletContext);
    const [stakeAmount, setStakeAmount] = useState('');
    const [predictedOutcome, setPredictedOutcome] = useState('YES'); // Default prediction
    const [isLoading, setIsLoading] = useState(false); // For bet submission loading state
    const [message, setMessage] = useState({ text: '', type: '' }); // For displaying messages to the user

    const nativeToken = useMemo(() => getNativeTokenSymbol(loadedTargetChainIdHex), [loadedTargetChainIdHex]);

    // Use the custom hook to determine bet eligibility
    const {
        disableYes,
        disableNo,
        reason: eligibilityReason,
        livePriceFormatted: formattedLiveOraclePrice,
        isCheckApplicable
    } = useBettingEligibility(isEventMarket, currentOraclePriceData, marketTargetPrice);

    // Effect to auto-adjust predicted outcome if the default choice becomes disabled
    useEffect(() => {
        if (predictedOutcome === 'YES' && disableYes && !disableNo) {
            setPredictedOutcome('NO');
        } else if (predictedOutcome === 'NO' && disableNo && !disableYes) {
            setPredictedOutcome('YES');
        }
        // If both are disabled (e.g. due to an error in the hook), no change.
    }, [disableYes, disableNo, predictedOutcome]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setMessage({ text: '', type: '' }); // Clear previous messages

        if (!walletAddress || !signer || !contract) {
            setMessage({ text: 'Please connect your wallet to place a bet.', type: 'error' });
            return;
        }
        if (!stakeAmount || parseFloat(stakeAmount) <= 0) {
            setMessage({ text: 'Please enter a valid stake amount.', type: 'error' });
            return;
        }
        // Double-check if the selected outcome is disabled before submitting
        if ((predictedOutcome === 'YES' && disableYes) || (predictedOutcome === 'NO' && disableNo)) {
             setMessage({ text: `Betting on '${predictedOutcome}' is currently not allowed. ${eligibilityReason}`, type: 'error' });
             return;
        }

        setIsLoading(true);
        try {
            const amountInWei = ethers.utils.parseUnits(stakeAmount, 18); // Assuming native token (MATIC/ETH) has 18 decimals
            const predictYesBool = predictedOutcome === 'YES';

            const contractWithSigner = contract.connect(signer);
            const tx = await contractWithSigner.placeBet(marketId, predictYesBool, { value: amountInWei });

            setMessage({ text: `Bet submission transaction sent: ${tx.hash.substring(0,10)}... Waiting for confirmation.`, type: 'info' });
            await tx.wait(1); // Wait for 1 block confirmation

            setMessage({ text: 'Bet placed successfully!', type: 'success' });
            setStakeAmount(''); // Clear stake amount input
            if (onBetPlaced) {
                onBetPlaced(); // Call parent callback (e.g., to refresh market data)
            }
        } catch (err) {
            console.error("Error placing bet:", err);
            // Try to get a more specific error message
            const reason = err.reason || err.data?.message || err.message || "Failed to place bet due to an unknown error.";
            setMessage({ text: `Error: ${reason}`, type: 'error' });
        }
        setIsLoading(false);
    };

    // Determine if the form can be submitted based on current selections and eligibility
    const canSubmitForm = !isLoading && stakeAmount && parseFloat(stakeAmount) > 0 &&
                          !((predictedOutcome === 'YES' && disableYes) || (predictedOutcome === 'NO' && disableNo));

    return (
        <div className="prediction-form-container">
            <h3>Make Your Prediction</h3>
            <form onSubmit={handleSubmit} className="prediction-form">
                {/* Stake Amount Input */}
                <div className="form-group">
                    <label htmlFor={`stakeAmount-${marketId}`}>Your Stake ({nativeToken})</label>
                    <input
                        type="number"
                        id={`stakeAmount-${marketId}`}
                        value={stakeAmount}
                        onChange={(e) => setStakeAmount(e.target.value)}
                        placeholder="e.g., 0.1"
                        min="0" // HTML5 validation for non-negative
                        step="any" // Allows decimal input
                        required
                        className="form-control"
                    />
                </div>

                {/* Outcome Selection */}
                <div className="form-group">
                    <label>Choose Your Predicted Outcome:</label>
                    <div className="radio-group">
                        <label htmlFor={`predictYes-${marketId}`} className={`radio-label ${disableYes ? 'disabled' : ''}`}>
                            <input
                                type="radio"
                                id={`predictYes-${marketId}`}
                                name={`prediction-${marketId}`}
                                value="YES"
                                checked={predictedOutcome === 'YES'}
                                onChange={() => setPredictedOutcome('YES')}
                                disabled={disableYes}
                            />
                            {` Predict: YES (Price will be ≥ ${marketTarget})`}
                        </label>
                        <label htmlFor={`predictNo-${marketId}`} className={`radio-label ${disableNo ? 'disabled' : ''}`}>
                            <input
                                type="radio"
                                id={`predictNo-${marketId}`}
                                name={`prediction-${marketId}`}
                                value="NO"
                                checked={predictedOutcome === 'NO'}
                                onChange={() => setPredictedOutcome('NO')}
                                disabled={disableNo}
                            />
                            {` Predict: NO (Price will be < ${marketTarget})`}
                        </label>
                    </div>
                </div>

                {/* Informational Messages related to live price and eligibility */}
                {isFetchingOraclePrice && <p className="info-message small-text">Fetching live price...</p>}
                {isCheckApplicable && formattedLiveOraclePrice && !isEventMarket && (
                    <p className="info-message small-text live-price-info">
                        Current approx. {assetSymbol?.split('_')[0]} Price: ${formattedLiveOraclePrice}
                    </p>
                )}
                {isCheckApplicable && eligibilityReason && !isEventMarket && (
                    <p className="warning-message small-text" style={{ marginTop: '5px', color: 'orange' }}>
                        Note: {eligibilityReason}
                    </p>
                )}

                <button
                    type="submit"
                    disabled={!canSubmitForm}
                    className="button primary submit-prediction-button"
                >
                    {isLoading ? "Submitting..." : "Submit Prediction"}
                </button>

                {/* General messages (success/error from submission) */}
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