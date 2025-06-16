// src/components/predictions/MarketOddsDisplay.jsx
import React from 'react';
import { ethers } from 'ethers';
import './MarketOddsDisplay.css'; // We'll update this CSS next

function MarketOddsDisplay({ 
    totalStakedYesNet, 
    totalStakedNoNet,
    tokenSymbol 
}) {
    const sYes = ethers.BigNumber.from(totalStakedYesNet || '0');
    const sNo = ethers.BigNumber.from(totalStakedNoNet || '0');
    const totalPool = sYes.add(sNo);

    // --- NEW PROBABILITY & ODDS CALCULATION LOGIC ---
    let oddsYes = "N/A", oddsNo = "N/A";
    let probYes = 50, probNo = 50;
    
    if (totalPool.isZero()) {
        oddsYes = "First Bet?";
        oddsNo = "First Bet?";
    } else {
        const scale = ethers.utils.parseUnits("1", 18);
        
        // Calculate YES side
        if (!sYes.isZero()) {
            const oddsYesRaw = totalPool.mul(scale).div(sYes);
            oddsYes = `${parseFloat(ethers.utils.formatUnits(oddsYesRaw, 18)).toFixed(2)}x Payout`;
            
            const probYesRaw = sNo.mul(10000).div(totalPool);
            probYes = (probYesRaw.toNumber() / 100).toFixed(0);
        } else {
            oddsYes = "∞ Payout"; // Infinite payout if no one has bet yet
            probYes = 0;
        }

        // Calculate NO side
        if (!sNo.isZero()) {
            const oddsNoRaw = totalPool.mul(scale).div(sNo);
            oddsNo = `${parseFloat(ethers.utils.formatUnits(oddsNoRaw, 18)).toFixed(2)}x Payout`;

            const probNoRaw = sYes.mul(10000).div(totalPool);
            probNo = (probNoRaw.toNumber() / 100).toFixed(0);
        } else {
            oddsNo = "∞ Payout";
            probNo = 0;
        }

        // Adjust if one pool is empty
        if(sYes.isZero()) probNo = 100;
        if(sNo.isZero()) probYes = 100;
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