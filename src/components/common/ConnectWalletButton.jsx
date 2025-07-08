// src/components/common/ConnectWalletButton.jsx

import React, { useContext } from 'react';

// --- THIS IS THE CORRECTED IMPORT PATH ---
// It goes up two directories from `/common` and `/components` to `src/`, then into `/pages`.
import { WalletContext } from '../../pages/WalletProvider';
// --- END OF CORRECTION ---

import './ConnectWalletButton.css'; // Assuming this file exists and you have styles for it.

function ConnectWalletButton() {
    // Consume the context to get the wallet state and functions.
    const walletContext = useContext(WalletContext);

    // Guard against the initial render before the provider's state is initialized.
    if (!walletContext || !walletContext.isInitialized) {
        return <button className="connect-wallet-button pioracle-button" disabled>Loading...</button>;
    }

    const { walletAddress, connectWallet, disconnectWallet } = walletContext;

    // If a wallet is connected, show the address and a disconnect button.
    if (walletAddress) {
        const truncatedAddress = `${walletAddress.substring(0, 6)}...${walletAddress.substring(walletAddress.length - 4)}`;
        
        return (
            <div className="wallet-widget-container connected">
                <span className="wallet-address">
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
    return (
        <button onClick={connectWallet} className="connect-wallet-button pioracle-button">
            Connect Wallet
        </button>
    );
}

export default ConnectWalletButton;

