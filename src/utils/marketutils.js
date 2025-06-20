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

// ... (getStatusString and getMarketIcon functions remain the same as the last correct version) ...

export function getStatusString(state) {
    switch (state) {
        case MarketState.Open: return 'Open';
        case MarketState.Closed_AwaitingResolution: return 'Closed';
        default: return 'Resolved';
    }
}

export function formatToUTC(timestamp) {
    if (!timestamp || typeof timestamp !== 'number' || timestamp === 0) {
        return 'N/A';
    }
    try {
        return new Date(timestamp * 1000).toLocaleString('en-US', {
            year: 'numeric', month: 'short', day: 'numeric',
            hour: 'numeric', minute: '2-digit', timeZone: 'UTC', timeZoneName: 'short'
        });
    } catch (e) {
        return 'Invalid Date';
    }
}


// src/utils/marketutils.js

export function getMarketIcon(assetSymbol) {
    const defaultIcon = '/images/icons/default-icon.svg'; 
    if (!assetSymbol || typeof assetSymbol !== 'string') return defaultIcon;

    const lowerCaseSymbol = assetSymbol.toLowerCase();

    // --- THIS IS THE CORRECT, COMBINED LOGIC ---
    // Check for ANY of the politics-related keywords in a single "if" statement.
    if (lowerCaseSymbol.includes('trump') || 
        lowerCaseSymbol.includes('election') ||
        lowerCaseSymbol.includes('us_') || 
        lowerCaseSymbol.includes('iran') ||
        lowerCaseSymbol.includes('strike')) {
            // It will return your correct icon file.
            return '/images/icons/trump1-icon.svg'; 
    }

    // If it's not a politics market, THEN check for cryptocurrencies.
    if (lowerCaseSymbol.includes('btc')) return '/images/icons/btc-icon.svg';
    if (lowerCaseSymbol.includes('eth') || lowerCaseSymbol.includes('ethereum')) return '/images/icons/eth-icon.svg';
    if (lowerCaseSymbol.includes('sol')) return '/images/icons/sol-icon.svg';
    if (lowerCaseSymbol.includes('xrp')) return '/images/icons/xrp-icon.svg';
    
    // If no matches are found at all, return the default icon.
    return defaultIcon;
}


// --- THIS IS THE FINAL, CORRECTED VERSION OF THIS FUNCTION ---
export function getMarketDisplayProperties(market) {
    if (!market || typeof market.id === 'undefined') {
        console.error("getMarketDisplayProperties received an invalid market object.");
        return null;
    }

    // Define default values outside the try block to ensure they always exist
    let title = `Market #${market.id}`;
    let targetDisplay = "Event Specific";
    let expiryString = "N/A";
    let statusString = "Unknown";
    let yesProbability = 50;
    let noProbability = 50;

    try {
        const { assetSymbol, targetPrice, expiryTimestamp, state, totalStakedYes, totalStakedNo } = market;
        
        const safeAssetSymbol = assetSymbol || '';
        if (safeAssetSymbol) {
            title = safeAssetSymbol.replace(/_/g, ' ').replace(/PRICE ABOVE/g, 'Above').replace(/ABOVE YES/g, 'Up or Down');
        }

        if (safeAssetSymbol.toLowerCase().includes('price_above')) {
            const oracleDecimals = market.oracleDecimals || 8;
            const formattedPrice = parseFloat(ethers.utils.formatUnits(targetPrice || '0', oracleDecimals)).toLocaleString('en-US', {
                style: 'currency', currency: 'USD'
            });
            targetDisplay = formattedPrice;
        }

        const totalStakedYesBN = ethers.BigNumber.from(totalStakedYes || '0');
        const totalStakedNoBN = ethers.BigNumber.from(totalStakedNo || '0');
        const totalPoolBN = totalStakedYesBN.add(totalStakedNoBN);

        if (!totalPoolBN.isZero()) {
            const scale = 10000;
            const yesProbRaw = totalStakedYesBN.mul(scale).div(totalPoolBN);
            yesProbability = yesProbRaw.toNumber() / (scale / 100);
            noProbability = 100 - yesProbability;
        }

        // Update status and expiry strings only if successful
        expiryString = formatToUTC(expiryTimestamp);
        statusString = getStatusString(state);
        
    } catch (e) {
        console.error(`Error processing market ID ${market.id} in getMarketDisplayProperties:`, e);
        // If an error occurs, the title will be an error message
        title = `Error processing Market #${market.id}`;
    }

    // Return a complete object using the calculated or default values
    return {
        ...market, 
        title,
        targetDisplay,
        expiryString,
        statusString,
        statusClassName: `status-${statusString.toLowerCase()}`,
        yesProbability: yesProbability.toFixed(0),
        noProbability: noProbability.toFixed(0),
    };
}