// src/components/predictions/MarketCard.jsx
import React from 'react';
import { Link } from 'react-router-dom';
// We no longer import `getMarketIcon` because the icon path will come from the `market` prop.
import './MarketCard.css';

function MarketCard({ market }) {
    // The 'market' object passed as a prop should already have the .icon property
    // because your PredictionMarketsListPage.jsx now uses getMarketDisplayProperties.
    
    if (!market || !market.exists) {
        // This is a safety net in case a non-existent market is passed.
        return null; 
    }

    // Helper function for status color can stay here.
    const getStatusColorClass = (status) => {
        if (status === 'Open') return 'status-open';
        if (status === 'Resolved') return 'status-resolved';
        // Add more states if needed
        return 'status-closed'; 
    };

    // --- THIS IS WHERE YOU USE THE ICON PROP ---
    // Get the icon source directly from the market object.
    // Provide a default icon in case the logic in marketutils.js fails for some reason.
    const iconSrc = market.icon || '/images/icons/default-icon.png';
    // --- END ---

    // Probabilities also come directly from the market object.
    const yesProb = market.yesProbability !== undefined ? market.yesProbability : 50;
    const noProb = market.noProbability !== undefined ? market.noProbability : 50;

    return (
        // The main container div
        <div className="market-card-v2"> 
            {/* The Link wraps the entire card content, making it all clickable */}
            <Link to={`/predictions/${market.id}`} className="card-link-wrapper-v2">
                
                {/* Section for the icon and title */}
                <div className="card-top-section">
                    <div className="card-icon-container">
                        {/* The new image tag for the icon */}
                        <img src={iconSrc} alt={`${market.title} category icon`} className="card-icon" />
                    </div>
                    <h3 className="card-title-v2">{market.title}</h3>
                </div>

                {/* Section for the YES/NO probability display */}
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

                {/* Footer section with status and call to action */}
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