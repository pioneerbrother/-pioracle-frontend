// pioracle/src/components/common/StatusBadge.jsx
import React from 'react';
import './StatusBadge.css'; // Ensure this CSS file exists

// Consistent MarketState enum
const MarketState = {
    Open: 0,
    Resolvable: 1,
    Resolved_YesWon: 2, // Updated from Resolved_AboveWon
    Resolved_NoWon: 3,  // Updated from Resolved_BelowWon
    Resolved_Push: 4,
};

const getStatusInfo = (statusEnum) => {
    switch (Number(statusEnum)) { // Ensure statusEnum is treated as a number
        case MarketState.Open: return { text: "Open", className: "open" };
        case MarketState.Resolvable: return { text: "Resolving", className: "resolving" };
        case MarketState.Resolved_YesWon: return { text: "Resolved: YES Won", className: "resolved-yes" };
        case MarketState.Resolved_NoWon: return { text: "Resolved: NO Won", className: "resolved-no" };
        case MarketState.Resolved_Push: return { text: "Push (Refunded)", className: "push" };
        default: return { text: `Unknown (${statusEnum})`, className: "unknown" };
    }
};

function StatusBadge({ status }) {
    if (status === undefined || status === null) {
        // Handle cases where status might not be loaded yet, or default
        return <span className="status-badge status-unknown">Loading...</span>;
    }
    const { text, className } = getStatusInfo(status);
    return (
        <span className={`status-badge status-${className}`}>
            {text}
        </span>
    );
}

export default StatusBadge;