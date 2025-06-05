// src/utils/marketutils.js
import { ethers } from 'ethers'; // Only if ethers is used directly in these utils, usually not.

// Define MarketState Enum first, as other functions might use it
export const MarketState = { 
    Open: 0, 
    Resolvable: 1, 
    Resolved_YesWon: 2, 
    Resolved_NoWon: 3, 
    Resolved_Push: 4,
    ResolvedEarly_YesWon: 5, // Ensure all states your contract uses are here
    ResolvedEarly_NoWon: 6
};

// Define getStatusString next, as getMarketDisplayProperties uses it
export const getStatusString = (statusEnum) => {
    if (statusEnum === undefined || statusEnum === null) return "Loading...";
    switch (Number(statusEnum)) {
        case MarketState.Open: return "Open";
        case MarketState.Resolvable: return "Resolving";
        case MarketState.Resolved_YesWon: return "Resolved: YES Won";
        case MarketState.Resolved_NoWon: return "Resolved: NO Won";
        case MarketState.Resolved_Push: return "Push";
        case MarketState.ResolvedEarly_YesWon: return "Early: YES Won";
        case MarketState.ResolvedEarly_NoWon: return "Early: NO Won";
        default: return `Unknown (${statusEnum})`;
    }
};

// Define formatToUTC next, as getMarketDisplayProperties uses it
export const formatToUTC = (timestamp) => {
    if (!timestamp || timestamp.toString() === "0" || Number(timestamp) === 0) return "N/A"; // More robust check
    const date = new Date(Number(timestamp) * 1000);
    if (isNaN(date.getTime())) return "Invalid Date"; // Check if date is valid
    try {
        return date.toLocaleDateString('en-US', { // Using en-US for MM/DD/YYYY example, can be en-GB
            year: 'numeric', month: 'short', day: 'numeric',
            hour: '2-digit', minute: '2-digit',
            timeZone: 'UTC',
            hour12: true // AM/PM
        }) + " UTC";
    } catch (e) {
        console.error("Error formatting date to UTC:", e, "Timestamp:", timestamp);
        return "Date Error";
    }
};

// NOW define getMarketDisplayProperties, which uses the functions above
// In marketutils.js -> getMarketDisplayProperties
export const getMarketDisplayProperties = (intermediateMarket) => {
    // First, ensure intermediateMarket is valid and has necessary base properties
    if (!intermediateMarket || typeof intermediateMarket.id === 'undefined' || intermediateMarket.exists !== true) {
        console.warn("PMLP_DEBUG_UTIL: getMarketDisplayProperties received invalid intermediateMarket or market does not exist:", intermediateMarket);
        // Return an object that MarketCard can handle as an error or skip,
        // but ensure it has an 'id' for keying if it's not filtered out earlier.
        return { 
            id: intermediateMarket?.id || `invalid-${Date.now()}`, // Provide an ID for key
            exists: false, 
            title: "Invalid Market Data", 
            statusString: "Error", 
            statusClassName: "status-error",
            // ... other minimal fields MarketCard might try to access
        };
    }

    // Your logic to derive title, question, targetDisplay, expiryString, statusString, statusClassName
    // based on intermediateMarket.assetSymbol, intermediateMarket.state, intermediateMarket.isEventMarket, etc.
    // For example:
    let title = intermediateMarket.assetSymbol.replace(/_/g, " "); // Default title
    let question = `Predict: ${intermediateMarket.assetSymbol.replace(/_/g, " ")}`; // Default question
    let targetDisplay = "N/A";
    
    // ... (Your detailed parsing logic for title, question, targetDisplay based on assetSymbol and market type) ...
    // This is where you'd put the complex if/else for event vs price feed from your previous getMarketDisplayProperties

    const currentStatusString = getStatusString(intermediateMarket.state); // Assuming getStatusString is defined
    const statusClassNameBase = currentStatusString.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const expiryString = formatToUTC(intermediateMarket.expiryTimestamp); // Assuming formatToUTC is defined

    return {
        ...intermediateMarket, // <<< SPREAD ALL properties from intermediateMarket FIRST
                               // This ensures id, state, exists, assetSymbol, expiryTimestamp etc. are carried over.
        title: title,          // Then override or add new display-specific ones
        question: question,
        targetDisplay: targetDisplay,
        expiryString: expiryString,
        statusString: currentStatusString,
        statusClassName: `status-${statusClassNameBase}`,
        displayId: `Market #${intermediateMarket.id}` // A distinct property for display if needed
    };
};