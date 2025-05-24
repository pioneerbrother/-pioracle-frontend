// pioracle/src/components/common/ConnectWalletButton.jsx
import React, { useContext } from 'react';
import { WalletContext } from '../../context/WalletProvider'; // Adjust path as needed

function ConnectWalletButton() {
    const { connectWallet, disconnectWallet, walletAddress, connectionStatus } = useContext(WalletContext) || {};

    if (walletAddress) {
        return (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '0.9em' }}>
                    Connected: {walletAddress.substring(0, 6)}...{walletAddress.substring(walletAddress.length - 4)}
                </span>
                <button onClick={disconnectWallet} className="button secondary"> {/* Assuming you have button classes */}
                    Disconnect
                </button>
            </div>
        );
    }

    return (
        <button 
            onClick={connectWallet} 
            disabled={connectionStatus?.type === 'error' || (connectionStatus?.message && connectionStatus.message.includes('MetaMask not detected'))}
            className="button primary" // Assuming you have button classes
        >
            Connect Wallet
        </button>
    );
}

export default ConnectWalletButton;