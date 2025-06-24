// src/components/predictions/MarketOddsDisplay.jsx
import React from 'react';
import { ethers } from 'ethers'; // Ensure this is v5: ethers.utils
import './MarketOddsDisplay.css'; 

function MarketOddsDisplay({ 
    // --- FIX: Correct prop names ---
    totalStakedYes, 
    totalStakedNo,
    // --- END OF FIX ---
    tokenSymbol 
}) {
    // --- ADD THE LOGS WE DISCUSSED TO VERIFY PROPS ---
    console.log("MarketOddsDisplay PROPS RECEIVED:", { 
        totalStakedYes, 
        totalStakedNo, 
        tokenSymbol 
    });
    // --- END OF LOG ---

    // Use the corrected prop names here
    const sYes = ethers.BigNumber.from(totalStakedYes || '0');
    const sNo = ethers.BigNumber.from(totalStakedNo || '0');
    const totalPool = sYes.add(sNo);

    let oddsYes = "N/A", oddsNo = "N/A";
    let probYes = 50, probNo = 50; // Default for display before calculation
    
    if (totalPool.isZero()) {
        oddsYes = "First Bet?";
        oddsNo = "First Bet?";
        // Probabilities remain 50/50 if pool is zero
    } else {
        const scale = ethers.utils.parseUnits("1", 18); // For v5
        
        if (!sYes.isZero()) {
            const oddsYesRaw = totalPool.mul(scale).div(sYes);
            oddsYes = `${parseFloat(ethers.utils.formatUnits(oddsYesRaw, 18)).toFixed(2)}x Payout`;
        } else {
            oddsYes = "∞ Payout"; 
        }

        if (!sNo.isZero()) {
            const oddsNoRaw = totalPool.mul(scale).div(sNo);
            oddsNo = `${parseFloat(ethers.utils.formatUnits(oddsNoRaw, 18)).toFixed(2)}x Payout`;
        } else {
            oddsNo = "∞ Payout";
        }

        // Probabilities based on relative stake
        // To avoid division by zero if totalPool is not zero but one stake is, handle explicitly
        if (!sYes.isZero() && !sNo.isZero()) {
            probYes = parseFloat((sYes.mul(10000).div(totalPool)).toString()) / 100;
            probNo = parseFloat((sNo.mul(10000).div(totalPool)).toString()) / 100;

            // Ensure they sum to 100 and handle potential floating point inaccuracies
            const probSum = probYes + probNo;
            if (probSum > 0 && probSum !== 100) {
                 // A simple normalization, can be improved for precision
                probYes = (probYes / probSum) * 100;
                probNo = (probNo / probSum) * 100;
            }
            probYes = Math.round(probYes);
            probNo = 100 - probYes; // Ensure they sum to 100

        } else if (sYes.isZero() && !sNo.isZero()) {
            probYes = 0;
            probNo = 100;
        } else if (!sYes.isZero() && sNo.isZero()) {
            probYes = 100;
            probNo = 0;
        }
        // If both are zero, it's handled by the initial 50/50
    }

    return (
        <div className="market-odds-display-container-v2">
            <h3>Current Market Probabilities</h3>
            <div className="odds-grid-v2">
                <div className="odds-card option-yes">
                    <div className="card-label">Outcome: YES</div>
                    <div className="probability-value">{probYes}%</div>
                    <div className="payout-value">{oddsYes}</div>
                    <div className="pool-value">Pool: {ethers.utils.formatUnits(sYes, 18)} {tokenSymbol}</div>
                </div>
                <div className="odds-card option-no">
                    <div className="card-label">Outcome: NO</div>
                    <div className="probability-value">{probNo}%</div>
                    <div className="payout-value">{oddsNo}</div>
                    <div className="pool-value">Pool: {ethers.utils.formatUnits(sNo, 18)} {tokenSymbol}</div>
                </div>
            </div>
        </div>
    );
}

export default MarketOddsDisplay;