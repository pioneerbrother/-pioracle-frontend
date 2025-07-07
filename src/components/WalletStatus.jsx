// src/components/WalletStatus.jsx

import React, { useContext } from 'react';
// The import must exactly match the filename, case-sensitively.
import './WalletStatus.css'; 
import { WalletContext } from '../context/WalletContext.jsx'; // Use explicit path for safety

export default function WalletStatus() {
    const { 
        status, address, chainId, error,
        connectWallet, disconnectWallet, isInitialized
    } = useContext(WalletContext);

    // Render nothing until the provider is initialized on the client, to prevent hydration errors.
    if (!isInitialized) {
        return null;
    }
    
    const truncatedAddress = address ? `${address.substring(0, 6)}...${address.substring(address.length - 4)}` : null;

    return (
        <div className="wallet-status-container">
            <h3>Wallet Connection Status</h3>
            
            <div className="status-indicator">
                <span className={`status-dot ${status}`}></span>
                <span className="status-text">{status.charAt(0).toUpperCase() + status.slice(1)}</span>
            </div>

            {status === 'connected' && (
                <div className="connection-details">
                    <p><strong>Address:</strong> {truncatedAddress}</p>
                    <p><strong>Chain ID:</strong> {chainId}</p>
                    <button onClick={disconnectWallet} className="disconnect-button">Disconnect</button>
                </div>
            )}

            {status === 'disconnected' && (
                <button onClick={connectWallet} className="connect-button">Connect Wallet</button>
            )}

            {status === 'error' && (
                <div className="error-message">
                    <p>{error}</p>
                    <button onClick={connectWallet} className="retry-button">Try Again</button>
                </div>
            )}

            {status === 'connecting' && <p>Connecting in your wallet...</p>}
        </div>
    );
}
