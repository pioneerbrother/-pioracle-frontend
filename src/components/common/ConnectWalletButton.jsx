// src/components/common/ConnectWalletButton.jsx

import React, { useContext } from 'react';
import { WalletContext } from '../../pages/WalletProvider'; // Make sure this path is correct
import './ConnectWalletButton.css'; 

function ConnectWalletButton() {
    // 1. Consume the context to get the wallet state and functions.
    const { walletAddress, chainId, connectWallet, disconnectWallet } = useContext(WalletContext);

    // If a wallet is connected, show the address and a disconnect button.
    if (walletAddress) {
        const truncatedAddress = `${walletAddress.substring(0, 6)}...${walletAddress.substring(walletAddress.length - 4)}`;
        
        return (
            <div className="wallet-widget-container connected">
                <span className="wallet-address" title={`Connected to Chain ID: ${chainId}`}>
                    <span className="connection-indicator-dot"></span>
                    {truncatedAddress}
                </span>
                <button onClick={disconnectWallet} className="disconnect-button pioracle-button">
                    Disconnect
                </button>
            </div>
        );
    }

    // If no wallet is connected, show the main connect button.
    // The onClick handler is now correctly wired to the connectWallet function from the context.
    return (
        <button onClick={connectWallet} className="connect-wallet-button pioracle-button">
            Connect Wallet
        </button>
    );
}

export default ConnectWalletButton;


