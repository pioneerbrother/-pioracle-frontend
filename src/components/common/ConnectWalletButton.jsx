// src/components/common/ConnectWalletButton.jsx
import React, { useContext } from 'react';
import { WalletContext } from '../../pages/WalletProvider'; // Adjust path if WalletProvider is elsewhere
import './ConnectWalletButton.css'; // We'll create this for styling

function ConnectWalletButton() {
    const walletContextValues = useContext(WalletContext);
       console.log("CWB_DEBUG: Rendering. Context available:", !!walletContextValues);
    if (walletContextValues) {
        console.log("CWB_DEBUG: Context values - web3ModalInstance exists:", !!walletContextValues.web3ModalInstance, "InitError:", walletContextValues.web3ModalInitError, "isConnecting:", walletContextValues.isConnecting);
    } 

    if (!walletContextValues) {
        // This can happen if the component is rendered outside WalletProvider,
        // or if context is not yet available during an initial render pass.
        // You might want a more robust loading or error state here.
        return <button className="connect-wallet-button" disabled>Loading Context...</button>;
    }

    const {
        walletAddress,
        connectWallet,
        disconnectWallet, // Make sure this is named disconnectWalletF in WalletProvider context value
        isConnecting,
        connectionStatus,
        web3ModalInstance, // To check if modal is ready
        web3ModalInitError
    } = walletContextValues;

    if (walletAddress) {
        return (
            <div className="wallet-info-container">
                <span className="wallet-address-display">
                    Connected: {walletAddress.substring(0, 6)}...{walletAddress.substring(walletAddress.length - 4)}
                </span>
                <button onClick={disconnectWallet} className="connect-wallet-button disconnect-button">
                    Disconnect
                </button>
            </div>
        );
    }

    let buttonText = "Connect Wallet";
    if (isConnecting) {
        buttonText = "Connecting...";
    } else if (web3ModalInitError) {
        buttonText = "Connection Error";
    } else if (!web3ModalInstance && !web3ModalInitError) { 
        // Only show "Modal Loading..." if no error and instance not yet set
        // This usually resolves very quickly.
        buttonText = "Loading..."; 
    }


    const isDisabled = isConnecting || !web3ModalInstance || !!web3ModalInitError;

    return (
        <button
            onClick={connectWallet}
            className="connect-wallet-button"
            disabled={isDisabled}
        >
            {buttonText}
        </button>
    );
}

export default ConnectWalletButton;