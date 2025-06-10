// src/utils/marketutils.js
import { ethers } from 'ethers'; // REQUIRED for ethers.utils.formatUnits etc.
import { SUPPORTED_PRICE_FEEDS } from '../config/appConfig';

// Define MarketState Enum first
export const MarketState = { 
    Open: 0, 
    Resolvable: 1, 
    Resolved_YesWon: 2, 
    Resolved_NoWon: 3, 
    Resolved_Push: 4,
    ResolvedEarly_YesWon: 5,
    ResolvedEarly_NoWon: 6
};

// Define getStatusString
export const getStatusString = (statusEnum) => {
    if (statusEnum === undefined || statusEnum === null) return "Loading...";
    switch (Number(statusEnum)) { // Ensure comparison with numbers
        case MarketState.Open: return "Open";
        case MarketState.Resolvable: return "Resolving";
        case MarketState.Resolved_YesWon: return "YES Won"; // Simplified
        case MarketState.Resolved_NoWon: return "NO Won";  // Simplified
        case MarketState.Resolved_Push: return "Push (Refund)";
        case MarketState.ResolvedEarly_YesWon: return "Early YES Won";
        case MarketState.ResolvedEarly_NoWon: return "Early NO Won";
        default: return `Status: ${statusEnum}`; // More generic unknown
    }
};

// Define formatToUTC
export const formatToUTC = (timestamp) => {
    if (!timestamp || Number(timestamp) === 0) return "N/A";
    const date = new Date(Number(timestamp) * 1000);
    if (isNaN(date.getTime())) return "Invalid Date";
    try {
        return date.toLocaleDateString('en-US', {
            year: 'numeric', month: 'short', day: 'numeric',
            hour: '2-digit', minute: '2-digit',
            timeZone: 'UTC',
            hour12: true
        }) + " UTC";
    } catch (e) {
        console.error("Error formatting date to UTC:", e, "Timestamp:", timestamp);
        return "Date Error";
    }
};

// Placeholder for price feed data - In a real app, move this to a shared config
// and import it here and in CreateMarketPage.jsx



