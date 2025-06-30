// src/pages/ExclusivePostPage.jsx
import React, { useState, useEffect, useContext, useMemo } from 'react';
import { ethers } from 'ethers';
import { WalletContext } from './WalletProvider';

import PAYWALL_ABI from '../config/abis/PremiumContent.json'; 
import IERC20_ABI from '../config/abis/IERC20.json';
import { getConfigForChainId } from '../config/contractConfig';

import LoadingSpinner from '../components/common/LoadingSpinner';
import ErrorMessage from '../components/common/ErrorMessage';
import ConnectWalletButton from '../components/common/ConnectWalletButton';
import ReactMarkdown from 'react-markdown';

const ARTICLE_SLUG = "invasion-plan-of-turkey-en"; // Match the URL slug
const CONTENT_ID_HASH = ethers.utils.id(ARTICLE_SLUG); 
const ARTICLE_TEASER = `
# The Barbarossa of the Levant: A Strategic Analysis of Operation Fatih'in Kılıcı
**A PiOracle Exclusive Intelligence Briefing**
For over seventy years, the geopolitical landscape of the Middle East was built upon a set of core assumptions...
**To read the full, in-depth strategic analysis, please unlock access below.**
`;

function ExclusivePostPage() {
    const { walletAddress, signer, chainId, connectWallet, nativeTokenSymbol, 
        isInitialized} = useContext(WalletContext);
    
    const [isUnlocked, setIsUnlocked] = useState(false);
    const [needsApproval, setNeedsApproval] = useState(true);
    const [isLoading, setIsLoading] = useState(true); // Start loading immediately
    const [status, setStatus] = useState({ text: '', type: '' });
    const [fullContent, setFullContent] = useState('');
    
    const currentNetworkConfig = useMemo(() => getConfigForChainId(chainId), [chainId]);
    const paywallAddress = currentNetworkConfig?.premiumContentPaywallAddress;
    const usdcAddress = currentNetworkConfig?.paymentTokenAddress;

    const paywallContract = useMemo(() => {
        if (!signer || !paywallAddress) return null;
        return new ethers.Contract(paywallAddress, PAYWALL_ABI, signer);
    }, [signer, paywallAddress]);

    const usdcContract = useMemo(() => {
        if (!signer || !usdcAddress) return null;
        return new ethers.Contract(usdcAddress, IERC20_ABI, signer);
    }, [signer, usdcAddress]);


    useEffect(() => {
        // This effect now only checks access and allowance
        if (!paywallContract || !usdcContract || !walletAddress) {
            // If we don't have what we need, stop loading but don't show an error yet.
            // The user will be prompted to connect their wallet.
            setIsLoading(false);
            return;
        }

        const checkAccessAndAllowance = async () => {
            setIsLoading(true); // Set loading true for this async operation
            setStatus({text: 'Verifying access on-chain...', type: 'info'});
            try {
                const userHasAccess = await paywallContract.hasAccess(CONTENT_ID_HASH, walletAddress);
                setIsUnlocked(userHasAccess);

                if (!userHasAccess) {
                    const requiredPrice = await paywallContract.contentPrice();
                    const currentAllowance = await usdcContract.allowance(walletAddress, paywallContract.address);
                    setNeedsApproval(currentAllowance.lt(requiredPrice));
                    setStatus({text: '', type: ''}); // Clear status after check
                } else {
                    setNeedsApproval(false);
                    setStatus({text: 'Access previously granted.', type: 'success'});
                }
            } catch (e) {
                console.error("Error checking access/allowance:", e);
                setStatus({ text: "Could not verify access status. Please ensure you're on a supported network (BNB or Polygon) and refresh.", type: 'error' });
            } finally {
                setIsLoading(false); // IMPORTANT: Ensure loading is set to false in all paths
            }
        };

        checkAccessAndAllowance();
    }, [paywallContract, usdcContract, walletAddress]);
    
    useEffect(() => {
        // This effect ONLY fetches content WHEN unlocked
        if (!isUnlocked || !signer || !walletAddress) return;

        const fetchContent = async () => {
            setIsLoading(true);
            setStatus({ text: 'Access verified. Fetching secure content...', type: 'info' });
            try {
                // ... (the fetch logic with signed message remains the same) ...
                const message = `I am proving ownership of my address to read article: ${ARTICLE_SLUG}`;
                const signature = await signer.signMessage(message);
                const response = await fetch('/.netlify/functions/get-premium-content', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ walletAddress, signature, chainId }),
                });
                const data = await response.json();
                if (!response.ok) throw new Error(data.error || 'Failed to fetch content.');
                setFullContent(data.content);
                setStatus({ text: '', type: '' });
            } catch (err) {
                setStatus({ text: `Error fetching content: ${err.message}`, type: 'error' });
            } finally {
                setIsLoading(false);
            }
        };

        fetchContent();
    }, [isUnlocked, signer, walletAddress, chainId]);

    const handleApprove = async () => { /* ... same as before ... */ };
    const handleUnlock = async () => { /* ... same as before ... */ };

    // --- RENDER LOGIC ---

    if (!isInitialized && !walletAddress) { // A check from WalletContext might be useful
         return <div className="page-container"><LoadingSpinner message="Initializing..." /></div>;
    }
    
    // The rest of the return statement from the previous message is correct.
    // The key part to check is the button's disabled state:
    // <button onClick={handleApprove} disabled={isLoading}>
    // ...
    // This is correct. The problem was that `setIsLoading(false)` was not being called in all code paths.
    
    if (isUnlocked) { /* ... return full content ... */ }

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
                        {isLoading ? (
                             <LoadingSpinner message={status.text || "Verifying..."} />
                        ) : needsApproval ? (
                            <button onClick={handleApprove}>1. Approve USDC</button>
                        ) : (
                            <button onClick={handleUnlock}>2. Unlock Content</button>
                        )}
                    </div>
                )}
                {status.text && !isLoading && <p className={`message ${status.type}`}>{status.text}</p>}
            </div>
        </div>
    );
}

export default ExclusivePostPage;