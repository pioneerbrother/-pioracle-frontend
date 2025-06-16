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

// This is the function that determines the icon based on keywords in the assetSymbol
// src/utils/marketutils.js

export function getMarketIcon(assetSymbol) {
    const defaultIcon = '/images/icons/default-icon.svg'; 
    if (!assetSymbol || typeof assetSymbol !== 'string') return defaultIcon;

    const lowerCaseSymbol = assetSymbol.toLowerCase();

    // --- THIS IS THE CORRECTED LINE ---
    // It now points to your specific trump-icon.svg file.
    if (lowerCaseSymbol.includes('trump') || lowerCaseSymbol.includes('election')) {
        return '/images/icons/trump-icon.svg';
    }

    // Now check for cryptocurrency symbols.
    if (lowerCaseSymbol.includes('btc_') || lowerCaseSymbol.includes('btcusd')) {
        return '/images/icons/btc-icon.svg';
    }
    if (lowerCaseSymbol.includes('eth_') || lowerCaseSymbol.includes('ethusd')) {
        return '/images/icons/eth-icon.svg';
    }
    if (lowerCaseSymbol.includes('sol_') || lowerCaseSymbol.includes('solusd')) {
        return '/images/icons/sol-icon.svg';
    }
    if (lowerCaseSymbol.includes('xrp_') || lowerCaseSymbol.includes('xrpusd')) {
        return '/images/icons/xrp-icon.svg';
    }
    
    // If no other match is found, return the default.
    return defaultIcon;
}

export function getMarketDisplayProperties(market) {
    if (!market || typeof market.id === 'undefined') {
        return null;
    }
    try {
        const { id, assetSymbol, targetPrice, expiryTimestamp, state, nativeTokenSymbol, totalStakedYes, totalStakedNo } = market;
        const safeAssetSymbol = assetSymbol || '';
        let title = `Market #${id}`;
        if (safeAssetSymbol) {
            title = safeAssetSymbol.replace(/_/g, ' ').replace(/PRICE ABOVE/g, 'Above');
        }

        let targetDisplay = "Event Specific";
        if (safeAssetSymbol.toLowerCase().includes('price_above')) {
            const formattedPrice = parseFloat(ethers.utils.formatUnits(targetPrice || '0', 8)).toLocaleString('en-US', { style: 'currency', currency: 'USD' });
            targetDisplay = formattedPrice;
        }

        const totalStakedYesBN = ethers.BigNumber.from(totalStakedYes || '0');
        const totalStakedNoBN = ethers.BigNumber.from(totalStakedNo || '0');
        const totalPoolBN = totalStakedYesBN.add(totalStakedNoBN);
        
        return {
            ...market,
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
        return { ...market, title: `Error processing Market #${market.id}` };
    }
}