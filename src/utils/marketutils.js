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
    switch (state) {
        case MarketState.Open: return 'Open';
        case MarketState.Closed_AwaitingResolution: return 'Closed';
        default: return 'Resolved';
    }
}

// --- THIS IS THE FINAL, ROBUST VERSION ---
export function formatToUTC(timestamp) {
    // Check for invalid, null, or zero timestamps before processing
    if (!timestamp || typeof timestamp !== 'number' || timestamp === 0) {
        return 'N/A';
    }
    try {
        // Multiply by 1000 because JavaScript Date uses milliseconds
        return new Date(timestamp * 1000).toLocaleString('en-US', {
            year: 'numeric', month: 'short', day: 'numeric',
            hour: 'numeric', minute: '2-digit', timeZone: 'UTC', timeZoneName: 'short'
        });
    } catch (e) {
        console.error("Error formatting timestamp:", timestamp, e);
        return 'Invalid Date';
    }
}

// --- THIS IS THE FINAL, ROBUST VERSION ---
export function getMarketIcon(assetSymbol) {
    const defaultIcon = '/images/icons/default-icon.svg'; 
    if (!assetSymbol || typeof assetSymbol !== 'string') return defaultIcon;

    const lowerCaseSymbol = assetSymbol.toLowerCase();

    // Check for specific, non-crypto event keywords FIRST
    if (lowerCaseSymbol.includes('trump') || lowerCaseSymbol.includes('election')) {
        return '/images/icons/trump-icon.svg';
    }

    // Now, check for cryptocurrency symbols
    if (lowerCaseSymbol.includes('btc')) {
        return '/images/icons/btc-icon.svg';
    }
    if (lowerCaseSymbol.includes('eth') || lowerCaseSymbol.includes('ethereum')) {
        return '/images/icons/eth-icon.svg';
    }
    if (lowerCaseSymbol.includes('sol')) {
        return '/images/icons/sol-icon.svg';
    }
    if (lowerCaseSymbol.includes('xrp')) {
        return '/images/icons/xrp-icon.svg';
    }
    
    // If no other match is found, return the default
    return defaultIcon;
}

// This function takes the raw market data from the contract and adds useful properties for the UI
// src/utils/marketutils.js

export function getMarketDisplayProperties(market) {
    if (!market || typeof market.id === 'undefined') {
        console.error("getMarketDisplayProperties received an invalid market object.");
        return null;
    }

    try {
        // ... (keep the existing destructuring and title/targetDisplay logic) ...
        const { id, assetSymbol, targetPrice, expiryTimestamp, state, totalStakedYes, totalStakedNo } = market;
        const safeAssetSymbol = assetSymbol || '';
        let title = `Market #${id}`;
        if (safeAssetSymbol) {
            title = safeAssetSymbol.replace(/_/g, ' ').replace(/PRICE ABOVE/g, 'Above').replace(/ABOVE YES/g, 'Up or Down');
        }
        // ... (targetDisplay logic remains the same) ...

        const totalStakedYesBN = ethers.BigNumber.from(totalStakedYes || '0');
        const totalStakedNoBN = ethers.BigNumber.from(totalStakedNo || '0');
        const totalPoolBN = totalStakedYesBN.add(totalStakedNoBN);

        // --- THIS IS THE NEW PROBABILITY CALCULATION LOGIC ---
        let yesProbability = 50;
        let noProbability = 50;

        if (!totalPoolBN.isZero()) {
            // Calculate probability using a scale for precision
            const scale = 10000; // Calculate up to 2 decimal places (e.g., 75.25%)
            const yesProbRaw = totalStakedYesBN.mul(scale).div(totalPoolBN);
            yesProbability = yesProbRaw.toNumber() / (scale / 100); // Convert to a percentage
            noProbability = 100 - yesProbability;
        }
        
        return {
            ...market, 
            title,
            targetDisplay,
            expiryString: formatToUTC(expiryTimestamp),
            statusString: getStatusString(state),
            statusClassName: `status-${getStatusString(state).toLowerCase()}`,
            
            // We no longer need to return the totalPool string
            // Instead, we return the calculated probabilities
            yesProbability: yesProbability.toFixed(0), // Return as a whole number string e.g. "75"
            noProbability: noProbability.toFixed(0), // e.g. "25"
        };

    } catch (e) {
        console.error(`Error processing market ID ${market.id} in getMarketDisplayProperties:`, e);
        return { ...market, title: `Error processing Market #${market.id}`, yesProbability: 0, noProbability: 0 }; 
    }
}