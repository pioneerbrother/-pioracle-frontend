import React from 'react';
import { Link } from 'react-router-dom';
import './MarketCard.css'; // Create or use your existing CSS file for the card

// The 'market' prop here is expected to be the object returned AFTER
// processing with getMarketDisplayProperties
function MarketCard({ market }) {
    if (!market || !market.exists) {
        // Should not happen if list pages filter out non-existent markets,
        // but good to have a fallback.
        return null; 
    }

    return (
        <li className="market-card-list-item"> {/* Use <li> if MarketList is a <ul> or <ol> */}
            <Link to={`/predictions/${market.id}`} className="market-card-link" title={market.question || market.title}>
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
                        {market.targetDisplay && (
                            <p className="market-info">
                                <span className="info-label">Target:</span> {market.targetDisplay}
                            </p>
                        )}
                    </div>
                    <div className="market-card-footer">
                        {market.expiryString && (
                            <p className="market-info expiry-info">
                                <span className="info-label">Expires:</span> {market.expiryString}
                            </p>
                        )}
                    </div>
                </div>
            </Link>
        </li>
    );
}

export default MarketCard;
