// pioracle/src/hooks/useBettingEligibility.js
import { useMemo } from 'react';
import { ethers } from 'ethers';

export const useBettingEligibility = (isEventMarket, currentOraclePriceData, marketTargetPriceBNInput, marketAssetSymbol) => {
    const eligibility = useMemo(() => {
        // Default: both enabled, no specific reason initially
        let defaultReturn = {
            disableYes: false,
            disableNo: false,
            reason: '',
            livePriceFormatted: null,
            isCheckApplicable: false
        };

        if (isEventMarket || !currentOraclePriceData || !currentOraclePriceData.price || !marketTargetPriceBNInput || !marketAssetSymbol) {
            return defaultReturn;
        }

        try {
            const livePriceBN = ethers.BigNumber.from(currentOraclePriceData.price);
            const targetPriceBN = ethers.BigNumber.from(marketTargetPriceBNInput);
            const livePriceDecimals = currentOraclePriceData.decimals;

            let disableYes = false;
            let disableNo = false;
            let reason = '';

            const formattedLivePrice = parseFloat(ethers.utils.formatUnits(livePriceBN, livePriceDecimals)).toFixed(2); // Format early for messages
            const formattedTargetPrice = parseFloat(ethers.utils.formatUnits(targetPriceBN, livePriceDecimals)).toFixed(2); // Assuming same decimals for display

            // Determine market type from symbol (e.g., PRICE_ABOVE or PRICE_BELOW)
            // For now, we'll assume your current markets are primarily PRICE_ABOVE
            const isPriceAboveMarket = marketAssetSymbol.includes("_PRICE_ABOVE_");
            // const isPriceBelowMarket = marketAssetSymbol.includes("_PRICE_BELOW_"); // For future expansion

            if (isPriceAboveMarket) {
                // Market question: "Will Price be >= Target?"
                // "YES" means Price >= Target
                // "NO" means Price < Target

                if (livePriceBN.gte(targetPriceBN)) {
                    // Current price ALREADY meets the "YES" condition.
                    disableYes = true;
                    reason = `Current price ($${formattedLivePrice}) already meets or exceeds the target ($${formattedTargetPrice}). 'YES' option disabled.`;
                }
                // "NO" option remains enabled unless a separate condition for it exists (not in this market type usually)

            }
            /*  // Example for handling PRICE_BELOW markets if you add them:
            else if (isPriceBelowMarket) {
                // Market question: "Will Price be < Target?"
                // "YES" means Price < Target
                // "NO" means Price >= Target

                if (livePriceBN.lt(targetPriceBN)) {
                    // Current price ALREADY meets the "YES" condition for a "below" market.
                    disableYes = true;
                    reason = `Current price ($${formattedLivePrice}) is already below the target ($${formattedTargetPrice}). 'YES' option (predicting below) disabled.`;
                }
            }
            */
            else {
                // If symbol type is unknown or not price-based for this logic, don't disable
                return defaultReturn;
            }


            return {
                disableYes,
                disableNo, // disableNo will remain false for PRICE_ABOVE markets based on this logic
                reason,
                livePriceFormatted: formattedLivePrice,
                isCheckApplicable: true
            };

        } catch (e) {
            console.error("Error in useBettingEligibility:", e);
            return {
                ...defaultReturn,
                reason: 'Error checking live price eligibility.',
                isCheckApplicable: true
            };
        }
    }, [isEventMarket, currentOraclePriceData, marketTargetPriceBNInput, marketAssetSymbol]);

    return eligibility;
};