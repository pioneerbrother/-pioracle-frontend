// src/utils/marketutils.js

import { ethers } from 'ethers'; // Make sure ethers is imported

// Define the MarketState enum here for use within this file
export const MarketState = {
    Open: 0,
    Resolved_YesWon: 1,
    Resolved_NoWon: 2,
    Resolved_Tied_Refund: 3,
};

// --- THE FINAL, COMPLETE DISPLAY PROPERTIES FUNCTION ---

export function getMarketDisplayProperties(market) {
    // Safety check for invalid input
    if (!market || !market.assetSymbol) {
        console.warn("getMarketDisplayProperties received an invalid or incomplete market object:", market);
        // Return a default object to prevent crashes
        return { 
            ...market,
            title: `Market #${market?.id || 'N/A'}`,
            icon: '/images/icons/default-icon.png', // Assume you will create a default icon
            exists: false // Mark as non-existent to be safe
        };
    }

    try {
        // --- DATA PREPARATION ---
        const { expiryTimestamp, state, totalStakedYes, totalStakedNo } = market;

        // The title is generated from the on-chain assetSymbol
        const title = market.assetSymbol.replace(/_/g, ' ');

        // Use Ethers v5 BigNumber for calculations
        const totalStakedYesBN = ethers.BigNumber.from(totalStakedYes || '0');
        const totalStakedNoBN = ethers.BigNumber.from(totalStakedNo || '0');
        const totalPoolBN = totalStakedYesBN.add(totalStakedNoBN);

        // --- PROBABILITY CALCULATION ---
        let yesProbability = 50;
        let noProbability = 50;

        if (!totalPoolBN.isZero()) {
            const probYesRaw = totalStakedYesBN.mul(10000).div(totalPoolBN);
            yesProbability = probYesRaw.toNumber() / 100;
            // Ensure probabilities sum to 100
            noProbability = 100 - yesProbability; 
        }

        // --- STATUS & EXPIRY CALCULATION ---
        let statusString = 'Open';
        let statusClassName = 'status-open';
        let outcomeString = 'Pending';
        
        // Use the MarketState enum for clarity
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
                statusString = 'Tied / Refund';
                statusClassName = 'status-tied';
                outcomeString = 'TIE';
                break;
            // Default case handles MarketState.Open
        }
        
        const expiryDate = new Date(expiryTimestamp * 1000);
        const expiryString = expiryDate.toLocaleDateString(undefined, {
            year: 'numeric', month: 'short', day: 'numeric'
        });

        // Check if an open market has passed its expiry date
        if (state === MarketState.Open && expiryDate < new Date()) {
            statusString = 'Pending Resolution';
            statusClassName = 'status-pending';
        }

        // --- ICON SELECTION LOGIC ---
        // Default icon in case no keywords match
        let marketIcon = '/images/icons/default-icon.png'; // Make sure you create this file!
        const symbolUpper = market.assetSymbol.toUpperCase();

        if (symbolUpper.includes('BEZOS') || symbolUpper.includes('WEDDING') || symbolUpper.includes('DIVORCE') || symbolUpper.includes('TRUMP')) {
            marketIcon = '/images/icons/wedding-ring-icon.png'; // Using this for people/events
        } else if (symbolUpper.includes('BTC')) {
            marketIcon = '/images/icons/btc-icon.svg';
        } else if (symbolUpper.includes('ETH')) {
            marketIcon = '/images/icons/eth-icon.svg';
        } else if (symbolUpper.includes('SOL')) {
            marketIcon = '/images/icons/sol-icon.svg';
        } else if (symbolUpper.includes('XRP')) {
            marketIcon = '/images/icons/xrp-icon.svg';
        } else if (symbolUpper.includes('USERS') || symbolUpper.includes('PIORACLE') || symbolUpper.includes('BNB')) {
            // Correctly pointing to the Binance logo for your BNB Chain market
            marketIcon = '/images/icons/crypto-icon.png';
        }
        // --- END OF ICON LOGIC ---


        // --- FINAL RETURN OBJECT ---
        // Return a comprehensive object with all calculated properties for the UI
        return {
            ...market, // Pass through all original market properties
            title,
            expiryString,
            statusString,
            statusClassName,
            outcomeString,
            yesProbability,
            noProbability,
            totalPool: ethers.utils.formatEther(totalPoolBN), // Also return formatted total pool for potential use
            icon: marketIcon // Add the determined icon path
        };

    } catch (error) {
        // Catch any errors during processing and return a safe default object
        console.error("Error processing market display properties for market:", market, error);
        return {
            ...market,
            title: `Error Processing Market #${market?.id || 'N/A'}`,
            icon: '/images/icons/default-icon.png',
            exists: false,
        };
    }
}