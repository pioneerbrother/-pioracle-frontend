// src/pages/BlogPostPaywallPage.jsx
import React, { useState, useEffect, useContext, useMemo } from 'react';
import { ethers } from 'ethers';
import { WalletContext } from './WalletProvider';

// ABIs and Config
import PAYWALL_ABI from '../config/abis/PremiumContent.json'; 
import IERC20_ABI from '../config/abis/IERC20.json';
import { getConfigForChainId } from '../config/contractConfig';

// Components
import LoadingSpinner from '../components/common/LoadingSpinner';
import ErrorMessage from '../components/common/ErrorMessage';
import ConnectWalletButton from '../components/common/ConnectWalletButton';
import ReactMarkdown from 'react-markdown'; // To render the article

// --- ARTICLE CONFIGURATION ---
const ARTICLE_SLUG = "fictional-invasion-scenario-turkey-israel";
// This contentId MUST match the one used in your backend Netlify function
const CONTENT_ID_HASH = ethers.utils.id(ARTICLE_SLUG); 

// A short, public teaser for the article
const ARTICLE_TEASER = `
# The Barbarossa of the Levant: A Strategic Analysis of Operation Fatih'in Kılıcı

**A PiOracle Exclusive Intelligence Briefing**
**Authored by:** Dr. Aris Thorne

For over seventy years, the geopolitical landscape of the Middle East was built upon a set of core assumptions... On November 17, 2025, the Turkish Armed Forces shattered all three in a campaign of shocking speed and finality.

**To read the full, in-depth strategic analysis, please unlock access below.**
`;
// --- END CONFIGURATION ---

