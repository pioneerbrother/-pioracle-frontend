// src/components/predictions/MarketCard.jsx
import React from 'react';
import { Link } from 'react-router-dom';
import { getMarketDisplayProperties } from '../../utils/MarketDisplayUtils'; // Adjust path
import './MarketCard.css';

function MarketCard({ market }) {
    if (!market || !market.exists) {
        return null;
    }

    const {
        displayId,
        title,        // Use this for the main card title
        question,     // Could be used on hover, or as a subtitle
        targetDisplay,
        expiryString,
        statusString,
        statusClassName
    } = getMarketDisplayProperties(market);

    return (
        <li className="market-card">
            <Link to={`/predictions/${market.id}`} className="market-card-link" title={question}> {/* Full question on hover */}
                <div className="market-card-header">
                    <h3 className="market-card-title">{title}</h3> {/* Concise Title */}
                    <span className={`market-card-status ${statusClassName}`}>{statusString}</span>
                </div>
                <div className="market-card-body">
                    {/* Optional: If title is very short, display the question or part of it */}
                    {/* <p className="market-card-question-preview">{question.substring(0, 50)}...</p> */}
                    <p className="market-card-target-price">
                        Target: <strong>{targetDisplay}</strong>
                    </p>
                </div>
                <div className="market-card-footer">
                    <p className="market-card-expiry">
                        Expires: {expiryString}
                    </p>
                </div>
            </Link>
        </li>
    );
}

export default MarketCard;
