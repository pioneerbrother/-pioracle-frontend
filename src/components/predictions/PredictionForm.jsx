// pioracle/src/components/predictions/PredictionForm.jsx
import React, { useState, useContext, useEffect, useMemo, useCallback } from 'react'; // Added useCallback
import { ethers } from 'ethers';
import { WalletContext } from '../../context/WalletProvider'; // Ensure path is correct
import './PredictionForm.css'; // Create this CSS file for styling

// Props: marketId, onBetPlaced (callback), marketTarget (for labels), assetSymbol (for labels)
function PredictionForm({ marketId, onBetPlaced, marketTarget, assetSymbol }) {
    const { 
        signer, 
        walletAddress, 
        contract: predictionContractInstance,
        loadedTargetChainIdHex 
    } = useContext(WalletContext) || {}; // Default to empty object
    
    const [stakeAmount, setStakeAmount] = useState("");
    const [predictsYes, setPredictsYes] = useState(true); // true for YES/Above, false for NO/Below
    const [isProcessing, setIsProcessing] = useState(false);
    const [message, setMessage] = useState({ text: "", type: "info" });

    const PredictionForm = () => {
  const [messageForForm, setMessageForForm] = useState(''); // Add this line
  
  const placeBet = async () => {
    try {
      // ... betting logic ...
    } catch (error) {
      setMessageForForm("Bet failed: " + error.message); // Now this will work
    }
  };
};

    // Top-level log to see when form renders and with what props
    useEffect(() => {
        console.log("PredictionForm RENDERED or Props Updated. Props:", { marketId, marketTarget, assetSymbol });
    }, [marketId, marketTarget, assetSymbol]);

    // Determine native token symbol based on network from context
    const nativeTokenSymbol = useMemo(() => {
        if (loadedTargetChainIdHex) {
            const targetChainIdNum = parseInt(loadedTargetChainIdHex, 16);
            if (targetChainIdNum === 80002) return "MATIC";
                   if (targetChainIdNum === 137) return "MATIC";  // Polygon Mainnet
        
              
            
            // Add other network checks if needed (e.g., mainnets)
        }
        return "ETH"; // Default for local Hardhat or unknown
    }, [loadedTargetChainIdHex]);

    // Determine labels for the betting options dynamically
    const outcomeYesLabel = assetSymbol?.includes("PRICE_ABOVE") 
        ? `Predict: Price ≥ ${marketTarget}` 
        : "Predict: YES";
    const outcomeNoLabel = assetSymbol?.includes("PRICE_ABOVE") 
        ? `Predict: Price < ${marketTarget?.replace('$', '')}` 
        : "Predict: NO";

    // Effect to clear form message and reset stake/selection when marketId changes
    useEffect(() => {
        setMessage({ text: "", type: "info" });
        setStakeAmount("");
        setPredictsYes(true); // Default to YES outcome when market changes
        console.log(`PredictionForm: Cleared form for new Market ID: ${marketId}`);
    }, [marketId]);

    // Define handleSubmitBet using useCallback
    const handleSubmitBet = useCallback(async (e) => {
        e.preventDefault();
        setMessage({ text: "", type: "info" }); // Clear previous message immediately

        if (!signer || !walletAddress || !predictionContractInstance) {
            setMessage({ text: "Wallet not properly connected or contract not ready. Please connect and try again.", type: "error" });
            return;
        }
        if (!stakeAmount || isNaN(parseFloat(stakeAmount)) || parseFloat(stakeAmount) <= 0) {
            setMessage({ text: `Please enter a valid stake amount > 0 ${nativeTokenSymbol}.`, type: "error" });
            return;
        }

        setIsProcessing(true);
        setMessage({ text: "Preparing your prediction transaction...", type: "info" });

        try {
            const stakeInWei = ethers.utils.parseUnits(stakeAmount, 18); 
            console.log(
                `PredictionForm: Placing prediction on Market ID: ${marketId}, PredictsYes: ${predictsYes}, Amount (${nativeTokenSymbol}): ${stakeAmount}, Wei: ${stakeInWei.toString()}`
            );

            const contractWithSigner = predictionContractInstance.connect(signer);
            const tx = await contractWithSigner.placeBet(
                marketId,       
                predictsYes,    
                { value: stakeInWei } 
            );
            
            console.log("PredictionForm: Bet Transaction FULL HASH:", tx.hash); 
            setMessage({ text: `Transaction Sent (TxHash: ${tx.hash.substring(0, 10)}...). Waiting for confirmation...`, type: "info" });
            
            const receipt = await tx.wait(1);
            console.log("PredictionForm: Transaction Confirmed. Receipt:", receipt);
            
            if (receipt.status === 1) {
                setMessage({ text: `Prediction placed successfully! (Tx: ${receipt.transactionHash.substring(0,10)}...)`, type: "success" });
                setStakeAmount(""); 
                if (typeof onBetPlaced === 'function') {
                    onBetPlaced(); 
                }
            } else {
                setMessage({ text: `Prediction transaction failed on-chain. Tx: ${receipt.transactionHash.substring(0,10)}...`, type: "error" });
                console.error("PredictionForm: Transaction reverted on-chain. Receipt:", receipt);
            }

        } catch (err) {
            console.error("PredictionForm: Error placing bet:", err);
            let readableError = "Transaction failed. Check console for details.";
            if (err.code === 4001) { readableError = "Transaction rejected by user."; }
            else if (err.reason) { readableError = err.reason; } 
            else if (err.data?.message) { readableError = err.data.message; } 
            else if (err.message) { readableError = err.message; }
            if (typeof readableError === 'string' && readableError.toLowerCase().includes("insufficient funds")) {
                readableError = `Insufficient funds for transaction (stake + gas in ${nativeTokenSymbol}).`;
            }
            setMessage({ text: `Prediction failed: ${readableError}`, type: "error" });
        }
        setIsProcessing(false);
    }, [
        signer, walletAddress, predictionContractInstance, marketId, 
        stakeAmount, predictsYes, nativeTokenSymbol, onBetPlaced 
    ]); // Dependencies for handleSubmitBet

    // This is the main JSX return for the form
    return (
        <form onSubmit={handleSubmitBet} className="prediction-form">
            <h4>Make Your Prediction</h4>
            <div className="form-group amount-input">
                <label htmlFor={`stakeAmount-${marketId}`}>Your Stake (Native Token e.g. {nativeTokenSymbol})</label>
                <input
                    id={`stakeAmount-${marketId}`}
                    type="text" 
                    value={stakeAmount}
                    onChange={(e) => {
                        const val = e.target.value;
                        if (val === "" || /^(0|[1-9]\d*)(\.\d*)?$/.test(val) || /^(0\.)$/.test(val) ) { 
                           setStakeAmount(val);
                        }
                    }}
                    placeholder="e.g., 0.1"
                    disabled={isProcessing}
                    required 
                    autoComplete="off"
                />
            </div>

            <div className="form-group side-selection">
                <fieldset>
                    <legend>Choose Your Predicted Outcome:</legend>
                    <label className={`radio-label ${predictsYes === true ? 'active' : ''}`}>
                        <input
                            type="radio"
                            name={`side-selection-${marketId}`}
                            value="true" 
                            checked={predictsYes === true}
                            onChange={() => setPredictsYes(true)}
                            disabled={isProcessing}
                        />
                        {outcomeYesLabel}
                    </label>
                    <label className={`radio-label ${predictsYes === false ? 'active' : ''}`}>
                        <input
                            type="radio"
                            name={`side-selection-${marketId}`}
                            value="false" 
                            checked={predictsYes === false}
                            onChange={() => setPredictsYes(false)}
                            disabled={isProcessing}
                        />
                        {outcomeNoLabel}
                    </label>
                </fieldset>
            </div>
            
            <button 
                type="submit" 
                className="button primary place-bet-btn"
                disabled={isProcessing || !stakeAmount || isNaN(parseFloat(stakeAmount)) || parseFloat(stakeAmount) <= 0}
            >
                {isProcessing ? "Submitting..." : `Submit Prediction`}
            </button>

            {message.text && (
                <p className={`form-message type-${message.type}`}> 
                    {message.text}
                </p>
            )}
        </form>
    );
}

export default PredictionForm;