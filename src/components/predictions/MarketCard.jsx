// src/components/predictions/MarketCard.jsx
import React from 'react';
import { Link } from 'react-router-dom';
import { getMarketIcon } from '../../utils/marketutils'; 
import './MarketCard.css';

function MarketCard({ market }) {
    if (!market || !market.exists) return null;

    const getStatusColorClass = (status) => { /* ... (same as before) ... */ };
    const iconSrc = getMarketIcon(market.assetSymbol);

    // Default to 50/50 if probabilities are missing
    const yesProb = market.yesProbability || 50;
    const noProb = market.noProbability || 50;

    return (
        <div className="market-card-v2"> 
            <Link to={`/predictions/${market.id}`} className="card-link-wrapper-v2">
                <div className="card-top-section">
                    <div className="card-icon-container">
                        <img src={iconSrc} alt={`${market.title} icon`} className="card-icon" />
                    </div>
                    <h3 className="card-title-v2">{market.title}</h3>
                </div>

                {/* --- THIS IS THE NEW PROBABILITY DISPLAY --- */}
                <div className="card-probability-section">
                    <div className="outcome-probability yes">
                        <span className="outcome-label">YES</span>
                        <span className="outcome-percent">{yesProb}%</span>
                    </div>
                    <div className="probability-bar">
                        {/* The width of this inner bar is set by the YES probability */}
                        <div className="probability-fill" style={{ width: `${yesProb}%` }}></div>
                    </div>
                    <div className="outcome-probability no">
                        <span className="outcome-label">NO</span>
                        <span className="outcome-percent">{noProb}%</span>
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