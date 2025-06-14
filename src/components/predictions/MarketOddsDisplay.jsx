// src/components/predictions/MarketOddsDisplay.jsx
import React from 'react';
import { ethers } from 'ethers';
import './MarketOddsDisplay.css';

// This component is now simpler. It only displays data it receives via props.
function MarketOddsDisplay({
    totalStakedYesNet,
    totalStakedNoNet,
    marketTarget,
    isEventMarket,
    tokenSymbol // <-- It will now use this prop
}) {
    const sYes = ethers.BigNumber.from(totalStakedYesNet || '0');
    const sNo = ethers.BigNumber.from(totalStakedNoNet || '0');
    const totalPool = sYes.add(sNo);

    const calculateOdds = (stakeOnSide) => {
        if (stakeOnSide.isZero() || totalPool.isZero()) return "First Bet?";
        const scale = ethers.utils.parseUnits("1", 18);
        const rawOdds = totalPool.mul(scale).div(stakeOnSide);
        return `${parseFloat(ethers.utils.formatUnits(rawOdds, 18)).toFixed(2)}x`;
    };

    const oddsYes = calculateOdds(sYes);
    const oddsNo = calculateOdds(sNo);
    
    const yesLabel = isEventMarket ? "Outcome: YES" : `Price ≥ ${marketTarget}`;
    const noLabel = isEventMarket ? "Outcome: NO" : `Price < ${marketTarget}`;

    return (
        <div className="market-odds-display-container">
            <h3>Current Market State</h3>
            <div className="odds-grid">
                <div className="odds-option option-yes">
                    <div className="odds-label">{yesLabel}</div>
                    <div className="odds-value">{oddsYes}</div>
                    <div className="pool-size">
                        Pool: {ethers.utils.formatUnits(sYes, 18)} {tokenSymbol}
                    </div>
                </div>
                <div className="odds-option option-no">
                    <div className="odds-label">{noLabel}</div>
                    <div className="odds-value">{oddsNo}</div>
                    <div className="pool-size">
                        Pool: {ethers.utils.formatUnits(sNo, 18)} {tokenSymbol}
                    </div>
                </div>
            </div>
        </div>
    );
}

export default MarketOddsDisplay;