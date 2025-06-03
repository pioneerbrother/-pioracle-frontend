// pioracle/src/components/predictions/MarketOddsDisplay.jsx
import React, { useContext, useMemo } from 'react';
import { ethers } from 'ethers';
import { WalletContext } from '../../pages/WalletProvider';
import './MarketOddsDisplay.css'; // Ensure this CSS file exists and is styled

const DISPLAY_DECIMALS = 3; 
const TOKEN_DECIMALS_NATIVE = 18; // For ETH and MATIC

// Helper function to format token amounts
const formatTokenAmount = (
    weiString,
    tokenDecimalsParam = TOKEN_DECIMALS_NATIVE,
    displayDecimalsParam = DISPLAY_DECIMALS,
    tokenSymbolParam // Will be passed in
) => {
    if (weiString === null || weiString === undefined || weiString.toString() === "0") {
        return `${parseFloat("0").toFixed(displayDecimalsParam)} ${tokenSymbolParam}`;
    }
    try {
        const formattedAmount = ethers.utils.formatUnits(weiString, tokenDecimalsParam);
        // Ensure it's a number before toFixed, then format
        const numAmount = parseFloat(formattedAmount);
        if (isNaN(numAmount)) return `Invalid Amount ${tokenSymbolParam}`;
        return `${numAmount.toFixed(displayDecimalsParam)} ${tokenSymbolParam}`;
    } catch (e) {
        console.error("MarketOddsDisplay: Error formatting wei string:", weiString, e);
        return `Error ${tokenSymbolParam}`;
    }
};

function MarketOddsDisplay({ totalStakedYesNet, totalStakedNoNet, marketTarget, assetSymbol }) {
    const { loadedTargetChainIdHex } = useContext(WalletContext) || {};

    // Determine current native token symbol based on network
    const currentNativeTokenSymbol = useMemo(() => {
        if (loadedTargetChainIdHex) {
            const targetChainIdNum = parseInt(loadedTargetChainIdHex, 16);
            if (targetChainIdNum === 80002) return "MATIC"; // Amoy
            if (targetChainIdNum === 137) return "MATIC";  // Polygon Mainnet
        }
        return "ETH"; // Default for local Hardhat (31337) or unknown
    }, [loadedTargetChainIdHex]);

    // Convert string props from marketDetails (which are in wei) to BigNumbers
    const sYes_bn = totalStakedYesNet ? ethers.BigNumber.from(totalStakedYesNet) : ethers.constants.Zero;
    const sNo_bn = totalStakedNoNet ? ethers.BigNumber.from(totalStakedNoNet) : ethers.constants.Zero;

    let oddsForYes = "N/A";
    let oddsForNo = "N/A";

    const isFirstBet = sYes_bn.isZero() && sNo_bn.isZero();

    if (isFirstBet) {
        oddsForYes = "First Bet?"; // Or "1.00x" if you prefer to show initial odds
        oddsForNo = "First Bet?";  // Or "1.00x"
    } else {
        const totalPool_bn = sYes_bn.add(sNo_bn);
        // Use a scaling factor for precision in division with BigNumbers
        const scale = ethers.utils.parseUnits("1", TOKEN_DECIMALS_NATIVE); // e.g., 10^18 

        if (!sYes_bn.isZero() && !totalPool_bn.isZero()) {
            // Odds for YES = Total Pool / Stake on YES
            // This calculates how many times your stake you get back (including your stake)
            const oddsYesRaw_bn = totalPool_bn.mul(scale).div(sYes_bn);
            oddsForYes = `${parseFloat(ethers.utils.formatUnits(oddsYesRaw_bn, TOKEN_DECIMALS_NATIVE)).toFixed(2)}x`;
        } else if (!sYes_bn.isZero() && sNo_bn.isZero()) {
            oddsForYes = "1.00x"; // Only money on this side, get stake back if wins
        }
        // If sYes_bn is zero but sNo_bn is not, oddsForYes remains "N/A" or could be "∞x" (harder to display)

        if (!sNo_bn.isZero() && !totalPool_bn.isZero()) {
            // Odds for NO = Total Pool / Stake on NO
            const oddsNoRaw_bn = totalPool_bn.mul(scale).div(sNo_bn);
            oddsForNo = `${parseFloat(ethers.utils.formatUnits(oddsNoRaw_bn, TOKEN_DECIMALS_NATIVE)).toFixed(2)}x`;
        } else if (!sNo_bn.isZero() && sYes_bn.isZero()) {
            oddsForNo = "1.00x"; // Only money on this side
        }
        // If sNo_bn is zero but sYes_bn is not, oddsForNo remains "N/A"
    }

    // Determine labels for the outcomes based on assetSymbol and marketTarget
    // These should match the labels used in PredictionForm for consistency
    const yesLabel = assetSymbol?.includes("PRICE_ABOVE") 
        ? `Price ≥ ${marketTarget}` 
        : "Outcome: YES";
    const noLabel = assetSymbol?.includes("PRICE_ABOVE") 
        ? `Price < ${marketTarget?.replace('$', '')}` // Simple $ removal, might need refinement
        : "Outcome: NO";

    return (
        <div className="market-odds-display-container">
            <h3>Current Market State</h3>
            <div className="odds-grid">
                <div className="odds-option option-yes">
                    <div className="odds-label">{yesLabel}</div>
                    <div className="odds-value">{oddsForYes}</div>
                    <div className="pool-size">
                        Pool: {formatTokenAmount(totalStakedYesNet, TOKEN_DECIMALS_NATIVE, DISPLAY_DECIMALS, currentNativeTokenSymbol)}
                    </div>
                </div>
                <div className="odds-option option-no">
                    <div className="odds-label">{noLabel}</div>
                    <div className="odds-value">{oddsForNo}</div>
                    <div className="pool-size">
                        Pool: {formatTokenAmount(totalStakedNoNet, TOKEN_DECIMALS_NATIVE, DISPLAY_DECIMALS, currentNativeTokenSymbol)}
                    </div>
                </div>
            </div>
        </div>
    );
}

export default MarketOddsDisplay;