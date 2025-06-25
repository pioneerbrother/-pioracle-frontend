// src/components/common/ConnectWalletButton.jsx
import React, { useContext } from 'react';
import { WalletContext } from '../../pages/WalletProvider'; 
import './ConnectWalletButton.css'; 

function ConnectWalletButton() {
    const context = useContext(WalletContext);

    if (!context || !context.isInitialized) {
        return <button className="connect-wallet-button pioracle-button" disabled>Loading...</button>;
    }

    const {
        walletAddress,
        chainId,              // Actual connected chain from MetaMask
        nativeTokenSymbol,    // Symbol of the connected chain (e.g., MATIC, BNB)
        connectWallet,
        disconnectWallet,
        contract,             // The contract instance from WalletContext (null if unsupported network)
        web3Modal             // To open network switcher
    } = context;

    // A network is considered "unsupported" by the dApp if a wallet is connected,
    // a chainId is present, BUT we failed to get a contract instance for it.
    const isUnsupportedByDApp = walletAddress && chainId && !contract;

    const handleInteraction = () => {
        if (!walletAddress) {
            connectWallet();
        } else if (isUnsupportedByDApp && web3Modal) {
            // If on an unsupported chain, open Web3Modal's network switcher
            web3Modal.open({ view: 'Networks' });
        }
        // If connected and supported, clicking the address part might do nothing,
        // or you could add other functionality (e.g., link to block explorer).
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
                        <span className="connection-indicator-dot"></span> {/* Green dot */}
                        {truncatedAddress}
                    </span>
                )}
                <button onClick={disconnectWallet} className="disconnect-button pioracle-button">
                    Disconnect
                </button>
            </div>
        );
    }

    // Case 2: No wallet is connected.
    return (
        <button onClick={connectWallet} className="connect-wallet-button pioracle-button">
            Connect Wallet
        </button>
    );
}

export default ConnectWalletButton;