function BlogPostPaywallPage() {
    const { walletAddress, signer, chainId, nativeTokenSymbol, connectWallet } = useContext(WalletContext);
    
    // UI State
    const [isUnlocked, setIsUnlocked] = useState(false);
    const [needsApproval, setNeedsApproval] = useState(true);
    const [isLoading, setIsLoading] = useState(true);
    const [status, setStatus] = useState({ text: '', type: '' });
    const [fullContent, setFullContent] = useState('');

    // Ethers Contract Instances
    const currentNetworkConfig = useMemo(() => getConfigForChainId(chainId), [chainId]);
    const paywallAddress = currentNetworkConfig?.premiumContentPaywallAddress;
    const usdcAddress = currentNetworkConfig?.paymentTokenAddress; // Assuming you add this to your config

    const paywallContract = useMemo(() => {
        if (!signer || !paywallAddress) return null;
        return new ethers.Contract(paywallAddress, PAYWALL_ABI, signer);
    }, [signer, paywallAddress]);

    const usdcContract = useMemo(() => {
        if (!signer || !usdcAddress) return null;
        return new ethers.Contract(usdcAddress, IERC20_ABI, signer);
    }, [signer, usdcAddress]);


    // Effect to check access status and allowance
    useEffect(() => {
        if (!paywallContract || !usdcContract || !walletAddress) {
            setIsLoading(false);
            return;
        }

        const checkAccessAndAllowance = async () => {
            setIsLoading(true);
            try {
                const userHasAccess = await paywallContract.hasAccess(CONTENT_ID_HASH, walletAddress);
                setIsUnlocked(userHasAccess);

                if (!userHasAccess) {
                    const requiredPrice = await paywallContract.contentPrice();
                    const currentAllowance = await usdcContract.allowance(walletAddress, paywallContract.address);
                    setNeedsApproval(currentAllowance.lt(requiredPrice));
                } else {
                    setNeedsApproval(false); // Already paid, no approval needed
                }
            } catch (e) {
                console.error("Error checking access/allowance:", e);
                setStatus({ text: "Could not verify access status. Please refresh.", type: 'error' });
            } finally {
                setIsLoading(false);
            }
        };

        checkAccessAndAllowance();
    }, [paywallContract, usdcContract, walletAddress]);
    
    // Effect to fetch secure content AFTER unlocking
    useEffect(() => {
        if (!isUnlocked || !signer || !walletAddress) return;

        const fetchContent = async () => {
            setIsLoading(true);
            setStatus({ text: 'Access verified. Fetching secure content...', type: 'info' });
            try {
                const message = `I am proving ownership of my address to read article: ${ARTICLE_SLUG}`;
                const signature = await signer.signMessage(message);

                const response = await fetch('/.netlify/functions/get-premium-content', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ walletAddress, signature, chainId }),
                });

                const data = await response.json();

                if (!response.ok) {
                    throw new Error(data.error || 'Failed to fetch content from server.');
                }

                setFullContent(data.content);
                setStatus({ text: '', type: '' });
            } catch (err) {
                console.error("Content fetch error:", err);
                setStatus({ text: `Error fetching content: ${err.message}`, type: 'error' });
            } finally {
                setIsLoading(false);
            }
        };

        fetchContent();
    }, [isUnlocked, signer, walletAddress, chainId]);

    const handleApprove = async () => {
        if (!usdcContract || !paywallAddress) return;
        setIsLoading(true);
        setStatus({ text: 'Please confirm approval in your wallet...', type: 'info' });
        try {
            const requiredPrice = await paywallContract.contentPrice();
            const tx = await usdcContract.approve(paywallAddress, requiredPrice);
            await tx.wait(1);
            setStatus({ text: 'Approval successful! You can now unlock the content.', type: 'success' });
            setNeedsApproval(false);
        } catch (err) {
            setStatus({ text: `Error: ${err.reason || "Approval failed."}`, type: 'error' });
        } finally {
            setIsLoading(false);
        }
    };

    const handleUnlock = async () => {
        if (!paywallContract) return;
        setIsLoading(true);
        setStatus({ text: 'Please confirm payment in your wallet...', type: 'info' });
        try {
            const tx = await paywallContract.unlockContent(CONTENT_ID_HASH);
            await tx.wait(1);
            setStatus({ text: 'Payment successful! Unlocking article...', type: 'success' });
            setIsUnlocked(true); // This will trigger the fetchContent useEffect
        } catch (err) {
            setStatus({ text: `Error: ${err.reason || "Payment failed."}`, type: 'error' });
        } finally {
            setIsLoading(false); // The fetchContent effect will handle its own loading state
        }
    };

    // --- RENDER LOGIC ---

    if (isLoading) {
        return <div className="page-container"><LoadingSpinner message={status.text || "Verifying access..."} /></div>;
    }

    if (isUnlocked) {
        return (
            <div className="page-container blog-post-page">
                <article className="blog-content">
                    {fullContent ? <ReactMarkdown>{fullContent}</ReactMarkdown> : <LoadingSpinner message="Loading content..." />}
                </article>
            </div>
        );
    }
    
    // Render the Paywall
    return (
        <div className="page-container blog-post-page">
            <article className="blog-content teaser">
                <ReactMarkdown>{ARTICLE_TEASER}</ReactMarkdown>
            </article>

            <div className="paywall-card">
                <h2>Unlock Full Access</h2>
                <p>Gain permanent access to this exclusive analysis for **1,000,000 USDC** on the {currentNetworkConfig?.name || 'supported network'}.</p>
                
                {!walletAddress ? (
                    <ConnectWalletButton />
                ) : (
                    <div className="button-group">
                        {needsApproval ? (
                            <button onClick={handleApprove} disabled={isLoading}>
                                {isLoading ? "Approving..." : "1. Approve USDC"}
                            </button>
                        ) : (
                            <button onClick={handleUnlock} disabled={isLoading}>
                                {isLoading ? "Processing Payment..." : "2. Unlock Content"}
                            </button>
                        )}
                    </div>
                )}
                {status.text && <p className={`message ${status.type}`}>{status.text}</p>}
            </div>
        </div>
    );
}

export default BlogPostPaywallPage;