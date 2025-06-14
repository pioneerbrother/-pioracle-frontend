// src/components/predictions/MarketOddsDisplay.jsx
import React, { useContext, useMemo } from 'react';
import { ethers } from 'ethers';
import { WalletContext } from '../../pages/WalletProvider';
import './MarketOddsDisplay.css';

const TOKEN_DECIMALS = 18;

function MarketOddsDisplay({ 
    totalStakedYesNet, 
    totalStakedNoNet, 
    marketTarget, 
    isEventMarket // <-- The new, essential prop
}) {
    const { loadedTargetChainIdHex } = useContext(WalletContext) || {};

    const nativeTokenSymbol = useMemo(() => {
        if (loadedTargetChainIdHex) {
            const id = parseInt(loadedTargetChainIdHex, 16);
            if (id === 137 || id === 80002) return "MATIC";
        }
        return "ETH";
    }, [loadedTargetChainIdHex]);

    const sYes = ethers.BigNumber.from(totalStakedYesNet || '0');
    const sNo = ethers.BigNumber.from(totalStakedNoNet || '0');
    const totalPool = sYes.add(sNo);

    const calculateOdds = (stakeOnSide) => {
        if (stakeOnSide.isZero() || totalPool.isZero()) {
            return "First Bet?";
        }
        const scale = ethers.utils.parseUnits("1", TOKEN_DECIMALS);
        const rawOdds = totalPool.mul(scale).div(stakeOnSide);
        return `${parseFloat(ethers.utils.formatUnits(rawOdds, TOKEN_DECIMALS)).toFixed(2)}x`;
    };

    const oddsYes = calculateOdds(sYes);
    const oddsNo = calculateOdds(sNo);
    
    // --- THIS IS THE NEW, SIMPLER LABEL LOGIC ---
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
                        Pool: {ethers.utils.formatUnits(sYes, TOKEN_DECIMALS)} {nativeTokenSymbol}
                    </div>
                </div>
                <div className="odds-option option-no">
                    <div className="odds-label">{noLabel}</div>
                    <div className="odds-value">{oddsNo}</div>
                    <div className="pool-size">
                        Pool: {ethers.utils.formatUnits(sNo, TOKEN_DECIMALS)} {nativeTokenSymbol}
                    </div>
                </div>
            </div>
        </div>
    );
}

export default MarketOddsDisplay;