// src/pages/ExclusivePostPage.jsx
import React, { useState, useEffect, useContext, useMemo } from 'react';
import { ethers } from 'ethers';
import { WalletContext } from './WalletProvider';

import PAYWALL_ABI from '../config/abis/PremiumContent.json'; 
import IERC20_ABI from '../config/abis/IERC20.json';
import { getConfigForChainId } from '../config/contractConfig';

import LoadingSpinner from '../components/common/LoadingSpinner';
import ConnectWalletButton from '../components/common/ConnectWalletButton';

const ARTICLE_SLUG = "invasion-plan-of-turkey-en";
const CONTENT_ID_HASH = ethers.utils.id(ARTICLE_SLUG);
const ARTICLE_TEASER = `# The Barbarossa of the Levant...\n\n**Unlock full access below.**`;

function ExclusivePostPage() {
    const { walletAddress, signer, chainId, isInitialized } = useContext(WalletContext);
    
    const [pageState, setPageState] = useState('initializing'); // 'initializing', 'checking', 'needs_approval', 'ready_to_unlock', 'unlocked', 'error'
    const [errorMessage, setErrorMessage] = useState('');
    const [fullContent, setFullContent] = useState('');

    const currentNetworkConfig = useMemo(() => getConfigForChainId(chainId), [chainId]);
    const paywallAddress = currentNetworkConfig?.premiumContentPaywallAddress;
    const usdcAddress = currentNetworkConfig?.paymentTokenAddress;

  const paywallContract = useMemo(() => {
    if (!signer || !paywallAddress) return null;
    // --- THIS IS THE FIX ---
    // The ABI array is often on the .abi property if the JSON is an artifact,
    // or it might be the imported object itself if it's a pure array.
    // The 'PAYWALL_ABI.abi || PAYWALL_ABI' handles both cases robustly.
    const abi = PAYWALL_ABI.abi || PAYWALL_ABI;
    return new ethers.Contract(paywallAddress, abi, signer);
    // --- END OF FIX ---
}, [signer, paywallAddress]);

// The new, correct block for usdcContract
const usdcContract = useMemo(() => {
    if (!signer || !usdcAddress) return null;
    const abi = IERC20_ABI.abi || IERC20_ABI;
    return new ethers.Contract(usdcAddress, abi, signer);
}, [signer, usdcAddress]);

    useEffect(() => {
        console.log("Paywall Effect Triggered. State:", { isInitialized, walletAddress, chainId, contractReady: !!paywallContract });

        if (!isInitialized) {
            setPageState('initializing');
            return;
        }
        if (!walletAddress) {
            setPageState('prompt_connect'); // New state for clarity
            return;
        }
        if (!paywallContract || !usdcContract) {
            setPageState('error');
            setErrorMessage(`App is not configured for this chain (ID: ${chainId}). Please switch to Polygon or BNB Chain.`);
            return;
        }

        const checkAccess = async () => {
            setPageState('checking');
            setErrorMessage('');
            try {
                console.log("Checking on-chain access...");
                const hasPaid = await paywallContract.hasAccess(CONTENT_ID_HASH, walletAddress);
                console.log("Result of hasAccess check:", hasPaid);

                if (hasPaid) {
                    setIsUnlocked(true); // You had this state, let's keep it for content fetching
                    setPageState('unlocked');
                } else {
                    console.log("Checking allowance...");
                    const requiredPrice = await paywallContract.contentPrice();
                    const currentAllowance = await usdcContract.allowance(walletAddress, paywallContract.address);
                    console.log("Required Price:", requiredPrice.toString(), "Current Allowance:", currentAllowance.toString());
                    if (currentAllowance.lt(requiredPrice)) {
                        setPageState('needs_approval');
                    } else {
                        setPageState('ready_to_unlock');
                    }
                }
            } catch (e) {
                console.error("Error in checkAccess effect:", e);
                setPageState('error');
                setErrorMessage("Failed to check access on-chain. Please refresh.");
            }
        };
        checkAccess();
    }, [isInitialized, walletAddress, chainId, paywallContract, usdcContract]);

    // This effect for fetching content is likely fine, but we'll keep it separate
    const [isUnlocked, setIsUnlocked] = useState(false); // Keep this state to trigger fetch
    useEffect(() => {
        if (!isUnlocked || !signer) return;
        // ... your secure content fetching logic ...
    }, [isUnlocked, signer]);


    const handleApprove = async () => {
        if (!usdcContract || !paywallAddress) return;
        setPageState('checking'); // Show loading state
        setErrorMessage('');
        try {
            const requiredPrice = await paywallContract.contentPrice();
            const tx = await usdcContract.approve(paywallAddress, requiredPrice);
            await tx.wait(1);
            setPageState('ready_to_unlock'); // Move to next state on success
        } catch (err) {
            setErrorMessage(err.reason || "Approval failed.");
            setPageState('needs_approval'); // Go back to approval state on error
        }
    };

    const handleUnlock = async () => {
        if (!paywallContract) return;
        setPageState('checking');
        setErrorMessage('');
        try {
            const tx = await paywallContract.unlockContent(CONTENT_ID_HASH);
            await tx.wait(1);
            setIsUnlocked(true); // This will trigger the fetch
            setPageState('unlocked');
        } catch (err) {
            setErrorMessage(err.reason || "Payment failed.");
            setPageState('ready_to_unlock');
        }
    };
    
    const renderContent = () => {
        switch (pageState) {
            case 'initializing':
                return <LoadingSpinner message="Initializing..." />;
            case 'prompt_connect':
                return <ConnectWalletButton />;
            case 'checking':
                return <LoadingSpinner message="Verifying with blockchain..." />;
            case 'needs_approval':
                return <button onClick={handleApprove}>1. Approve USDC</button>;
            case 'ready_to_unlock':
                return <button onClick={handleUnlock}>2. Unlock Content for 1,000,000 USDC</button>;
            case 'unlocked':
                return fullContent ? <ReactMarkdown>{fullContent}</ReactMarkdown> : <LoadingSpinner message="Fetching secure content..." />;
            case 'error':
                return <p style={{color: 'red'}}>{errorMessage}</p>;
            default:
                return <p>Something went wrong.</p>;
        }
    };


    return (
        <div className="page-container blog-post-page">
            <article className="blog-content teaser">{/* ... teaser ... */}</article>
            <div className="paywall-card">
                <h2>Unlock Full Access</h2>
                <div className="button-group">
                    {renderContent()}
                </div>
                {pageState !== 'error' && errorMessage && <p style={{color: 'red'}}>{errorMessage}</p>}
            </div>
        </div>
    );
}

export default ExclusivePostPage;