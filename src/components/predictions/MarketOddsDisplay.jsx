// src/components/predictions/MarketOddsDisplay.jsx
import React from 'react';
import { ethers } from 'ethers';
import './MarketOddsDisplay.css'; 

function MarketOddsDisplay({ 
    totalStakedYes, 
    totalStakedNo,
    tokenSymbol 
}) {
    // The rest of your component's logic is fine.
    // It correctly uses the props it receives and does not need other imports.

    const sYes = ethers.BigNumber.from(totalStakedYes || '0');
    const sNo = ethers.BigNumber.from(totalStakedNo || '0');
    const totalPool = sYes.add(sNo);

    let oddsYes = "N/A", oddsNo = "N/A";
    let probYes = 50, probNo = 50;
    
    if (totalPool.isZero()) {
        oddsYes = "First Bet?";
        oddsNo = "First Bet?";
    } else {
        const scale = ethers.utils.parseUnits("1", 18);
        
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

        if (!sYes.isZero() && !sNo.isZero()) {
            probYes = parseFloat((sYes.mul(10000).div(totalPool)).toString()) / 100;
            probNo = 100 - probYes;
        } else if (sYes.isZero() && !sNo.isZero()) {
            probYes = 0;
            probNo = 100;
        } else if (!sYes.isZero() && sNo.isZero()) {
            probYes = 100;
            probNo = 0;
        }
    }

    return (
        <div className="market-odds-display-container-v2">
            <h3>Current Market Probabilities</h3>
            <div className="odds-grid-v2">
                <div className="odds-card option-yes">
                    <div className="card-label">Outcome: YES</div>
                    <div className="probability-value">{Math.round(probYes)}%</div>
                    <div className="payout-value">{oddsYes}</div>
                    <div className="pool-value">Pool: {ethers.utils.formatUnits(sYes, 18)} {tokenSymbol}</div>
                </div>
                <div className="odds-card option-no">
                    <div className="card-label">Outcome: NO</div>
                    <div className="probability-value">{Math.round(probNo)}%</div>
                    <div className="payout-value">{oddsNo}</div>
                    <div className="pool-value">Pool: {ethers.utils.formatUnits(sNo, 18)} {tokenSymbol}</div>
                </div>
            </div>
        </div>
    );
}

export default MarketOddsDisplay;