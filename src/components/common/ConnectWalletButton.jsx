// src/components/common/ConnectWalletButton.jsx
import React, { useContext } from 'react';
// Make sure this path is correct for your project structure
import { WalletContext } from '../../pages/WalletProvider'; 

function ConnectWalletButton() {
    const context = useContext(WalletContext);

    // If the context hasn't loaded yet, it's safer to show a disabled loading state.
    if (!context || !context.isInitialized) {
        return <button disabled>Loading...</button>;
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
        // Sub-case: The connected wallet is on the WRONG network.
        if (chainId !== loadedTargetChainIdNum) {
            return (
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '5px', border: '1px solid orange', borderRadius: '5px' }}>
                    <span style={{ color: 'orange', fontWeight: 'bold' }}>Wrong Network</span>
                    <button onClick={disconnectWallet}>Disconnect</button>
                </div>
            );
        }

        // Sub-case: The wallet is connected correctly.
        const truncatedAddress = `${walletAddress.substring(0, 6)}...${walletAddress.substring(walletAddress.length - 4)}`;
        return (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span>{truncatedAddress}</span>
                <button onClick={disconnectWallet}>Disconnect</button>
            </div>
        );
    }

    // Case 2: No wallet is connected. Show the main connect button.
    return (
        <button onClick={connectWallet}>
            Connect Wallet
        </button>
    );
}

export default ConnectWalletButton;