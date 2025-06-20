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
            year: 'numeric', month: 'short', day: 'numeric'
        });
    } catch (e) {
        return 'Invalid Date';
    }
}

export function getMarketIcon(assetSymbol) {
    const defaultIcon = '/images/icons/default-icon.svg'; 
    if (!assetSymbol || typeof assetSymbol !== 'string') return defaultIcon;

    const lowerCaseSymbol = assetSymbol.toLowerCase();

    if (lowerCaseSymbol.includes('trump') || lowerCaseSymbol.includes('us_') || lowerCaseSymbol.includes('iran') || lowerCaseSymbol.includes('strike')) {
        return '/images/icons/trump-icon.svg'; 
    }
    if (lowerCaseSymbol.includes('btc')) return '/images/icons/btc-icon.svg';
    if (lowerCaseSymbol.includes('eth') || lowerCaseSymbol.includes('ethereum')) return '/images/icons/eth-icon.svg';
    if (lowerCaseSymbol.includes('sol')) return '/images/icons/sol-icon.svg';
    if (lowerCaseSymbol.includes('xrp')) return '/images/icons/xrp-icon.svg';
    
    return defaultIcon;
}

export function getMarketDisplayProperties(market) {
    // 1. Guard clause for invalid input
    if (!market || typeof market.id === 'undefined') {
        console.error("getMarketDisplayProperties received an invalid market object.");
        return null;
    }

    // 2. Define default values to prevent errors
    let title = `Market #${market.id}`;
    let targetDisplay = "Event Specific";
    let expiryString = "N/A";
    let statusString = "Unknown";
    let yesProbability = 50;
    let noProbability = 50;

    try {
        // 3. Destructure properties safely
        const { id, assetSymbol, targetPrice, expiryTimestamp, state, totalStakedYes, totalStakedNo, isEventMarket } = market;
        
        const safeAssetSymbol = assetSymbol || '';
        const lowerCaseSymbol = safeAssetSymbol.toLowerCase();
        
        // --- TITLE LOGIC ---
        if (lowerCaseSymbol.includes('up_or_down')) {
            const parts = safeAssetSymbol.split('_');
            const asset = parts[0];
            const date = parts[parts.length - 1];
            title = `${asset} Up or Down by ${date}?`;
        } 
        else if (lowerCaseSymbol.includes('strike') && lowerCaseSymbol.includes('iran')) {
            const date = safeAssetSymbol.split('_').pop();
            title = `US to Strike Iran by ${date}?`;
        }
        else if (!isEventMarket && lowerCaseSymbol.includes('price_above')) {
            const parts = safeAssetSymbol.split('_');
            const date = parts.pop();
            const price = parts.pop();
            const asset = parts.shift();
            title = `${asset} Above $${parseFloat(price).toLocaleString()} by ${date}?`;
        } 
        else if (safeAssetSymbol) {
            title = safeAssetSymbol.replace(/_/g, ' ');
        }
        
        // --- TARGET DISPLAY LOGIC ---
        if (!isEventMarket) {
            const oracleDecimals = market.oracleDecimals || 8;
            targetDisplay = parseFloat(ethers.utils.formatUnits(targetPrice || '0', oracleDecimals)).toLocaleString('en-US', {
                style: 'currency', currency: 'USD'
            });
        }
        
        // --- PROBABILITY CALCULATION ---
        const totalStakedYesBN = ethers.BigNumber.from(totalStakedYes || '0');
        const totalStakedNoBN = ethers.BigNumber.from(totalStakedNo || '0');
        const totalPoolBN = totalStakedYesBN.add(totalStakedNoBN);

        if (!totalPoolBN.isZero()) {
            const scale = 10000;
            const yesProbRaw = totalStakedYesBN.mul(scale).div(totalPoolBN);
            yesProbability = yesProbRaw.toNumber() / (scale / 100);
            noProbability = 100 - yesProbability;
        }

        // --- FINAL STRING FORMATTING ---
        expiryString = formatToUTC(expiryTimestamp);
        statusString = getStatusString(state);
        
    } catch (e) {
        console.error(`Error processing market ID ${market.id} in getMarketDisplayProperties:`, e);
        title = `Error processing Market #${market.id}`;
    }

    // 4. Return the complete, safe object
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