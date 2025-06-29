// src/components/predictions/MarketCard.jsx
import React from 'react';
import { Link } from 'react-router-dom';
// NO LONGER import getMarketIcon
import './MarketCard.css';

function MarketCard({ market }) {
    // The 'market' object from props already has everything calculated.
    if (!market || !market.exists) return null;

    // A helper function for status color can stay here.
    const getStatusColorClass = (status) => {
        if (status === 'Open') return 'status-open';
        if (status === 'Resolved' || status === 'Closed') return 'status-resolved';
        return 'status-closed'; // Default
    };

    // The icon path comes directly from the 'market' prop.
    const iconSrc = market.icon || '/images/icons/default-icon.png'; // Use prop, with a fallback.

    // Default to 50/50 if probabilities are missing, which is good practice.
    const yesProb = market.yesProbability || 50;
    // Calculate noProb from yesProb to always sum to 100
    const noProb = 100 - yesProb;

    return (
        <div className="market-card-v2"> 
            <Link to={`/predictions/${market.id}`} className="card-link-wrapper-v2">
                <div className="card-top-section">
                    <div className="card-icon-container">
                        <img src={iconSrc} alt={`${market.title} icon`} className="card-icon" />
                    </div>
                    <h3 className="card-title-v2">{market.title}</h3>
                </div>

                <div className="card-probability-section">
                    <div className="outcome-probability yes">
                        <span className="outcome-label">YES</span>
                        <span className="outcome-percent">{Math.round(yesProb)}%</span>
                    </div>
                    <div className="probability-bar">
                        <div className="probability-fill" style={{ width: `${yesProb}%` }}></div>
                    </div>
                    <div className="outcome-probability no">
                        <span className="outcome-label">NO</span>
                        <span className="outcome-percent">{Math.round(noProb)}%</span>
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