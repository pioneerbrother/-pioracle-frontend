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
export const getMarketDisplayProperties = (market) => {
    let title = `Market #${market.id}`;
    let question = `Predict the outcome for ${market.assetSymbol.replace(/_/g, " ")}`;
    let targetDisplay = "N/A"; // e.g., "$111,000" or "$0.81"
    let currencySymbol = ""; // e.g., "BTC/USD" or "PI/USD"

    const symbol = market.assetSymbol || "";
    const parts = symbol.split('_'); // E.g., ["BTCUSD", "PRICE", "ABOVE", "111000", "MAY26"]
                                     // Or ["PIUSD", "PRICE", "ABOVE", "0", "81", "MAY26"] (if using comma for decimal in symbol)

    if (market.isEventMarket) {
        currencySymbol = parts[0]; // e.g., "PIUSD"
        if (parts.length >= 5 && parts[1].toUpperCase() === "PRICE" && parts[2].toUpperCase() === "ABOVE") {
            // Assuming PIUSD_PRICE_ABOVE_0_81_MAY26 (where 0_81 becomes 0.81)
            const priceValue = parts[3] + "." + parts[4]; // "0" + "." + "81"
            targetDisplay = `$${parseFloat(priceValue).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
            question = `Will ${currencySymbol} be ≥ ${targetDisplay} by ${parts.slice(5).join('_')}?`;
            title = `${currencySymbol} ≥ ${targetDisplay}`;
        } else {
            // Fallback for simpler event markets
            question = `Will ${symbol.replace(/_/g, " ")} resolve as YES?`;
            title = symbol.replace(/_/g, " ");
            targetDisplay = "Outcome: YES";
        }
    } else { // Price Feed Market (e.g., Chainlink)
        currencySymbol = parts[0]; // e.g., "BTCUSD"
        if (parts.length >= 4 && parts[1].toUpperCase() === "PRICE" && parts[2].toUpperCase() === "ABOVE") {
            // Assuming Chainlink feeds typically have 8 decimals for crypto/USD
            // This should be made more robust if you have feeds with different decimals
            const oracleDecimals = (currencySymbol.toUpperCase() === "BTCUSD" || currencySymbol.toUpperCase() === "ETHUSD") ? 8 : 2; // Example
            try {
                const priceBigNumber = ethers.BigNumber.from(market.targetPrice); // Raw target from contract
                const formattedPrice = ethers.utils.formatUnits(priceBigNumber, oracleDecimals);
                targetDisplay = `$${parseFloat(formattedPrice).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`; // e.g., $111,000
                question = `Will ${currencySymbol} be ≥ ${targetDisplay} by ${parts.slice(4).join('_')}?`;
                title = `${currencySymbol} ≥ ${targetDisplay}`;
            } catch (e) {
                console.error("Error formatting price feed target:", e);
                question = `Predict if ${currencySymbol} meets target by ${parts.slice(4).join('_')}`;
                title = `${currencySymbol} Prediction`;
                targetDisplay = `Raw Target: ${market.targetPrice}`;
            }
        } else {
            question = `Predict outcome for ${symbol.replace(/_/g, " ")}`;
            title = symbol.replace(/_/g, " ");
            targetDisplay = `Target: ${market.targetPrice}`;
        }
    }

    return {
        displayId: `Market #${market.id}`,
        title: title, // More concise title for the card header
        question: question, // Fuller question for context, maybe for hover or detail page
        targetDisplay: targetDisplay, // The formatted "$111,000" or "$0.81"
        currencySymbol: currencySymbol,
        expiryString: formatToUTC(market.expiryTimestamp),
        statusString: getStatusString(market.state),
        statusClassName: `status-${getStatusString(market.state).toLowerCase().replace(/[^a-z0-9]+/g, '-')}` // for CSS class
    };
};