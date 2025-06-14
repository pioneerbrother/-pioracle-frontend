// src/components/common/Footer.jsx
import React from 'react';
import { Link } from 'react-router-dom';
import './Footer.css'; // We will create this for styling

function Footer() {
    const currentYear = new Date().getFullYear();

    return (
        <footer className="site-footer">
            <div className="footer-content">
                <div className="footer-section about">
                    <h1 className="logo-text">PiOracle</h1>
                    <p>
                        A decentralized prediction market platform where you can forecast events, create your own markets, and engage with the wisdom of the crowd.
                    </p>
                </div>

                <div className="footer-section links">
                    <h2>Quick Links</h2>
                    <ul>
                        <li><Link to="/predictions">Open Markets</Link></li>
                        <li><Link to="/create-market">Create a Market</Link></li>
                        <li><Link to="/blog">Our Blog</Link></li>
                        <li><Link to="/guide">How It Works</Link></li>
                    </ul>
                </div>

                <div className="footer-section social">
                    <h2>Follow Us</h2>
                    {/* Replace '#' with your actual social media links */}
                    <a href="#" target="_blank" rel="noopener noreferrer">X (Twitter)</a>
                    <a href="#" target="_blank" rel="noopener noreferrer">Telegram</a>
                    <a href="#" target="_blank" rel="noopener noreferrer">Discord</a>
                </div>
            </div>
            <div className="footer-bottom">
                © {currentYear} PiOracle.online | All Rights Reserved
            </div>
        </footer>
    );
}

export default Footer;