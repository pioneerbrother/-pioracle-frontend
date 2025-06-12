// src/components/common/Header.jsx
import React, { useState, useContext, useEffect, useRef } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { WalletContext } from '../../pages/WalletProvider';
import ConnectWalletButton from './ConnectWalletButton'; // ENSURE THIS PATH IS CORRECT

import './Header.css';

function Header() {
    const { walletAddress } = useContext(WalletContext) || {};
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const location = useLocation();
    
    const mobileMenuRef = useRef(null); // Ref for the mobile menu itself
    const hamburgerButtonRef = useRef(null); // Ref for the hamburger button

    const toggleMobileMenu = () => setIsMobileMenuOpen(prev => !prev);
    const closeMobileMenu = () => setIsMobileMenuOpen(false);

    useEffect(() => {
        const handleClickOutside = (event) => {
            // If menu is open, and the click was not on the menu, and not on the hamburger button
            if (isMobileMenuOpen && 
                mobileMenuRef.current && !mobileMenuRef.current.contains(event.target) &&
                hamburgerButtonRef.current && !hamburgerButtonRef.current.contains(event.target)
            ) {
                closeMobileMenu();
            }
        };
        
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isMobileMenuOpen]); // Re-run if isMobileMenuOpen changes

    useEffect(() => {
        // Close mobile menu on route change
        closeMobileMenu();
    }, [location]);

    const navLinks = (
        <>
            <NavLink to="/predictions" className={({ isActive }) => isActive ? "nav-item active" : "nav-item"} onClick={closeMobileMenu}>Open Markets</NavLink>
            <NavLink to="/resolved-markets" className={({ isActive }) => isActive ? "nav-item active" : "nav-item"} onClick={closeMobileMenu}>Recently Resolved</NavLink>
            {walletAddress && (
                <NavLink to="/my-predictions" className={({ isActive }) => isActive ? "nav-item active" : "nav-item"} onClick={closeMobileMenu}>My Predictions</NavLink>
            )}
            <NavLink to="/create-market" className={({ isActive }) => isActive ? "nav-item active special-action" : "nav-item special-action"} onClick={closeMobileMenu}>Create Market</NavLink>
            <NavLink to="/guide" className={({ isActive }) => isActive ? "nav-item active" : "nav-item"} onClick={closeMobileMenu}>Guide / How It Works</NavLink>
        </>
    );

    return (
        <header className="app-header"> {/* Removed headerRef if not needed for entire header */}
            <div className="header-content">
                <Link to="/predictions" className="logo-link" onClick={closeMobileMenu}>
                    <h1 className="logo-text">PiOracle</h1>
                </Link>

                <nav className="desktop-nav">
                    {navLinks}
                </nav>

                <div className="header-actions">
                    <ConnectWalletButton />
                    <button 
                        ref={hamburgerButtonRef} // Assign ref to hamburger
                        className={`hamburger-button ${isMobileMenuOpen ? 'open' : ''}`} 
                        onClick={toggleMobileMenu} 
                        aria-label="Toggle menu" 
                        aria-expanded={isMobileMenuOpen}
                    >
                        {/* Using CSS to create the X from the ☰ for smoother animation often */}
                        <span className="hamburger-line"></span>
                        <span className="hamburger-line"></span>
                        <span className="hamburger-line"></span>
                    </button>
                </div>
            </div>

            {isMobileMenuOpen && (
                <nav className="mobile-nav-menu" ref={mobileMenuRef}> {/* Assign ref to mobile menu */}
                    {navLinks}
                </nav>
            )}
        </header>
    );
}

export default Header;