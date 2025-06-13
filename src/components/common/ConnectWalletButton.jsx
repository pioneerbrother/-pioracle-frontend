import React, { useContext } from 'react';
// IMPORTANT: Adjust this import path if your WalletProvider.jsx is located elsewhere!
import { WalletContext } from '../../pages/WalletProvider'; 
import './ConnectWalletButton.css'; // Optional: for styling

function ConnectWalletButton() {
    // 1. Get all necessary states from the WalletContext
    const context = useContext(WalletContext);

    // 2. Guard Clause: If the button is rendered outside the provider, show an error state.
    if (!context) {
        console.error("ConnectWalletButton must be used within a WalletProvider.");
        return <button className="connect-wallet-button" disabled>Context Error</button>;
    }

    const {
        walletAddress,
        isConnecting,
        connectionStatus,
        connectWallet,
        disconnectWallet,
        web3ModalInstanceExists, // This is key to solving the "stuck on loading" issue
        chainId,
        loadedTargetChainIdNum,
    } = context;

    // --- RENDER LOGIC ---

    // CASE 1: Wallet is connected
    if (walletAddress) {
        const truncatedAddress = `${walletAddress.substring(0, 6)}...${walletAddress.substring(walletAddress.length - 4)}`;

        // Sub-Case: Connected, but to the WRONG network
        if (chainId && loadedTargetChainIdNum && chainId !== loadedTargetChainIdNum) {
            return (
                <div className="wallet-widget-container error-state">
                    <span className="wallet-status-text">Wrong Network</span>
                    <button onClick={disconnectWallet} className="button secondary disconnect-button">
                        Disconnect
                    </button>
                </div>
            );
        }

        // Sub-Case: Connected correctly
        return (
            <div className="wallet-widget-container">
                <span className="wallet-status-text address">{truncatedAddress}</span>
                <button onClick={disconnectWallet} className="button secondary disconnect-button">
                    Disconnect
                </button>
            </div>
        );
    }
    
    // CASE 2: Wallet is NOT connected
    // Sub-Case: The core wallet library (Web3Modal) is still initializing.
    // This prevents the "Connect" button from appearing before it's functional.
    if (!web3ModalInstanceExists) {
        return (
            <button className="connect-wallet-button" disabled>
                Loading...
            </button>
        );
    }
    
    // Sub-Case: Ready to connect. Show the main "Connect Wallet" button.
    return (
        <button
            className="connect-wallet-button"
            onClick={connectWallet}
            disabled={isConnecting}
        >
            {isConnecting ? 'Connecting...' : (connectionStatus.type === 'error' ? 'Try Again' : 'Connect Wallet')}
        </button>
    );
}

export default ConnectWalletButton;