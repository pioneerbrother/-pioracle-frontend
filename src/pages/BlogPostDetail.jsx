// src/pages/BlogPostDetail.jsx

import React, { useState, useEffect, useContext, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { ethers } from 'ethers';
import matter from 'gray-matter';
import ReactMarkdown from 'react-markdown';

import { WalletContext } from './WalletProvider';
import { getConfigForChainId } from '../config/contractConfig';

// Import ABIs directly
import PremiumContentABI from '../config/abis/PremiumContent.json';
import IERC20_ABI from '../config/abis/IERC20.json';

// Import your UI components
import LoadingSpinner from '../components/common/LoadingSpinner'; 
import ConnectWalletButton from '../components/common/ConnectWalletButton';

function BlogPostDetail() {
    const { slug } = useParams();
    const { walletAddress, signer, chainId, isInitialized } = useContext(WalletContext);
    
    const [pageState, setPageState] = useState('initializing');
    const [errorMessage, setErrorMessage] = useState('');
    const [post, setPost] = useState({ frontmatter: null, content: null });

    // Derive config and contracts
    const currentNetworkConfig = useMemo(() => getConfigForChainId(chainId), [chainId]);
    const paywallAddress = currentNetworkConfig?.premiumContentContractAddress;
    const usdcAddress = currentNetworkConfig?.usdcTokenAddress;

    const paywallContract = useMemo(() => {
        if (!signer || !paywallAddress) return null;
        return new ethers.Contract(paywallAddress, (PremiumContentABI.abi || PremiumContentABI), signer);
    }, [signer, paywallAddress]);

    const usdcContract = useMemo(() => {
        if (!signer || !usdcAddress) return null;
        return new ethers.Contract(usdcAddress, (IERC20_ABI.abi || IERC20_ABI), signer);
    }, [signer, usdcAddress]);

    const contentId = useMemo(() => slug ? ethers.utils.id(slug) : null, [slug]);

    // Effect to load post content
    useEffect(() => {
        if (!slug) return;
        const fetchPost = async () => {
            try {
                const rawContentModule = await import(`../posts/${slug}.md?raw`);
                const { data, content } = matter(rawContentModule.default);
                setPost({ frontmatter: data, content: content });
            } catch (e) {
                setPageState('error');
                setErrorMessage("Post not found.");
            }
        };
        fetchPost();
    }, [slug]);

    // Effect to check access
    useEffect(() => {
        if (!isInitialized || !post.frontmatter || !contentId) return;
        if (!post.frontmatter.premium) { setPageState('unlocked'); return; }
        if (!walletAddress) { setPageState('prompt_connect'); return; }
        if (!paywallContract || !usdcContract) { setPageState('error'); setErrorMessage(`App is not configured for this chain (ID: ${chainId}).`); return; }

        const checkAccess = async () => {
            setPageState('checking');
            try {
                const hasPaid = await paywallContract.hasAccess(contentId, walletAddress);
                if (hasPaid) { setPageState('unlocked'); return; }
                
                const requiredPrice = await paywallContract.contentPrice();
                const currentAllowance = await usdcContract.allowance(walletAddress, paywallContract.address);
                if (currentAllowance.lt(requiredPrice)) {
                    setPageState('needs_approval');
                } else {
                    setPageState('ready_to_unlock');
                }
            } catch (e) {
                console.error("Error in checkAccess effect:", e);
                setPageState('error');
                setErrorMessage("Failed to check access on-chain. Please refresh.");
            }
        };
        checkAccess();
    }, [isInitialized, walletAddress, chainId, post.frontmatter, contentId, paywallContract, usdcContract]);

    // --- THIS IS THE CRITICAL FUNCTION FOR THE BUTTON ---
    const handleApprove = async () => {
        if (!usdcContract || !paywallContract) return;
        setPageState('checking');
        setErrorMessage('');
        try {
            const requiredPrice = await paywallContract.contentPrice();
            const tx = await usdcContract.approve(paywallContract.address, requiredPrice);
            await tx.wait(1); // Wait for 1 confirmation
            setPageState('ready_to_unlock');
        } catch (err) {
            console.error("Approval failed:", err);
            setErrorMessage(err.reason || "Approval transaction failed.");
            setPageState('needs_approval');
        }
    };

    const handleUnlock = async () => {
        if (!paywallContract || !contentId) return;
        setPageState('checking');
        setErrorMessage('');
        try {
            const tx = await paywallContract.unlockContent(contentId);
            await tx.wait(1);
            setPageState('unlocked');
        } catch (err) {
            console.error("Unlock failed:", err);
            setErrorMessage(err.reason || "Unlock transaction failed.");
            setPageState('ready_to_unlock');
        }
    };

    // --- RENDER LOGIC ---
    if (pageState === 'unlocked') {
        return (
            <div className="page-container blog-post">
                <h1>{post.frontmatter?.title}</h1>
                <p className="post-meta">Published on {post.frontmatter?.date}</p>
                <hr />
                <ReactMarkdown className="post-content">{post.content}</ReactMarkdown>
            </div>
        );
    }
    
    const renderPaywallActions = () => {
        switch (pageState) {
            case 'initializing': return <LoadingSpinner message="Initializing..." />;
            case 'prompt_connect': return <ConnectWalletButton />;
            case 'checking': return <LoadingSpinner message="Verifying with blockchain..." />;
            case 'needs_approval':
                return <button className="unlock-btn" onClick={handleApprove}>1. Approve USDC</button>;
            case 'ready_to_unlock':
                return <button className="unlock-btn" onClick={handleUnlock}>2. Unlock Content</button>;
            case 'error':
                return <p className="error-message">{errorMessage}</p>;
            default:
                if (!post.frontmatter) return <LoadingSpinner message="Loading post..." />;
                return <p>Something went wrong.</p>;
        }
    };

    return (
        <div className="page-container blog-post">
            <h1>{post.frontmatter?.title || "Premium Content"}</h1>
            <p>This is a premium article.</p>
            <div className="paywall">
                <h3>Unlock Full Access</h3>
                <div className="button-group">{renderPaywallActions()}</div>
                {pageState !== 'error' && errorMessage && <p className="error-message">{errorMessage}</p>}
            </div>
        </div>
    );
}

export default BlogPostDetail;