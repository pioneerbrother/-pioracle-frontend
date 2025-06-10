// src/components/common/Header/Header.jsx
import React, { useState, useContext, useEffect, useRef } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { WalletContext } from '../../../pages/WalletProvider'; // Assuming WalletProvider is in src/pages/
import ConnectWalletButton from '../ConnectWalletButton/ConnectWalletButton';
import './Header.css';
// import { FaBars, FaTimes } from 'react-icons/fa'; // Optional: for icons

function Header() {
    const { walletAddress } = useContext(WalletContext) || {};
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const location = useLocation();
    const headerRef = useRef(null);

    const toggleMobileMenu = () => setIsMobileMenuOpen(!isMobileMenuOpen);
    const closeMobileMenu = () => setIsMobileMenuOpen(false);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (headerRef.current && !headerRef.current.contains(event.target)) {
                closeMobileMenu();
            }
        };
        if (isMobileMenuOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        } else {
            document.removeEventListener('mousedown', handleClickOutside);
        }
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isMobileMenuOpen]);

    useEffect(() => {
        closeMobileMenu();
    }, [location]);

    // Define which links require a wallet to be shown
    const navLinks = (
        <>
            <NavLink to="/predictions" className={({ isActive }) => isActive ? "nav-item active" : "nav-item"} onClick={closeMobileMenu}>
                Open Markets
            </NavLink>
            <NavLink to="/resolved-markets" className={({ isActive }) => isActive ? "nav-item active" : "nav-item"} onClick={closeMobileMenu}>
                Recently Resolved
            </NavLink>
            {walletAddress && (
                <NavLink to="/my-predictions" className={({ isActive }) => isActive ? "nav-item active" : "nav-item"} onClick={closeMobileMenu}>
                    My Predictions
                </NavLink>
            )}
            {/* Make "Create Market" always visible, page itself will prompt for wallet if needed */}
            <NavLink to="/create-market" className={({ isActive }) => isActive ? "nav-item active special-action" : "nav-item special-action"} onClick={closeMobileMenu}>
                Create Market
            </NavLink>
            <NavLink to="/guide" className={({ isActive }) => isActive ? "nav-item active" : "nav-item"} onClick={closeMobileMenu}>
                Guide / How It Works
            </NavLink>
        </>
    );

    return (
        <header className="app-header" ref={headerRef}>
            <div className="header-content">
                <Link to="/predictions" className="logo-link" onClick={closeMobileMenu}> {/* Changed to /predictions if that's home */}
                    {/* Option 1: Image Logo (ensure path is correct from public folder) */}
                    {/* <img src="/pioracle_logo_text_dark.png" alt="PiOracle Logo" className="logo-image" /> */}
                    {/* Option 2: Text Logo (as per your original) */}
                    <h1 className="logo-text">PiOracle</h1>
                </Link>

                <nav className="desktop-nav">
                    {navLinks}
                </nav>

                <div className="header-actions">
                    <ConnectWalletButton />
                    <button className="hamburger-button" onClick={toggleMobileMenu} aria-label="Toggle menu" aria-expanded={isMobileMenuOpen}>
                        {isMobileMenuOpen ? '✕' : '☰'}
                        {/* {isMobileMenuOpen ? <FaTimes /> : <FaBars />} */}
                    </button>
                </div>
            </div>

            {isMobileMenuOpen && (
                <nav className="mobile-nav-menu">
                    {navLinks}
                </nav>
            )}
        </header>
    );
}

export default Header;