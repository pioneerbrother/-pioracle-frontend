// pioracle/src/components/predictions/MarketOddsDisplay.jsx
import React, { useContext, useMemo } from 'react'; // Added useMemo and useContext
import { ethers } from 'ethers';
import { WalletContext } from '../../context/WalletProvider'; // Import WalletContext
import './MarketOddsDisplay.css';

const DISPLAY_DECIMALS = 3; // How many decimal places to show for amounts
const TOKEN_DECIMALS_NATIVE = 18; // ETH and MATIC both use 18 decimals

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
        return `${parseFloat(formattedAmount).toFixed(displayDecimalsParam)} ${tokenSymbolParam}`;
    } catch (e) {
        console.error("MarketOddsDisplay: Error formatting wei string:", weiString, e);
        return `Error ${tokenSymbolParam}`;
    }
};

function MarketOddsDisplay({ totalStakedYesNet, totalStakedNoNet, marketTarget, assetSymbol }) {
    const { loadedTargetChainIdHex } = useContext(WalletContext) || {};

    const currentNativeTokenSymbol = useMemo(() => {
        if (loadedTargetChainIdHex) {
            const targetChainIdNum = parseInt(loadedTargetChainIdHex, 16);
            if (targetChainIdNum === 80002) { // Amoy
                return "MATIC"; // Or "POL"
            }
            // Add other mainnet checks here if needed:
            // else if (targetChainIdNum === 137) { // Polygon Mainnet
            //     return "MATIC";
            // } else if (targetChainIdNum === 1) { // Ethereum Mainnet
            //     return "ETH";
            // }
        }
        return "ETH"; // Default for local Hardhat (chainId 31337) or unknown
    }, [loadedTargetChainIdHex]);

    const sA_bn = totalStakedYesNet ? ethers.BigNumber.from(totalStakedYesNet) : ethers.constants.Zero;
    const sB_bn = totalStakedNoNet ? ethers.BigNumber.from(totalStakedNoNet) : ethers.constants.Zero;

    let oddsForYes = "N/A";
    let oddsForNo = "N/A";
    const isFirstBet = sA_bn.isZero() && sB_bn.isZero();

    if (isFirstBet) {
        oddsForYes = "First Bet?";
        oddsForNo = "First Bet?";
    } else {
        const totalPool_bn = sA_bn.add(sB_bn);
        const scale = ethers.utils.parseUnits("1", TOKEN_DECIMALS_NATIVE);
        if (!sA_bn.isZero() && !totalPool_bn.isZero()) {
            const oddsRaw_bn = totalPool_bn.mul(scale).div(sA_bn);
            oddsForYes = `${parseFloat(ethers.utils.formatUnits(oddsRaw_bn, TOKEN_DECIMALS_NATIVE)).toFixed(2)}x`;
        } else if (!sA_bn.isZero() && sB_bn.isZero()) {
            oddsForYes = "1.00x";
        }
        if (!sB_bn.isZero() && !totalPool_bn.isZero()) {
            const oddsRaw_bn = totalPool_bn.mul(scale).div(sB_bn);
            oddsForNo = `${parseFloat(ethers.utils.formatUnits(oddsRaw_bn, TOKEN_DECIMALS_NATIVE)).toFixed(2)}x`;
        } else if (!sB_bn.isZero() && sA_bn.isZero()) {
            oddsForNo = "1.00x";
        }
    }

    const yesLabel = assetSymbol?.includes("PRICE_ABOVE") ? `Price ≥ ${marketTarget}` : "Outcome: YES";
    const noLabel = assetSymbol?.includes("PRICE_ABOVE") ? `Price < ${marketTarget?.replace('$', '')}` : "Outcome: NO";

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