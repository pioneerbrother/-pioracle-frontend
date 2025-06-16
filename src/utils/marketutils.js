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
export function getMarketDisplayProperties(market) {
    if (!market || typeof market.id === 'undefined') {
        console.error("getMarketDisplayProperties received an invalid market object.");
        return null;
    }

    try {
        const { id, assetSymbol, targetPrice, expiryTimestamp, state, totalStakedYes, totalStakedNo } = market;
        
        const safeAssetSymbol = assetSymbol || '';
        let title = `Market #${id}`;
        if (safeAssetSymbol) {
            // A simple way to make the title more readable
            title = safeAssetSymbol.replace(/_/g, ' ').replace(/PRICE ABOVE/g, 'Above').replace(/ABOVE YES/g, 'Up or Down');
        }

        let targetDisplay = "Event Specific";
        // Check if it's a price market before trying to format the price
        if (safeAssetSymbol.toLowerCase().includes('price_above')) {
            // Assume 8 decimals for Oracle prices unless specified otherwise
            const oracleDecimals = market.oracleDecimals || 8;
            const formattedPrice = parseFloat(ethers.utils.formatUnits(targetPrice || '0', oracleDecimals)).toLocaleString('en-US', {
                style: 'currency',
                currency: 'USD',
            });
            targetDisplay = formattedPrice;
        }

        const totalStakedYesBN = ethers.BigNumber.from(totalStakedYes || '0');
        const totalStakedNoBN = ethers.BigNumber.from(totalStakedNo || '0');
        const totalPoolBN = totalStakedYesBN.add(totalStakedNoBN);
        
        // Return a new object that includes all original properties plus the new display ones
        return {
            ...market, 
            title,
            targetDisplay,
            expiryString: formatToUTC(expiryTimestamp), // Use our robust function
            statusString: getStatusString(state),
            statusClassName: `status-${getStatusString(state).toLowerCase()}`,
            totalPool: ethers.utils.formatUnits(totalPoolBN, 18),
        };

    } catch (e) {
        console.error(`Error processing market ID ${market.id} in getMarketDisplayProperties:`, e);
        // Return a graceful error state instead of crashing
        return { ...market, title: `Error processing Market #${market.id}`, expiryString: "Error", totalPool: "0.0" };
    }
}