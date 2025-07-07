// src/components/common/ConnectWalletButton.jsx
import React, { useContext, useState, useEffect } from 'react';
import { WalletContext } from '../../pages/WalletProvider';
import './ConnectWalletButton.css';

function ConnectWalletButton() {
    const { walletAddress, chainId, isConnected, connectWallet, disconnectWallet } = useContext(WalletContext);
    const [isConnecting, setIsConnecting] = useState(false);
    const [connectionError, setConnectionError] = useState(null);

    const handleConnect = async () => {
        setIsConnecting(true);
        setConnectionError(null);
        try {
            await connectWallet();
            // Add small delay to allow state propagation
            await new Promise(resolve => setTimeout(resolve, 500));
        } catch (error) {
            setConnectionError('Failed to connect wallet');
            console.error('Connection error:', error);
        } finally {
            setIsConnecting(false);
        }
    };

    if (isConnected && walletAddress) {
        const truncatedAddress = `${walletAddress.substring(0, 6)}...${walletAddress.substring(walletAddress.length - 4)}`;
        
        return (
            <div className="wallet-widget-container connected">
                <span className="wallet-address" title={`Connected to Chain ID: ${chainId}`}>
                    <span className="connection-indicator"></span>
                    {truncatedAddress}
                </span>
                <button 
                    onClick={disconnectWallet} 
                    className="disconnect-button"
                    disabled={isConnecting}
                >
                    {isConnecting ? 'Disconnecting...' : 'Disconnect'}
                </button>
                {connectionError && <div className="error-message">{connectionError}</div>}
            </div>
        );
    }

    return (
        <button 
            onClick={handleConnect} 
            className="connect-wallet-button"
            disabled={isConnecting}
        >
            {isConnecting ? 'Connecting...' : 'Connect Wallet'}
        </button>
    );
}

export default ConnectWalletButton;


