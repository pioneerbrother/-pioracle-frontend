// pioracle/src/hooks/useBettingEligibility.js
import { useMemo } from 'react';
import { ethers } from 'ethers';

/**
 * Custom hook to determine if betting options (YES/NO) should be enabled or disabled
 * based on the current live oracle price for price-feed markets.
 *
 * @param {boolean} isEventMarket - True if the market is an event-based market (not price-feed).
 * @param {object} currentOraclePriceData - Object containing { price: BigNumber, decimals: number } or null.
 * @param {ethers.BigNumber | string | null} marketTargetPriceBN - The market's target price, already scaled as a BigNumber (or string convertible to one).
 * @returns {object} - An object { disableYes: boolean, disableNo: boolean, reason: string, livePriceFormatted: string | null }
 */
export const useBettingEligibility = (isEventMarket, currentOraclePriceData, marketTargetPriceBNInput) => {
    const eligibility = useMemo(() => {
        if (isEventMarket || !currentOraclePriceData || !currentOraclePriceData.price || !marketTargetPriceBNInput) {
            return {
                disableYes: false,
                disableNo: false,
                reason: '',
                livePriceFormatted: null,
                isCheckApplicable: false // Indicates if the price check logic was even run
            };
        }

        try {
            const livePriceBN = ethers.BigNumber.from(currentOraclePriceData.price);
            const targetPriceBN = ethers.BigNumber.from(marketTargetPriceBNInput);
            const livePriceDecimals = currentOraclePriceData.decimals;

            let disableYes = false;
            let disableNo = false;
            let reason = '';

            const formattedLivePrice = parseFloat(ethers.utils.formatUnits(livePriceBN, livePriceDecimals));
            // Assuming targetPriceBN is scaled like the oracle price (e.g., 8 decimals for BTC/USD)
            // For display, we format it. Comparison is done with BigNumbers.
            const formattedTargetPrice = parseFloat(ethers.utils.formatUnits(targetPriceBN, livePriceDecimals));


            // If current price is already >= target, betting YES is "unfair" / too certain
            if (livePriceBN.gte(targetPriceBN)) {
                disableYes = true;
                reason = `Current price ($${formattedLivePrice.toFixed(2)}) already meets or exceeds target ($${formattedTargetPrice.toFixed(2)}). Predicting 'YES' is not a valid risk.`;
            }

            // If current price is already < target, betting NO is "unfair" / too certain
            if (livePriceBN.lt(targetPriceBN)) {
                disableNo = true;
                const noReason = `Current price ($${formattedLivePrice.toFixed(2)}) is already below target ($${formattedTargetPrice.toFixed(2)}). Predicting 'NO' is not a valid risk.`;
                reason = reason ? `${reason} ${noReason}` : noReason; // Append if both conditions are met (should not happen with strict gte/lt logic unless price = target)
            }
            
            // Refined logic for clarity:
            // If livePrice >= targetPrice, YES is the "certain" outcome to bet on, so disable YES.
            // If livePrice < targetPrice, NO is the "certain" outcome to bet on, so disable NO.
            // This seems more direct than the above. Let's retry the disable flags:

            disableYes = false;
            disableNo = false;
            reason = '';

            if (livePriceBN.gte(targetPriceBN)) {
                disableYes = true;
                reason = `Current price ($${formattedLivePrice.toFixed(2)}) already meets or exceeds the target. 'YES' option disabled.`;
            }
            // Only disable NO if YES is not already disabled by the GTE condition.
            // This handles the case where price == target. If price == target, YES is "decided", NO is not.
            if (livePriceBN.lt(targetPriceBN)) {
                disableNo = true;
                reason = `Current price ($${formattedLivePrice.toFixed(2)}) is below the target. 'NO' option disabled.`;
            }


            return {
                disableYes,
                disableNo,
                reason,
                livePriceFormatted: formattedLivePrice.toFixed(livePriceDecimals === 8 ? 2 : livePriceDecimals), // Show 2 decimal for 8-decimal feeds like BTC
                isCheckApplicable: true
            };

        } catch (e) {
            console.error("Error in useBettingEligibility:", e);
            return {
                disableYes: false,
                disableNo: false,
                reason: 'Error checking live price eligibility.',
                livePriceFormatted: null,
                isCheckApplicable: true // Still applicable, but errored
            };
        }
    }, [isEventMarket, currentOraclePriceData, marketTargetPriceBNInput]);

    return eligibility;
};