// src/components/common/ConnectWalletButton.jsx

import React, { useContext } from 'react';

// --- THIS IS THE CRITICAL FIX ---
// This path correctly goes up two directories from `common` and `components`,
// then into `context` to find the file. The `.jsx` extension is included for safety.
import { WalletContext } from '../../context/WalletContext.jsx';
// --- END OF FIX ---

import './ConnectWalletButton.css'; // Assuming this file exists.

function ConnectWalletButton() {
    // This line will now work because WalletContext is correctly imported.
    const walletContext = useContext(WalletContext);

    // Guard against the initial render before context is available.
    if (!walletContext) {
        return <button className="wallet-button" disabled>Loading...</button>;
    }

    const { walletAddress, isConnected, connectWallet, disconnectWallet } = walletContext;

    if (isConnected && walletAddress) {
        const truncatedAddress = `${walletAddress.substring(0, 6)}...${walletAddress.substring(walletAddress.length - 4)}`;
        return (
            <div className="wallet-connected">
                <span className="wallet-address">{truncatedAddress}</span>
                <button onClick={disconnectWallet} className="wallet-button disconnect">
                    Disconnect
                </button>
            </div>
        );
    }

    return (
        <button onClick={connectWallet} className="wallet-button connect">
            Connect Wallet
        </button>
    );
}

export default ConnectWalletButton;

