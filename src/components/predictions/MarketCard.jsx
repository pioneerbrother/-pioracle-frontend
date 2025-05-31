// pioracle/src/components/predictions/MarketCard.jsx
import React from 'react';
import { Link } from 'react-router-dom';
import './MarketCard.css'; // Make sure this CSS file exists and is correctly styled

// The 'market' prop here is expected to be the object returned AFTER
// processing with getMarketDisplayProperties from your utils.
// It should contain properties like:
// id, title, question (optional, for tooltips or more detail), 
// targetDisplay, expiryString, statusString, statusClassName, exists,
// resolutionTimestamp (if resolved), state (for conditional display logic)
function MarketCard({ market }) {
    if (!market || !market.exists) {
        // This check is a safeguard; parent components should ideally filter non-existent markets.
        console.warn("MarketCard received invalid or non-existent market:", market);
        return null; 
    }

    // Determine if the market is open to decide on the label for the expiry/closing time
    const isOpen = market.state === 0; // Assuming 0 is MarketState.Open

    return (
        // Using <li> assuming the parent <div className="market-list">
        // has been changed to <ul className="market-list"> for semantic HTML.
        // If market-list remains a div, you can change this <li> back to a <div>.
        <li className="market-card-list-item"> 
            <Link 
                to={`/predictions/${market.id}`} 
                className="market-card-link" 
                title={market.question || market.title} // Show full question on hover
            >
                <div className="market-card">
                    <div className="market-card-header">
                        <h3 className="market-title">{market.title || `Market ID: ${market.id}`}</h3>
                        {market.statusString && market.statusClassName && (
                            <span className={`status-badge ${market.statusClassName}`}>
                                {market.statusString}
                            </span>
                        )}
                    </div>

                    <div className="market-card-body">
                        {/* Display target only if it's meaningful (e.g., not "N/A" or generic "Outcome: YES") */}
                        {market.targetDisplay && 
                         market.targetDisplay !== "N/A" && 
                         market.targetDisplay.toUpperCase() !== "OUTCOME: YES" && (
                            <p className="market-info">
                                <span className="info-label">Target:</span> {market.targetDisplay}
                            </p>
                        )}
                        {/* You could add other brief details here if needed, like total pool size */}
                    </div>

                    <div className="market-card-footer">
                        {market.expiryString && market.expiryString !== "N/A" && (
                            <p className="market-info expiry-info">
                                <span className="info-label">
                                    {isOpen ? "Expires:" : "Betting Closed:"} 
                                </span> {market.expiryString}
                            </p>
                        )}
                        
                        {/* Display resolution time if the market is resolved and has a resolutionTimestamp */}
                        {market.resolutionTimestamp && market.resolutionTimestamp > 0 && !isOpen && (
                             <p className="market-info resolution-info">
                                <span className="info-label">Resolved:</span> 
                                {/* Assuming market.resolutionTimestamp is a Unix epoch in seconds */}
                                {/* You might want to use your formatToUTC util here if not already part of market.resolutionTimestamp display from getMarketDisplayProperties */}
                                {new Date(Number(market.resolutionTimestamp) * 1000).toLocaleDateString('en-US', { 
                                    year: 'numeric', month: 'short', day: 'numeric', 
                                    hour:'2-digit', minute:'2-digit', timeZone:'UTC'
                                }) + " UTC"}
                            </p>
                        )}
                    </div>
                </div>
            </Link>
        </li>
    );
}

export default MarketCard;
