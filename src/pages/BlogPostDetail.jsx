// src/pages/BlogPostDetail.jsx

import React, { useState, useEffect, useContext, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { ethers } from 'ethers';
import ReactMarkdown from 'react-markdown';

import { WalletContext } from './WalletProvider';
import LoadingSpinner from '../components/common/LoadingSpinner';
import ConnectWalletButton from '../components/common/ConnectWalletButton';

// ABIs
import PremiumContentABI from '../config/abis/PremiumContent.json';
import IERC20_ABI from '../config/abis/IERC20.json';

// Import the configuration helper function
import { getConfigForChainId } from '../config/contractConfig';

function BlogPostDetail() {
    const { slug } = useParams();
    const { walletAddress, chainId, signer, isInitialized } = useContext(WalletContext);
    
    const [postContent, setPostContent] = useState('');
    const [pageState, setPageState] = useState('initializing');
    const [errorMessage, setErrorMessage] = useState('');

    // Re-create contract instances based on the signer from context
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

    // --- THIS IS THE FINAL FIX ---
    // Use the correct ethers v5 syntax for generating the content ID
    const contentId = useMemo(() => slug ? ethers.utils.id(slug) : null, [slug]);
    // --- END OF FIX ---

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
    }, [isInitialized, walletAddress, premiumContentContract, contentId]);


    const handleApprove = async () => {
        if (!usdcContract || !premiumContentContract) return;
        setPageState('checking');
        setErrorMessage('');
        try {
            const requiredPrice = await premiumContentContract.contentPrice();
            const tx = await usdcContract.approve(premiumContentContract.address, requiredPrice);
            await tx.wait(1);
            setPageState('ready_to_unlock');
        } catch (err) {
            setErrorMessage(err.reason || "Approval transaction failed.");
            setPageState('needs_payment');
        }
    };
    
    const handleUnlock = async () => {
        if (!premiumContentContract || !contentId) return;
        setPageState('checking');
        setErrorMessage('');
        try {
            const tx = await premiumContentContract.unlockContent(contentId);
            await tx.wait(1);
            await secureFetchContent();
        } catch (err) {
            setErrorMessage(err.reason || "Unlock transaction failed.");
            setPageState('needs_payment');
        }
    };


    // --- Final, Complete Rendering Logic ---
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
                return <button className="unlock-btn" onClick={handleApprove}>1. Approve MockUSDC</button>;
            case 'ready_to_unlock':
                return <button className="unlock-btn" onClick={handleUnlock}>2. Unlock Content</button>;
            case 'error':
                return <p className="error-message">{errorMessage}</p>;
            case 'prompt_connect':
                return <ConnectWalletButton />;
            default:
                return <LoadingSpinner message="Loading..." />;
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