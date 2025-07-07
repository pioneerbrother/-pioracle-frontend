import React, { useContext } from 'react';
import { WalletContext } from '../../pages/WalletProvider';
import './ConnectWalletButton.css';

function ConnectWalletButton() {
    const { 
        walletAddress, 
        isConnected, 
        isConnecting, 
        connectWallet, 
        disconnectWallet 
    } = useContext(WalletContext);

    // Guard for initial render before context is fully ready
    if (!connectWallet) return null;

    if (isConnected && walletAddress) {
        const truncatedAddress = `${walletAddress.substring(0, 6)}...${walletAddress.substring(walletAddress.length - 4)}`;
        
        return (
            <div className="wallet-connected">
                <span className="wallet-address">{truncatedAddress}</span>
                <button 
                    onClick={disconnectWallet}
                    className="wallet-button disconnect"
                >
                    Disconnect
                </button>
            </div>
        );
    }

    return (
        <button
            onClick={connectWallet}
            className={`wallet-button connect ${isConnecting ? 'connecting' : ''}`}
            disabled={isConnecting}
        >
            {isConnecting ? (
                <>
                    <span className="spinner"></span>
                    Connecting...
                </>
            ) : (
                'Connect Wallet'
            )}
        </button>
    );
}

export default ConnectWalletButton;


