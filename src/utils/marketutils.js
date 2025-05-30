// src/utils/marketutils.js 
import { ethers } from 'ethers';

export const MarketState = { Open: 0, Resolvable: 1, Resolved_YesWon: 2, Resolved_NoWon: 3, Resolved_Push: 4 };

export const getStatusString = (statusEnum) => {
    // ... (your existing getStatusString implementation)
    if (statusEnum === undefined || statusEnum === null) return "Loading...";
    switch (Number(statusEnum)) {
        case MarketState.Open: return "Open";
        case MarketState.Resolvable: return "Resolving";
        case MarketState.Resolved_YesWon: return "Resolved: YES Won";
        case MarketState.Resolved_NoWon: return "Resolved: NO Won";
        case MarketState.Resolved_Push: return "Push"; // Or "Refund"
        default: return `Unknown (${statusEnum})`;
    }
};

export const formatToUTC = (timestamp) => {
    // ... (your existing formatToUTC implementation)
    if (!timestamp || timestamp.toString() === "0") return "N/A";
    const date = new Date(Number(timestamp) * 1000);
    return date.toLocaleDateString('en-US', {
        year: 'numeric', month: 'short', day: 'numeric',
        hour: '2-digit', minute: '2-digit',
        timeZone: 'UTC',
    }) + " UTC";
};

// NEW/ENHANCED function for display properties
// In src/utils/marketutils.js

// ... (MarketState, getStatusString, formatToUTC are fine) ...

export const getMarketDisplayProperties = (market) => {
    let title = `Market #${market.id}`;
    let question = `Predict outcome for ${market.assetSymbol.replace(/_/g, " ")}`;
    let targetDisplay = "N/A";
    let currencySymbol = "";

    const symbol = market.assetSymbol || "";
    const parts = symbol.split('_'); 

    if (market.isEventMarket) {
        currencySymbol = parts[0]; // e.g., PIUSD
        if (parts.length >= 4 && parts[1].toUpperCase() === "PRICE" && parts[2].toUpperCase() === "ABOVE") {
            // Attempt to parse price from symbol, e.g., "0_7050" or "0_81"
            let priceStringRaw = "";
            let datePartsStartIndex = 4; // Default start index for date part in symbol

            if (parts[3] && parts[4] && !isNaN(Number(parts[3])) && !isNaN(Number(parts[4]))) { // e.g. 0_7050 or 0_81
                priceStringRaw = parts[3] + "." + parts[4]; // Creates "0.7050" or "0.81"
                datePartsStartIndex = 5; // Date part starts after the two price parts
            } else if (parts[3] && !isNaN(Number(parts[3]))) { // e.g. if symbol was just PRICE_ABOVE_TARGETPRICE_DATE
                priceStringRaw = parts[3]; // Less likely for your current structure with decimals
                datePartsStartIndex = 4;
            }


            if (priceStringRaw) {
                const priceValue = parseFloat(priceStringRaw);
                if (!isNaN(priceValue)) {
                    let decimalsToDisplay = 2; // Default
                    // Check if the decimal part in symbol suggests more precision
                    // e.g., if parts[4] was "7050" (length 4) vs "81" (length 2)
                    if (parts[4] && parts[4].length > 2) {
                        decimalsToDisplay = parts[4].length;
                    }
                    
                    targetDisplay = `$${priceValue.toLocaleString(undefined, { 
                        minimumFractionDigits: decimalsToDisplay, 
                        maximumFractionDigits: decimalsToDisplay 
                    })}`;
                    
                    const datePartInSymbol = parts.slice(datePartsStartIndex).join('_').replace(/_EOB$/, ''); // Join date parts, remove _EOB if present
                    question = `Will ${currencySymbol} be ≥ ${targetDisplay} by ${datePartInSymbol}?`;
                    title = `${currencySymbol} ≥ ${targetDisplay}`;
                } else {
                    // Fallback if priceStringRaw couldn't be parsed to a float
                    targetDisplay = "Target (See Symbol)";
                    question = `Will ${symbol.replace(/_/g, " ")} resolve as YES?`;
                    title = symbol.replace(/_/g, " ");
                }
            } else {
                // Fallback for simpler event markets if price can't be parsed from symbol
                question = `Will ${symbol.replace(/_/g, " ")} resolve as YES?`;
                title = symbol.replace(/_/g, " ");
                targetDisplay = "Outcome: YES";
            }
        } else {
            // Generic fallback for event markets not matching the PRICE_ABOVE pattern
            question = `Will ${symbol.replace(/_/g, " ")} resolve as YES?`;
            title = symbol.replace(/_/g, " ");
            targetDisplay = "Outcome: YES";
        }
    } else { // Price Feed Market (e.g., Chainlink)
        // ... (your existing robust logic for price feed markets using market.targetPrice and oracleDecimals)
        // This part seemed okay previously.
        currencySymbol = parts[0];
        if (parts.length >= 4 && parts[1].toUpperCase() === "PRICE" && parts[2].toUpperCase() === "ABOVE") {
            const oracleDecimals = market.oracleDecimals || 8; // Use market.oracleDecimals if fetched, else default
            try {
                const priceBigNumber = ethers.BigNumber.from(market.targetPrice);
                const formattedPrice = ethers.utils.formatUnits(priceBigNumber, oracleDecimals);
                targetDisplay = `$${parseFloat(formattedPrice).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: (oracleDecimals > 0 ? 2 : 0) })}`; // Show 2 decimals if oracle has them, else 0
                const datePartInSymbol = parts.slice(4).join('_').replace(/_EOB$/, '');
                question = `Will ${currencySymbol} be ≥ ${targetDisplay} by ${datePartInSymbol}?`;
                title = `${currencySymbol} ≥ ${targetDisplay}`;
            } catch (e) { /* ... error handling ... */ }
        } else { /* ... fallback ... */ }
    }

    return {
        // ... (displayId, title, question, targetDisplay, etc.)
        displayId: `Market #${market.id}`,
        title: title,
        question: question,
        targetDisplay: targetDisplay,
        currencySymbol: currencySymbol,
        expiryString: formatTimestampToUTC(market.expiryTimestamp), // Use your UTC formatter
        statusString: getStatusString(market.state), // Use your status string getter
        statusClassName: `status-${getStatusString(market.state).toLowerCase().replace(/[^a-z0-9]+/g, '-')}`
    };
};