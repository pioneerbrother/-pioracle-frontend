// src/components/predictions/MarketCard.jsx
import React from 'react';
import { Link } from 'react-router-dom';
import './MarketCard.css'; // We'll create this next

function MarketCard({ market }) {
    if (!market || !market.exists) {
        return null; // Don't render if market data is invalid
    }

    // A helper to determine the card's color scheme based on status
    const getStatusColorClass = (status) => {
        switch (status) {
            case 'Open': return 'status-open';
            case 'Resolved': return 'status-resolved';
            case 'Closed': return 'status-closed';
            default: return 'status-unknown';
        }
    };

    return (
        <div className="market-card">
            <Link to={`/predictions/${market.id}`} className="card-link-wrapper">
                <div className="card-header">
                    <h3 className="card-title">{market.title}</h3>
                    <span className={`card-status-badge ${getStatusColorClass(market.statusString)}`}>
                        {market.statusString}
                    </span>
                </div>
                <div className="card-body">
                    <p className="card-detail">
                        <span className="detail-label">Target:</span> {market.targetDisplay}
                    </p>
                    <p className="card-detail">
                        <span className="detail-label">Expires:</span> {market.expiryString}
                    </p>
                </div>
                <div className="card-footer">
                    <span className="card-volume">
                        Pool: {market.totalPool} {market.nativeTokenSymbol || 'MATIC'}
                    </span>
                    <span className="view-market-prompt">View Market →</span>
                </div>
            </Link>
        </div>
    );
}

export default MarketCard;
