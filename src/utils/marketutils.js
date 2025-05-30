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
export const getMarketDisplayProperties = (market) => {
    if (!market || typeof market.id === 'undefined') { // Basic check for a valid market object
        console.warn("getMarketDisplayProperties received invalid market object:", market);
        return {
            displayId: "Market N/A", title: "Invalid Market Data", question: "Could not load market question.",
            targetDisplay: "N/A", currencySymbol: "", expiryString: "N/A",
            statusString: "Error", statusClassName: "status-error"
        };
    }

    let title = `Market #${market.id}`;
    let question = `Predict outcome for ${market.assetSymbol ? market.assetSymbol.replace(/_/g, " ") : 'N/A'}`;
    let targetDisplay = "N/A";
    let currencySymbol = "";

    const symbol = market.assetSymbol || "";
    const parts = symbol.split('_');

    // --- Make sure this parsing logic correctly handles ALL your symbol formats ---
    if (market.isEventMarket) {
        currencySymbol = parts[0] || "";
        if (parts.length >= 5 && parts[1]?.toUpperCase() === "PRICE" && parts[2]?.toUpperCase() === "ABOVE") {
            let priceStringRaw = "";
            if (parts[3] && parts[4] && !isNaN(Number(parts[3])) && (parts[4] === "0" || !isNaN(Number(parts[4])) ) ) { // Handle "0_7050" or "0_81"
                priceStringRaw = parts[3] + "." + parts[4];
                const priceValue = parseFloat(priceStringRaw);
                if (!isNaN(priceValue)) {
                    let decimalsToDisplay = parts[4].length === 1 && parts[4] === "0" ? 0 : (parts[4].length > 2 ? parts[4].length : 2) ; // e.g. for "0_7050" or "0_7"
                    if (parts[3] === "0" && parts[4] === "0") decimalsToDisplay = 0; // for "0_0" which means $0
                    targetDisplay = `$${priceValue.toLocaleString(undefined, { minimumFractionDigits: decimalsToDisplay, maximumFractionDigits: decimalsToDisplay })}`;
                    const datePartInSymbol = parts.slice(5).join('_').replace(/_EOB$/, '');
                    question = `Will ${currencySymbol} be ≥ ${targetDisplay} by ${datePartInSymbol}?`;
                    title = `${currencySymbol} ≥ ${targetDisplay}`;
                } else { targetDisplay = "Price Target"; }
            } else { title = symbol.replace(/_/g, " "); targetDisplay = "Outcome: YES"; }
        } else { title = symbol.replace(/_/g, " "); targetDisplay = "Outcome: YES"; }
    } else { // Price Feed Market
        currencySymbol = parts[0] || "";
        if (parts.length >= 4 && parts[1]?.toUpperCase() === "PRICE" && parts[2]?.toUpperCase() === "ABOVE") {
            const oracleDecimals = market.oracleDecimals || 8;
            try {
                // Ensure market.targetPrice is a string representing a number
                const priceBigNumber = ethers.BigNumber.from(market.targetPrice.toString());
                const formattedPrice = ethers.utils.formatUnits(priceBigNumber, oracleDecimals);
                targetDisplay = `$${parseFloat(formattedPrice).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: (oracleDecimals > 0 ? 2 : 0) })}`;
                const datePartInSymbol = parts.slice(4).join('_').replace(/_EOB$/, '');
                question = `Will ${currencySymbol} be ≥ ${targetDisplay} by ${datePartInSymbol}?`;
                title = `${currencySymbol} ≥ ${targetDisplay}`;
            } catch (e) {
                console.error("Error formatting price feed target:", e, "Raw targetPrice:", market.targetPrice);
                targetDisplay = `Target (Raw): ${market.targetPrice}`;
                title = `${currencySymbol} Prediction`;
            }
        } else { title = symbol.replace(/_/g, " "); targetDisplay = `Target: ${market.targetPrice}`; }
    }

    const currentStatusString = getStatusString(market.state); // Uses the function defined above

    return {
        displayId: `Market #${market.id}`,
        title: title,
        question: question,
        targetDisplay: targetDisplay,
        currencySymbol: currencySymbol,
        expiryString: formatToUTC(market.expiryTimestamp), // Uses the function defined above
        statusString: currentStatusString,
        statusClassName: `status-${currentStatusString.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`
    };
};