export const getMarketDisplayProperties = (intermediateMarket) => {
    // intermediateMarket comes from processMarketDetails and should have fields like:
    // id (string), assetSymbol (string), targetPrice (BigNumber or string from BigNumber), 
    // expiryTimestamp (number), resolutionTimestamp (number), creationTimestamp (number),
    // isEventMarket (bool), state (number), exists (bool), totalStakedYes (string from BigNumber),
    // totalStakedNo (string from BigNumber), actualOutcomeValue (string from BigNumber),
    // priceFeedAddress (string)

    if (!intermediateMarket || intermediateMarket.exists !== true || typeof intermediateMarket.id === 'undefined') {
        console.warn("UTIL_DEBUG: getMarketDisplayProperties received invalid or non-existent intermediateMarket:", intermediateMarket);
        return { 
            id: intermediateMarket?.id || `invalid-${Date.now()}`, 
            exists: false, 
            title: "Invalid Market Data", 
            question: "Error loading market question.",
            targetDisplay: "N/A", 
            expiryString: "N/A",
            statusString: "Error", 
            statusClassName: "status-error",
            state: -1, // Invalid state
            resolutionTimestamp: 0
        };
    }

    let title = "";
    let question = ""; // For hover/tooltip on MarketCard
    let targetDisplay = "N/A";

    const symbol = intermediateMarket.assetSymbol || "";
    const symbolParts = symbol.split('_'); // e.g., ["BTCUSD", "PRICE", "ABOVE", "100000", "JUN30"] OR ["TRUMP", "MUSK", "TOGETHER", "JUL10"]

    if (intermediateMarket.isEventMarket) {
        // For event markets, assetSymbol is the main descriptor.
        // Try to make a readable title and question from it.
        title = symbol.replace(/_/g, " "); // Default: "TRUMP MUSK TOGETHER JUL10"
        question = `Will the event '${title}' occur as per resolution details?`;
        
        // Example: if symbol is "PIUSD_GTE_0_63_JUN07BET"
        // This is an event market about a price, so we can try to parse it for a better display
        if (symbolParts.length >= 4 && symbolParts[1] === "GTE") { // Greater Than or Equal
            const asset = symbolParts[0]; // PIUSD
            const priceStr = symbolParts[2].replace(/(\d+)(\d{2})/, "$1.$2"); // Assume 0_63 means 0.63
            const dateInfo = symbolParts.slice(3).join(' ').replace(/BET$/, ''); // JUN07
            title = `${asset} ≥ $${priceStr} by ${dateInfo}`;
            question = `Will ${asset} be greater than or equal to $${priceStr} by ${dateInfo} (betting close)?`;
            targetDisplay = `$${priceStr}`;
        } else if (symbolParts.length >= 4 && symbolParts[1] === "PRICE" && (symbolParts[2] === "ABOVE" || symbolParts[2] === "BELOW")) {
            // Handle general "PRICE_ABOVE/BELOW_VALUE_DATE" format from old generator
            const asset = symbolParts[0];
            const condition = symbolParts[2].toLowerCase();
            const value = symbolParts[3].replace(/(\d+)(\d{2})/, "$1.$2"); // Simple assumption for price like 0_65 -> 0.65
            const dateInfo = symbolParts.slice(4).join(' ').replace(/EOB$/, '');
            title = `${asset} price ${condition} $${value} by ${dateInfo}`;
            question = `Will ${asset} price be ${condition} $${value} by ${dateInfo}?`;
            targetDisplay = `$${value}`;
        } else {
            // Generic event market, title remains assetSymbol spaced out
            // targetDisplay might be best as "See Resolution Details"
            targetDisplay = "Event Specific";
        }

    } else { // Price Feed Market
        const feedInfo = SUPPORTED_PRICE_FEEDS.find(f => f.address.toLowerCase() === intermediateMarket.priceFeedAddress.toLowerCase());
        const oracleDecimals = feedInfo ? feedInfo.decimals : 8; // Default to 8 if feed not found

        try {
            const priceBigNumber = ethers.BigNumber.from(intermediateMarket.targetPrice); // Already a BigNumber string from processMarketDetails
            const formattedPrice = ethers.utils.formatUnits(priceBigNumber, oracleDecimals);
            
            let condition = "above"; // Default
            if (symbol.toUpperCase().includes("_BELOW_")) condition = "below";
            // Add more conditions like _EQUAL_ if your symbol generator supports them

            targetDisplay = `$${parseFloat(formattedPrice).toLocaleString(undefined, { 
                minimumFractionDigits: 2, 
                maximumFractionDigits: Math.max(2, oracleDecimals) // Show at least 2, up to oracleDecimals
            })}`;
            
            const assetName = feedInfo ? feedInfo.symbolPrefix : symbolParts[0];
            title = `${assetName} price ${condition} ${targetDisplay}`;
            question = `Will ${assetName} price be ${condition} ${targetDisplay} by expiry?`;

        } catch (e) {
            console.error("UTIL_DEBUG: Error formatting price feed target in getMarketDisplayProperties:", e, intermediateMarket);
            targetDisplay = `Target (Raw): ${intermediateMarket.targetPrice.toString()}`;
            title = `${symbolParts[0]} Price Prediction`;
            question = title;
        }
    }

    const currentStatusString = getStatusString(intermediateMarket.state);
    const statusClassNameBase = currentStatusString.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-$/, ''); // Remove trailing dash

    const displayReadyMarket = {
        ...intermediateMarket, // Spread all original fields (id, state, assetSymbol, exists, timestamps etc.)
        title: title,
        question: question, // For link title attribute, can be more descriptive
        targetDisplay: targetDisplay,
        expiryString: formatToUTC(intermediateMarket.expiryTimestamp),
        statusString: currentStatusString,
        statusClassName: `status-${statusClassNameBase}`,
        displayId: `Market #${intermediateMarket.id}` // Used by MarketCard if title is missing
    };

    return displayReadyMarket;
};