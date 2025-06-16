// src/utils/marketutils.js
import { ethers } from 'ethers';

export const MarketState = {
    Open: 0,
    Closed_AwaitingResolution: 1,
    Resolved_YesWon: 2,
    Resolved_NoWon: 3,
    Resolved_Push: 4,
    ResolvedEarly_YesWon: 5,
    ResolvedEarly_NoWon: 6,
};

export function getStatusString(state) {
    // ... (this function is likely fine, but we'll include it for completeness)
    switch (state) {
        case MarketState.Open: return 'Open';
        case MarketState.Closed_AwaitingResolution: return 'Closed';
        default: return 'Resolved';
    }
}

export function formatToUTC(timestamp) {
    if (!timestamp || timestamp === 0) return 'N/A';
    try {
        return new Date(timestamp * 1000).toLocaleString('en-US', {
            year: 'numeric', month: 'short', day: 'numeric',
            hour: 'numeric', minute: '2-digit', timeZone: 'UTC', timeZoneName: 'short'
        });
    } catch (e) {
        return 'Invalid Date';
    }
}

export function getMarketDisplayProperties(market) {
    // --- THIS IS THE KEY FIX ---
    // 1. Add a guard clause at the very beginning.
    if (!market || typeof market.id === 'undefined') {
        console.error("getMarketDisplayProperties received an invalid or null market object.");
        return null; // Return null to signify an invalid object
    }

    try {
        const { id, assetSymbol, targetPrice, expiryTimestamp, state, nativeTokenSymbol, totalStakedYes, totalStakedNo } = market;
        
        // 2. Add safety checks for any property you use.
        const safeAssetSymbol = assetSymbol || ''; // Default to empty string if undefined

        let title = `Market #${id}`;
        // Use the assetSymbol for the title if it exists
        if (safeAssetSymbol) {
            title = safeAssetSymbol.replace(/_/g, ' ').replace(/PRICE ABOVE/g, 'Above');
        }

        let targetDisplay = "Event Specific";
        // Check if it's a price market before trying to format the price
        if (safeAssetSymbol.toLowerCase().includes('price_above')) {
            const formattedPrice = parseFloat(ethers.utils.formatUnits(targetPrice || '0', 8)).toLocaleString('en-US', {
                style: 'currency',
                currency: 'USD',
            });
            targetDisplay = formattedPrice;
        }

        const totalStakedYesBN = ethers.BigNumber.from(totalStakedYes || '0');
        const totalStakedNoBN = ethers.BigNumber.from(totalStakedNo || '0');
        const totalPoolBN = totalStakedYesBN.add(totalStakedNoBN);
        
        return {
            ...market, // Return all original properties
            title,
            targetDisplay,
            expiryString: formatToUTC(expiryTimestamp),
            statusString: getStatusString(state),
            statusClassName: `status-${getStatusString(state).toLowerCase()}`,
            totalPool: ethers.utils.formatUnits(totalPoolBN, 18),
            nativeTokenSymbol: nativeTokenSymbol || 'MATIC',
        };

    } catch (e) {
        console.error(`Error processing market ID ${market.id} in getMarketDisplayProperties:`, e);
        return { ...market, title: `Error processing Market #${market.id}` }; // Return gracefully
    }
}
// src/utils/marketutils.js

// ... (keep your other functions like getMarketDisplayProperties)

// --- ADD THIS NEW FUNCTION ---
export function getMarketIcon(title) {
    // Use a default icon for generic markets
    const defaultIcon = '/images/icons/default-icon.svg'; 
    if (!title || typeof title !== 'string') return defaultIcon;

    const lowerCaseTitle = title.toLowerCase();

    if (lowerCaseTitle.includes('btc') || lowerCaseTitle.includes('bitcoin')) {
        return '/images/icons/btc-icon.svg';
    }
    if (lowerCaseTitle.includes('eth') || lowerCaseTitle.includes('ethereum')) {
        return '/images/icons/eth-icon.svg';
    }
    if (lowerCaseTitle.includes('sol') || lowerCaseTitle.includes('solana')) {
        return '/images/icons/sol-icon.svg';
    }
    if (lowerCaseTitle.includes('xrp')) {
        return '/images/icons/xrp-icon.svg';
    }
    if (lowerCaseTitle.includes('trump') || lowerCaseTitle.includes('election')) {
        return '/images/icons/politics-icon.svg';
    }
    // Add more rules as you create new market types

    return defaultIcon;
}