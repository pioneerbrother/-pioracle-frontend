// pioracle/src/components/common/Header.jsx
import React, { useContext } from 'react';
import { Link } from 'react-router-dom';
import { WalletContext } from '../../context/WalletProvider'; // Adjust path if WalletProvider is elsewhere relative to this
import ConnectWalletButton from './ConnectWalletButton'; // Assuming it's also in common
import './Header.css'; // Create a dedicated CSS file for the header

function Header() {
    const { walletAddress } = useContext(WalletContext); // Get walletAddress if needed for conditional links

    return (
        <header className="app-header">
            <div className="logo-container">
                <Link to="/predictions" className="logo-link">
                    {/* You can place your actual logo image here if you have one */}
                    {/* <img src="/pioracle-logo.png" alt="PiOracle Logo" className="logo-image" /> */}
                    <h1>PiOracle</h1>
                </Link>
            </div>
            <nav className="navigation-links">
                <Link to="/predictions">Open Markets</Link>
                <Link to="/resolved-markets">Recently Resolved</Link>
                {walletAddress && (
                    <Link to="/my-predictions">My Predictions</Link>
                      
                )}
                // In Header.jsx
{walletAddress && ( // Only show if wallet is connected
    <Link to="/create-market">Create Market</Link>
)}
                {/* Example: <Link to="/how-it-works">How It Works</Link> */}
            </nav>
            <div className="wallet-section">
                <ConnectWalletButton />
            </div>
        </header>
    );
}

export default Header;