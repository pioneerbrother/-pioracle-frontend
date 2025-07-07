// src/components/common/Header.jsx
import React, { useState, useContext, useEffect, useRef } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { WalletContext } from '../../context/WalletContext.jsx'; 
import ConnectWalletButton from './ConnectWalletButton';

import './Header.css';

const navLinkClass = ({ isActive }) => isActive ? "nav-item active" : "nav-item";
const specialNavLinkClass = ({ isActive }) => isActive ? "nav-item special-action active" : "nav-item special-action";

function Header() {
    const { walletAddress } = useContext(WalletContext) || {};
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const location = useLocation();
    
    const mobileMenuRef = useRef(null);
    const hamburgerButtonRef = useRef(null);

    const toggleMobileMenu = () => setIsMobileMenuOpen(prev => !prev);
    const closeMobileMenu = () => setIsMobileMenuOpen(false);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (isMobileMenuOpen && 
                mobileMenuRef.current && !mobileMenuRef.current.contains(event.target) &&
                hamburgerButtonRef.current && !hamburgerButtonRef.current.contains(event.target)
            ) {
                closeMobileMenu();
            }
        };
        
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isMobileMenuOpen]);

    useEffect(() => {
        closeMobileMenu();
    }, [location]);

    const navLinks = (
        <>
            <NavLink to="/predictions" className={navLinkClass} onClick={closeMobileMenu}>Open Markets</NavLink>
            <NavLink to="/recently-resolved" className={navLinkClass} onClick={closeMobileMenu}>Recently Resolved</NavLink>
            {walletAddress && (
                <NavLink to="/my-predictions" className={navLinkClass} onClick={closeMobileMenu}>My Predictions</NavLink>
            )}
            <NavLink to="/create-market" className={specialNavLinkClass} onClick={closeMobileMenu}>Create Market</NavLink>
            
            {/* --- ADDED TIP JAR LINK --- */}
            <NavLink to="/tip-jar" className={navLinkClass} onClick={closeMobileMenu}>Tip Jar</NavLink>
            {/* --- END OF ADDED LINK --- */}

            <NavLink to="/blog" className={navLinkClass} onClick={closeMobileMenu}>Blog</NavLink>
            <NavLink to="/guide" className={navLinkClass} onClick={closeMobileMenu}>Guide / How It Works</NavLink>
        </>
    );

    return (
        <header className="app-header">
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
                        ref={hamburgerButtonRef}
                        className={`hamburger-button ${isMobileMenuOpen ? 'open' : ''}`} 
                        onClick={toggleMobileMenu} 
                        aria-label="Toggle menu" 
                        aria-expanded={isMobileMenuOpen}
                    >
                        <span className="hamburger-line"></span>
                        <span className="hamburger-line"></span>
                        <span className="hamburger-line"></span>
                    </button>
                </div>
            </div>

            {isMobileMenuOpen ? (
                <nav className="mobile-nav-menu" ref={mobileMenuRef}>
                    {navLinks}
                </nav>
            ) : null}
        </header>
    );
}

export default Header;