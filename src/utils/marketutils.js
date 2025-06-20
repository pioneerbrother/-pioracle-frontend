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

    if (lowerCaseSymbol.includes('trump') || lowerCaseSymbol.includes('us_') || lowerCaseSymbol.includes('iran')) {
        return '/images/icons/trump-icon.png'; 
    }
    if (lowerCaseSymbol.includes('btc')) return '/images/icons/btc-icon.svg';
    if (lowerCaseSymbol.includes('eth')) return '/images/icons/eth-icon.svg';
    if (lowerCaseSymbol.includes('sol')) return '/images/icons/sol-icon.svg';
    if (lowerCaseSymbol.includes('xrp')) return '/images/icons/xrp-icon.svg';
    
    return defaultIcon;
}

export function getMarketDisplayProperties(market) {
    if (!market || !market.assetSymbol) {
        return { ...market, title: `Market #${market.id || 'N/A'}` };
    }

    try {
        // --- THE NEW, FOOLPROOF TITLE LOGIC ---
        // The title is now simply the assetSymbol cleaned up for display.
        const title = market.assetSymbol.replace(/_/g, ' ');
        
        const { expiryTimestamp, state, totalStakedYes, totalStakedNo } = market;
        
        const totalStakedYesBN = ethers.BigNumber.from(totalStakedYes || '0');
        const totalStakedNoBN = ethers.BigNumber.from(totalStakedNo || '0');
        const totalPoolBN = totalStakedYesBN.add(totalStakedNoBN);

        let yesProbability = 50;
        let noProbability = 50;
        if (!totalPoolBN.isZero()) {
            const scale = 10000;
            const yesProbRaw = totalStakedYesBN.mul(scale).div(totalPoolBN);
            yesProbability = yesProbRaw.toNumber() / (scale / 100);
            noProbability = 100 - yesProbability;
        }
        
        return {
            ...market, 
            title,
            targetDisplay: market.isEventMarket ? "YES / NO" : "Price Target",
            expiryString: formatToUTC(expiryTimestamp),
            statusString: getStatusString(state),
            statusClassName: `status-${getStatusString(state).toLowerCase()}`,
            yesProbability: yesProbability.toFixed(0),
            noProbability: noProbability.toFixed(0),
        };
    } catch (e) {
        console.error(`Error processing market ID ${market.id} in getMarketDisplayProperties:`, e);
        return { ...market, title: `Error processing Market #${market.id}` };
    }
}