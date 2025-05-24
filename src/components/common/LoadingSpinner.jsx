import React from 'react';
import './LoadingSpinner.css'; // We'll create this CSS file

function LoadingSpinner({ message = "Loading...", size = "default" }) {
    // Size can be 'small', 'default', 'large' to control spinner size via CSS
    return (
        <div className={`loading-spinner-overlay ${size}`}>
            <div className="spinner"></div>
            {message && <p className="loading-message">{message}</p>}
        </div>
    );
}

export default LoadingSpinner;