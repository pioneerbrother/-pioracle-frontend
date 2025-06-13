// src/components/common/ConnectWalletButton.jsx
import React, { useContext } from 'react';
// Make sure this path is correct for your project structure
import { WalletContext } from '../../pages/WalletProvider'; 
// Import the new CSS file
import './ConnectWalletButton.css'; 

function ConnectWalletButton() {
    const context = useContext(WalletContext);

    // --- THIS IS THE KEY FIX for the loading flash ---
    // If the provider hasn't finished its initial setup, render a simple disabled button.
    // This prevents the button from flashing between different states on load.
    if (!context || !context.isInitialized) {
        return <button className="connect-wallet-button" disabled>Loading...</button>;
    }

    const {
        walletAddress,
        chainId,
        loadedTargetChainIdNum,
        connectWallet,
        disconnectWallet,
    } = context;


    // Case 1: A wallet is connected.
    if (walletAddress) {
        const isWrongNetwork = chainId !== loadedTargetChainIdNum;
        const truncatedAddress = `${walletAddress.substring(0, 6)}...${walletAddress.substring(walletAddress.length - 4)}`;

        return (
            // Use the 'error' class if on the wrong network
            <div className={`wallet-widget-container ${isWrongNetwork ? 'error' : ''}`}>
                <span className="connection-indicator"></span>
                <span className="wallet-address">
                    {isWrongNetwork ? "Wrong Network" : truncatedAddress}
                </span>
                <button onClick={disconnectWallet} className="disconnect-button">Disconnect</button>
            </div>
        );
    }

    // Case 2: No wallet is connected. Show the main connect button.
    return (
        <button onClick={connectWallet} className="connect-wallet-button">
            Connect Wallet
        </button>
    );
}

export default ConnectWalletButton;