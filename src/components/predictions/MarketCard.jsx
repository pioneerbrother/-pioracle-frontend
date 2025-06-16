// src/components/predictions/MarketCard.jsx
import React from 'react';
import { Link } from 'react-router-dom';
import { getMarketIcon } from '../../utils/marketutils'; 
import './MarketCard.css';

function MarketCard({ market }) {
    if (!market || !market.exists) {
        return null;
    }

    const getStatusColorClass = (status) => {
        switch (status) {
            case 'Open': return 'status-open';
            case 'Resolved': return 'status-resolved';
            case 'Closed': return 'status-closed';
            default: return 'status-unknown';
        }
    };
    
    // --- THE CORRECTED LINE ---
    // Pass the assetSymbol to the icon function, not the title.
    const iconSrc = getMarketIcon(market.assetSymbol);

    return (
        <div className="market-card-v2"> 
            <Link to={`/predictions/${market.id}`} className="card-link-wrapper-v2">
                <div className="card-top-section">
                    <div className="card-icon-container">
                        <img src={iconSrc} alt={`${market.title} icon`} className="card-icon" />
                    </div>
                    <h3 className="card-title-v2">{market.title}</h3>
                </div>
                
                <div className="card-details-grid">
                    <div className="detail-item">
                        <span className="detail-label">Target</span>
                        <span className="detail-value">{market.targetDisplay}</span>
                    </div>
                    <div className="detail-item">
                        <span className="detail-label">Expires</span>
                        <span className="detail-value">{market.expiryString}</span>
                    </div>
                    <div className="detail-item">
                        <span className="detail-label">Pool</span>
                        <span className="detail-value">{market.totalPool} {market.nativeTokenSymbol || 'MATIC'}</span>
                    </div>
                </div>

                <div className="card-footer-v2">
                    <span className={`card-status-badge ${getStatusColorClass(market.statusString)}`}>
                        {market.statusString}
                    </span>
                    <span className="view-market-prompt">Predict Now →</span>
                </div>
            </Link>
        </div>
    );
}

export default MarketCard;