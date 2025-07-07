// src/components/WalletStatus.jsx
import React, { useContext } from 'react';
import { WalletContext } from '../pages/WalletProvider';

export default function WalletStatus() {
    const { walletAddress, isConnected, chainId } = useContext(WalletContext);
    
    return (
        <div className="wallet-status">
            <h3>Wallet Connection Status</h3>
            <p>Connected: {isConnected ? 'Yes' : 'No'}</p>
            {isConnected && (
                <>
                    <p>Address: {walletAddress}</p>
                    <p>Chain ID: {chainId}</p>
                </>
            )}
        </div>
    );
}