// src/components/common/ConnectWalletButton.jsx

import React, { useContext } from 'react';
import { WalletContext } from '../../pages/WalletProvider'; 
import { getConfigForChainId } from '../../config/contractConfig'; // Import this helper
import './ConnectWalletButton.css'; 

function ConnectWalletButton() {
    const context = useContext(WalletContext);

    // Initial loading state check
    if (!context || !context.isInitialized) {
        return <button className="connect-wallet-button pioracle-button" disabled>Loading...</button>;
    }

    const {
        walletAddress,
        chainId,
        nativeTokenSymbol,
        connectWallet,
        disconnectWallet,
        web3Modal
    } = context;

    // --- THIS IS THE COMBINED, ROBUST LOGIC ---
    // We use the direct config check which is more reliable than checking for the contract instance.
    const isUnsupportedByDApp = walletAddress && chainId && !getConfigForChainId(chainId);
    // --- END OF COMBINED LOGIC ---

    const handleInteraction = () => {
        if (!walletAddress) {
            connectWallet();
        } else if (isUnsupportedByDApp && web3Modal) {
            // Your excellent UX feature to open the network switcher
            web3Modal.open({ view: 'Networks' });
        }
    };

    if (walletAddress) {
        const truncatedAddress = `${walletAddress.substring(0, 6)}...${walletAddress.substring(walletAddress.length - 4)}`;

        return (
            <div className={`wallet-widget-container ${isUnsupportedByDApp ? 'error' : 'connected'}`}>
                {isUnsupportedByDApp ? (
                    <button onClick={handleInteraction} className="connect-wallet-button pioracle-button wrong-network">
                        Unsupported Network
                    </button>
                ) : (
                    <span className="wallet-address" title={`Connected to Chain ID: ${chainId} (${nativeTokenSymbol})`}>
                        <span className="connection-indicator-dot"></span>
                        {truncatedAddress}
                    </span>
                )}
                <button onClick={disconnectWallet} className="disconnect-button pioracle-button">
                    Disconnect
                </button>
            </div>
        );
    }

    return (
        <button onClick={connectWallet} className="connect-wallet-button pioracle-button">
            Connect Wallet
        </button>
    );
}

export default ConnectWalletButton;


