// src/layouts/MainLayout.jsx
import React, { useContext, useEffect } from 'react';
import { WalletContext } from '../pages/WalletProvider';

export default function MainLayout({ children }) {
    const { isConnected, isInitialized } = useContext(WalletContext);

    useEffect(() => {
        if (isInitialized) {
            console.log(`Wallet connection status: ${isConnected ? 'Connected' : 'Disconnected'}`);
        }
    }, [isConnected, isInitialized]);

    return (
        <div className="app-container">
            {children}
        </div>
    );
}