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

// --- THE MISSING ICON FUNCTION ---
export function getMarketIcon(assetSymbol) {
    const defaultIcon = '/images/icons/default-icon.svg'; 
    if (!assetSymbol || typeof assetSymbol !== 'string') return defaultIcon;

    const lowerCaseSymbol = assetSymbol.toLowerCase();

    // Check for politics keywords first
    if (lowerCaseSymbol.includes('trump') || lowerCaseSymbol.includes('us_') || lowerCaseSymbol.includes('iran') || lowerCaseSymbol.includes('strike')) {
        return '/images/icons/trump-icon.png'; 
    }

    // Then check for crypto symbols
    if (lowerCaseSymbol.includes('btc')) return '/images/icons/btc-icon.svg';
    if (lowerCaseSymbol.includes('eth')) return '/images/icons/eth-icon.svg';
    if (lowerCaseSymbol.includes('sol')) return '/images/icons/sol-icon.svg';
    if (lowerCaseSymbol.includes('xrp')) return '/images/icons/xrp-icon.svg';
    
    // Fallback to default
    return defaultIcon;
}


// --- THE FINAL DISPLAY PROPERTIES FUNCTION ---
export function getMarketDisplayProperties(market) {
    if (!market || !market.assetSymbol) {
        console.warn("getMarketDisplayProperties received an invalid market object:", market);
        return { ...market, title: `Market #${market?.id || 'N/A'}`, icon: '/images/icons/default-icon.png' }; // Return a default
    }

    try {
        // The title is now simply the assetSymbol with underscores replaced.
        const title = market.assetSymbol.replace(/_/g, ' ');

        const { expiryTimestamp, state, totalStakedYes, totalStakedNo } = market;

        const totalStakedYesBN = ethers.BigNumber.from(totalStakedYes || '0');
        const totalStakedNoBN = ethers.BigNumber.from(totalStakedNo || '0');
        const totalPoolBN = totalStakedYesBN.add(totalStakedNoBN);

        let yesProbability = 50;
        let noProbability = 50;

        if (!totalPoolBN.isZero()) {
            const probYesRaw = totalStakedYesBN.mul(10000).div(totalPoolBN);
            yesProbability = probYesRaw.toNumber() / 100;
            noProbability = 100 - yesProbability;
        }

        // Determine Status String and Class Name based on state
        let statusString = 'Open';
        let statusClassName = 'status-open';
        let outcomeString = 'Pending';

        switch (state) {
            case MarketState.Resolved_YesWon:
                statusString = 'Resolved';
                statusClassName = 'status-resolved';
                outcomeString = 'YES';
                break;
            case MarketState.Resolved_NoWon:
                statusString = 'Resolved';
                statusClassName = 'status-resolved';
                outcomeString = 'NO';
                break;
            case MarketState.Resolved_Tied_Refund:
                statusString = 'Tied / Refunded';
                statusClassName = 'status-tied';
                outcomeString = 'TIE';
                break;
            // Default case handles MarketState.Open
        }
        
        const expiryDate = new Date(expiryTimestamp * 1000);
        const expiryString = expiryDate.toLocaleDateString(undefined, {
            year: 'numeric', month: 'short', day: 'numeric'
        });

        if (state === MarketState.Open && expiryDate < new Date()) {
            statusString = 'Pending Resolution';
            statusClassName = 'status-pending';
        }

        // --- NEW ICON LOGIC ---
        let marketIcon = '/images/icons/default-icon.png'; // A default icon
        const symbolUpper = market.assetSymbol.toUpperCase();

        if (symbolUpper.includes('BEZOS') || symbolUpper.includes('WEDDING') || symbolUpper.includes('DIVORCE')) {
            marketIcon = '/images/icons/wedding-ring-icon.png'; // Your PNG icon
        } else if (symbolUpper.includes('BTC') || symbolUpper.includes('ETHEREUM') || symbolUpper.includes('CRYPTO')) {
            marketIcon = '/images/icons/crypto-icon.png'; // Your PNG icon
        } else if (symbolUpper.includes('USERS') || symbolUpper.includes('PIORACLE')) {
            marketIcon = '/pioracle_logo_eyes_only_192.png'; // Example using your main logo
        } else if (symbolUpper.includes('STRIKE') || symbolUpper.includes('WAR')) {
            marketIcon = '/images/icons/conflict-icon.png'; // Assumes you create this icon
        }
        // --- END OF NEW ICON LOGIC ---


        // Return a comprehensive object for the UI
        return {
            ...market,
            title,
            expiryString,
            statusString,
            statusClassName,
            outcomeString,
            yesProbability,
            noProbability,
            totalPool: ethers.utils.formatEther(totalPoolBN), // Also return formatted total pool
            icon: marketIcon // Add the new icon property
        };

    } catch (error) {
        console.error("Error in getMarketDisplayProperties for market:", market, error);
        return {
            ...market,
            title: `Error processing Market #${market?.id || 'N/A'}`,
            icon: '/images/icons/default-icon.png'
        };
    }
}