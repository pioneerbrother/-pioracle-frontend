import React from 'react';
import { Link } from 'react-router-dom'; // If you want to link to other pages, e.g., /predictions
import './GuidePage.css'; // We'll create this for basic styling

function GuidePage() {
    // React 19 Native Head Tags
    const pageTitle = "Guide & How It Works | PiOracle";
    const pageDescription = "Learn how to make predictions, create your own markets, understand fees, and get support on PiOracle.online.";

    return (
        <>
            <title>{pageTitle}</title>
            <meta name="description" content={pageDescription} />
            <meta name="keywords" content="pioracle guide, how to use pioracle, prediction market guide, create market, claim winnings, pioracle fees, pioracle support" />
            {/* Optional Open Graph Tags specific to this page */}
            {/*
            <meta property="og:title" content={pageTitle} />
            <meta property="og:description" content={pageDescription} />
            <meta property="og:url" content="https://pioracle.online/guide" /> 
            */}

            <div className="page-container guide-page">
                <header className="guide-header">
                    <h1>Welcome to PiOracle - Predict the Future, Together!</h1>
                    <p className="intro-text">
                        PiOracle.online is a decentralized prediction market platform built on the Polygon blockchain. 
                        Here, you can test your foresight on various events and cryptocurrency prices, or even 
                        create your own prediction markets for the community!
                    </p>
                </header>

                <section id="for-predictors" className="guide-section">
                    <h2>For Predictors: How to Make Your Predictions</h2>
                    <p>Ready to turn your insights into potential profit? Here’s how:</p>
                    <ol>
                        <li>
                            <strong>Get Set Up on Polygon:</strong>
                            <ul>
                                <li><strong>Wallet:</strong> You'll need a Polygon-compatible crypto wallet. We recommend MetaMask (a browser extension or mobile app).</li>
                                <li><strong>MATIC:</strong> Ensure you have some MATIC tokens in your wallet. MATIC is used for placing predictions and for paying small network transaction fees (gas) on the Polygon network. You can acquire MATIC from most major cryptocurrency exchanges.</li>
                            </ul>
                        </li>
                        <li>
                            <strong>Connect Your Wallet:</strong>
                            Visit <Link to="/">pioracle.online</Link>. Click the "Connect Wallet" button, usually found at the top right of the page, and approve the connection in your wallet.
                        </li>
                        <li>
                            <strong>Browse Open Markets:</strong>
                            Navigate to the "<Link to="/predictions">Open Markets</Link>" section. Here you'll see all currently active prediction markets. Each market will clearly state the question, the target outcome, and when betting closes (the expiry time, shown in UTC).
                        </li>
                        <li>
                            <strong>Make Your Prediction:</strong>
                            Click on a market you're interested in. Decide if you predict "YES" (the condition will be met) or "NO" (it won't). Enter the amount of MATIC you wish to stake. For price-based markets, if the current live price already makes one outcome a certainty, that option will be disabled to ensure fair predictions. Click "Submit Prediction."
                        </li>
                        <li>
                            <strong>Confirm in Your Wallet:</strong>
                            Your wallet (e.g., MetaMask) will pop up asking you to confirm the transaction. This will include your stake amount and a small Polygon network gas fee. Review and confirm.
                        </li>
                        <li>
                            <strong>Check Back & Claim Winnings:</strong>
                            Once a market's betting period ends and the outcome is officially determined, the market will be resolved. Visit the "<Link to="/resolved-markets">Recently Resolved Markets</Link>" page or your "<Link to="/my-predictions">My Predictions</Link>" page. If your prediction was correct, a "Claim Winnings" button will be available. Click it, confirm the gas fee, and your winnings will be sent directly to your wallet!
                        </li>
                    </ol>
                </section>

                <section id="for-creators" className="guide-section">
                    <h2>For Creators: Launch Your Own Prediction Market!</h2>
                    <p>Have an interesting event or price movement you want the community to predict? Create your own market on PiOracle!</p>
                    <ol>
                        <li>
                            <strong>Connect Your Wallet:</strong> Ensure your Polygon wallet is connected to PiOracle.
                        </li>
                        <li>
                            <strong>Navigate to "<Link to="/create-market">Create Market</Link>":</strong> Find the link in the header (visible when your wallet is connected).
                        </li>
                        <li>
                            <strong>Define Your Market Details:</strong>
                            <ul>
                                <li><strong>Market Type:</strong> Choose "Event Market" (you provide resolution details, PiOracle Admin officiates based on them) or "Price Feed Market" (resolved by Chainlink).</li>
                                <li><strong>Question & Symbol:</strong> Clearly state the prediction question. The form will help you generate a unique "Asset Symbol" for the contract based on your question, target, and date.</li>
                                <li><strong>Price Feed Details (for Price Feed Markets):</strong> Select an approved Chainlink oracle and set the target price.</li>
                                <li><strong>Resolution Details (for Event Markets):</strong> Provide unambiguous details and the official source of truth that PiOracle Admin will use to resolve the market.</li>
                                <li><strong>Betting Expiry:</strong> Set the exact date and time (UTC) when betting for your market will close (must be at least 15 minutes in the future).</li>
                                <li><strong>Your Creator Fee:</strong> Set your desired fee (0.00% to 3.00%) that you will earn from each prediction placed on this market. This fee is sent directly to your wallet.</li>
                            </ul>
                        </li>
                        <li>
                            <strong>Pay Listing Fee:</strong>
                            To list your market on PiOracle, there's a one-time listing fee (currently 25 MATIC, paid to the platform). This will be clearly displayed. When you click "Create Market," your wallet will prompt you to confirm the transaction, which includes this fee.
                        </li>
                        <li>
                            <strong>Market Goes Live:</strong>
                            Once your transaction is confirmed, your market is created on the blockchain and will appear in the "Open Prediction Markets" list!
                        </li>
                    </ol>
                    <p><strong>Note for Creators on Event Markets:</strong> PiOracle Admin will resolve your event markets based on the "Resolution Details & Source of Truth" you provide and publicly verifiable information to ensure fairness.</p>
                </section>

                <section id="fees-transparency" className="guide-section">
                    <h2>Our Fees & Transparency</h2>
                    <ul>
                        <li><strong>Platform Listing Fee (for Market Creators):</strong> A one-time fee (currently 25 MATIC, equivalent to ~$5 USD, subject to change by platform admin based on MATIC price) is charged to users for creating a new market. This supports the platform.</li>
                        <li><strong>Market Creator's Prediction Fee (for User-Created Markets):</strong> Market creators can set a fee between 0% and 3% on predictions placed on *their* markets. This fee goes directly to the market creator. PiOracle (the platform) takes **0%** from these predictions.</li>
                        <li><strong>Platform Prediction Fee (for Markets Created by PiOracle Admin):</strong> For any markets created directly by the PiOracle platform itself (not by users), a low 0.5% fee is taken from each prediction stake, which goes to the platform.</li>
                        <li><strong>Blockchain & Immutability:</strong> All market parameters, predictions, fees, and resolutions are recorded on the Polygon blockchain, ensuring transparency and fairness.</li>
                    </ul>
                </section>

                <section id="support" className="guide-section">
                    <h2>Support & Contact</h2>
                    <p>Have questions, need help, or have feedback? We'd love to hear from you!</p>
                    <p>Email us at: <a href="mailto:simo@pinetworkbrotherhood.online">simo@pinetworkbrotherhood.online</a></p>
                    {/* 
                    <p>Join our community:
                        <a href="YOUR_DISCORD_LINK" target="_blank" rel="noopener noreferrer" style={{marginLeft: '10px'}}>Discord</a>
                        <a href="YOUR_TWITTER_LINK" target="_blank" rel="noopener noreferrer" style={{marginLeft: '10px'}}>Twitter</a>
                    </p>
                    */}
                </section>

                <section id="disclaimer" className="guide-section">
                    <h3>Disclaimer</h3>
                    <p>
                        PiOracle.online is a decentralized prediction market platform. Participation involves risks, including the potential loss of staked funds. 
                        Please predict responsibly and never stake more than you can afford to lose. Information provided on this platform is not financial advice. 
                        All market outcomes are based on the predefined rules and sources of truth for each market.
                    </p>
                </section>
            </div>
        </>
    );
}

export default GuidePage;