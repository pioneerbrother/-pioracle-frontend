// src/components/WalletStatus.jsx

import React, { useContext } from 'react';
import { WalletContext } from '../context/WalletContext'; // <-- Updated path
import './WalletStatus.css'; // <-- New CSS file needed

export default function WalletStatus() {
    const { 
        status, address, chainId, error,
        connectWallet, disconnectWallet
    } = useContext(WalletContext);

    const truncatedAddress = address ? `${address.substring(0, 6)}...${address.substring(address.length - 4)}` : null;

    if (!status) return null; // Wait for provider to be ready

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