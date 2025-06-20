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

export function getMarketIcon(assetSymbol) {
    const defaultIcon = '/images/icons/default-icon.svg'; 
    if (!assetSymbol || typeof assetSymbol !== 'string') return defaultIcon;

    const lowerCaseSymbol = assetSymbol.toLowerCase();

    if (lowerCaseSymbol.includes('trump') || lowerCaseSymbol.includes('election') || lowerCaseSymbol.includes('us_') || lowerCaseSymbol.includes('iran') || lowerCaseSymbol.includes('strike')) {
        return '/images/icons/trump-icon.png'; 
    }
    if (lowerCaseSymbol.includes('btc')) return '/images/icons/btc-icon.svg';
    if (lowerCaseSymbol.includes('eth') || lowerCaseSymbol.includes('ethereum')) return '/images/icons/eth-icon.svg';
    if (lowerCaseSymbol.includes('sol')) return '/images/icons/sol-icon.svg';
    if (lowerCaseSymbol.includes('xrp')) return '/images/icons/xrp-icon.svg';
    
    return defaultIcon;
}

export function getMarketDisplayProperties(market) {
    if (!market || typeof market.id === 'undefined') {
        return null;
    }

    let title = `Market #${market.id}`;
    let targetDisplay = "Event Specific";
    let expiryString = "N/A";
    let statusString = "Unknown";
    let yesProbability = 50;
    let noProbability = 50;

    try {
        const { id, assetSymbol, targetPrice, expiryTimestamp, state, totalStakedYes, totalStakedNo, isEventMarket } = market;
        const safeAssetSymbol = assetSymbol || '';
        const lowerCaseSymbol = safeAssetSymbol.toLowerCase();
        const parts = safeAssetSymbol.split('_');

        // --- FINAL, CORRECTED TITLE LOGIC ---
        if (isEventMarket) {
            // For symbols like: US_STRIKE_IRAN_YES_JUL18
            const date = parts.pop();
            parts.pop(); // Remove "YES"
            const questionPart = parts.join(' ');
            title = `${questionPart} by ${date}?`;
        } else { // Price Feed Market
            // For symbols like: BTCUSD_PRICE_ABOVE_110000_JUN26
            const date = parts.pop();
            const price = parts.pop();
            const asset = parts.shift();
            title = `${asset} Above $${parseFloat(price).toLocaleString()} by ${date}?`;
            
            const oracleDecimals = market.oracleDecimals || 8;
            targetDisplay = parseFloat(ethers.utils.formatUnits(targetPrice || '0', oracleDecimals)).toLocaleString('en-US', { style: 'currency', currency: 'USD' });
        }
        
        // Probability Calculation
        const totalStakedYesBN = ethers.BigNumber.from(totalStakedYes || '0');
        const totalStakedNoBN = ethers.BigNumber.from(totalStakedNo || '0');
        const totalPoolBN = totalStakedYesBN.add(totalStakedNoBN);

        if (!totalPoolBN.isZero()) {
            const scale = 10000;
            const yesProbRaw = totalStakedYesBN.mul(scale).div(totalPoolBN);
            yesProbability = yesProbRaw.toNumber() / (scale / 100);
            noProbability = 100 - yesProbability;
        }

        expiryString = formatToUTC(expiryTimestamp);
        statusString = getStatusString(state);
        
    } catch (e) {
        console.error(`Error processing market ID ${market.id} in getMarketDisplayProperties:`, e);
        title = (market.assetSymbol || `Market #${market.id}`).replace(/_/g, ' ');
    }

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