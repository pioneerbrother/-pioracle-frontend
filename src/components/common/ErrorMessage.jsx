// src/components/common/ErrorMessage.jsx
import React from 'react';

function ErrorMessage({ title = "An Error Occurred", message, onRetry, retryDisabled }) {
    return (
        <div className="error-message-container">
            <h4>{title}</h4>
            <p>{message || "Something went wrong."}</p>
            {onRetry && (
                <button onClick={onRetry} disabled={retryDisabled} className="button">
                    Try Again
                </button>
            )}
        </div>
    );
}

export default ErrorMessage; // This line is correct and should be the last line.