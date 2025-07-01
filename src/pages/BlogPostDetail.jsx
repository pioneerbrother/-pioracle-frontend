// src/pages/BlogPostDetail.jsx

import React, { useState, useEffect, useContext, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { ethers } from 'ethers';
import ReactMarkdown from 'react-markdown'; // Make sure you've run: npm install react-markdown

import { WalletContext } from './WalletProvider';
import LoadingSpinner from '../components/common/LoadingSpinner';
import ConnectWalletButton from '../components/common/ConnectWalletButton';

// You will need to get the ABI for these two from your /config/abis folder
import PremiumContentABI from '../config/abis/PremiumContent.json';
import IERC20_ABI from '../config/abis/IERC20.json';


function BlogPostDetail() {
    const { slug } = useParams();
    const { walletAddress, chainId, signer, isInitialized } = useContext(WalletContext);
    
    const [postContent, setPostContent] = useState('');
    const [pageState, setPageState] = useState('initializing');
    const [errorMessage, setErrorMessage] = useState('');

    // Re-create contract instances here based on the signer from context
    const premiumContentContract = useMemo(() => {
        if (!signer) return null;
        const config = getConfigForChainId(chainId);
        if (!config?.premiumContentContractAddress) return null;
        return new ethers.Contract(config.premiumContentContractAddress, (PremiumContentABI.abi || PremiumContentABI), signer);
    }, [signer, chainId]);

    const usdcContract = useMemo(() => {
        if (!signer) return null;
        const config = getConfigForChainId(chainId);
        if (!config?.usdcTokenAddress) return null;
        return new ethers.Contract(config.usdcTokenAddress, (IERC20_ABI.abi || IERC20_ABI), signer);
    }, [signer, chainId]);

    const contentId = useMemo(() => slug ? ethers.id(slug) : null, [slug]);

    const secureFetchContent = async () => {
        if (!signer || !walletAddress || !slug || !chainId) return;
        setPageState('fetching_secure');
        try {
            const message = `I am proving ownership of my address to read article: ${slug}`;
            const signature = await signer.signMessage(message);

            const response = await fetch('/.netlify/functions/get-premium-content', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ slug, walletAddress, signature, chainId })
            });

            const data = await response.json();
            if (!response.ok) { throw new Error(data.error || 'Failed to fetch content.'); }

            setPostContent(data.content);
            setPageState('unlocked');
        } catch (error) {
            setPageState('error');
            setErrorMessage(error.message);
        }
    };
    
    useEffect(() => {
        if (!isInitialized || !slug) return;
        if (!walletAddress) { setPageState('needs_payment'); return; }
        
        const checkAccess = async () => {
            setPageState('checking');
            if (!premiumContentContract) { setPageState('unsupported_network'); return; }
            try {
                const hasPaid = await premiumContentContract.hasAccess(contentId, walletAddress);
                if (hasPaid) { await secureFetchContent(); } 
                else { setPageState('needs_payment'); }
            } catch (e) {
                setPageState('error');
                setErrorMessage("Failed to check on-chain access. Please refresh.");
            }
        };
        checkAccess();
    }, [isInitialized, walletAddress, premiumContentContract]);


    const handleApprove = async () => { /* ... (Your existing approve logic) ... */ };
    const handleUnlock = async () => { /* ... (Your existing unlock logic) ... */ };


    // --- THE FINAL, COMPLETE RENDER LOGIC ---
    if (pageState === 'unlocked') {
        return (
            <div className="page-container blog-post">
                <ReactMarkdown className="post-content">{postContent}</ReactMarkdown>
            </div>
        );
    }
    
    const renderPaywallActions = () => {
        switch (pageState) {
            case 'initializing':
            case 'checking':
                return <LoadingSpinner message="Verifying access on-chain..." />;
            case 'fetching_secure':
                return <LoadingSpinner message="Decrypting secure content..." />;
            case 'unsupported_network':
                return <p className="error-message">Your wallet is on an unsupported network. Please switch to a supported chain.</p>;
            case 'needs_payment':
                // Here you would render your <button onClick={handleApprove}> etc.
                return (
                    <div>
                        <button className="unlock-btn" onClick={handleApprove}>1. Approve MockUSDC</button>
                        <button className="unlock-btn" onClick={handleUnlock}>2. Unlock Content</button>
                    </div>
                );
            case 'error':
                return <p className="error-message">{errorMessage}</p>;
            case 'prompt_connect':
                return <ConnectWalletButton />;
            default:
                return <p>Loading...</p>;
        }
    };

    return (
        <div className="page-container blog-post">
            <div className="paywall">
                <h1>Premium Content</h1>
                <p>This article is secured on the blockchain. Please connect your wallet to see your access status.</p>
                <div className="paywall-action">
                    <h3>Unlock Full Access</h3>
                    <div className="button-group">{renderPaywallActions()}</div>
                    {pageState !== 'error' && errorMessage && <p className="error-message">{errorMessage}</p>}
                </div>
            </div>
        </div>
    );
}

export default BlogPostDetail;