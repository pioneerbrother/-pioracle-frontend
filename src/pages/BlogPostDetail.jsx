// src/pages/BlogPostDetail.jsx

import React, { useState, useEffect, useContext, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ethers } from 'ethers';
import ReactMarkdown from 'react-markdown';
import matter from 'gray-matter';

import { WalletContext } from './WalletProvider';
import LoadingSpinner from '../components/common/LoadingSpinner';
import ConnectWalletButton from '../components/common/ConnectWalletButton';
import { getConfigForChainId } from '../config/contractConfig';
import PremiumContentABI from '../config/abis/PremiumContent.json';
import IERC20_ABI from '../config/abis/IERC20.json';
import './BlogPostPage.css';

function BlogPostDetail() {
    const { slug } = useParams();
    const { walletAddress, chainId, signer, isInitialized } = useContext(WalletContext);
    
    const [postData, setPostData] = useState({ content: '', frontmatter: null });
    const [pageState, setPageState] = useState('initializing');
    const [errorMessage, setErrorMessage] = useState('');

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

    const contentId = useMemo(() => slug ? ethers.utils.id(slug) : null, [slug]);

    useEffect(() => {
        if (!isInitialized || !slug) return;

        const loadPostAndCheckAccess = async () => {
            setPageState('checking');
            try {
                const rawContentModule = await import(`../posts/${slug}.md?raw`);
                const { data: frontmatter, content: localContent } = matter(rawContentModule.default);
                
                setPostData({ content: localContent, frontmatter });

                if (frontmatter.premium === true) {
                    if (!walletAddress) {
                        setPageState('prompt_connect');
                        return;
                    }
                    if (!premiumContentContract || !usdcContract) {
                        setPageState('unsupported_network');
                        return;
                    }
                    
                    const hasPaid = await premiumContentContract.hasAccess(contentId, walletAddress);
                    if (hasPaid) {
                        await secureFetchContent();
                    } else {
                        // --- THIS IS THE CRITICAL FIX ---
                        // If user hasn't paid, we MUST check their allowance now.
                        const fee = await premiumContentContract.contentPrice();
                        const allowance = await usdcContract.allowance(walletAddress, premiumContentContract.address);
                        if (allowance.lt(fee)) {
                            setPageState('needs_approval'); // Show "Approve" button
                        } else {
                            setPageState('ready_to_unlock'); // Show "Unlock" button
                        }
                        // --- END OF FIX ---
                    }
                } else {
                    setPageState('unlocked');
                }
            } catch (e) {
                setPageState('error');
                setErrorMessage("Post not found or failed to load.");
            }
        };

        loadPostAndCheckAccess();
    }, [isInitialized, walletAddress, chainId]); // Re-run when wallet or network changes


    const secureFetchContent = async () => { /* ... same as before ... */ };
    const handleApprove = async () => { /* ... same as before ... */ };
    const handleUnlock = async () => { /* ... same as before ... */ };


    // --- RENDER LOGIC ---
    const renderPaywallActions = () => {
        switch (pageState) {
            case 'prompt_connect':
                return <div><p>Please connect your wallet to unlock this premium article.</p><ConnectWalletButton /></div>;
            case 'unsupported_network':
                return <p className="error-message">Unsupported Network. Please switch to a supported chain.</p>;
            case 'needs_approval':
                return <button onClick={handleApprove} className="action-button">1. Approve USDC</button>;
            case 'ready_to_unlock':
                return <button onClick={handleUnlock} className="action-button highlight">2. Unlock Content</button>;
            case 'checking':
            case 'fetching_secure':
                return <LoadingSpinner message="Verifying..." />;
            case 'error':
                return <p className="error-message">{errorMessage}</p>;
            default:
                return <LoadingSpinner message="Loading..." />;
        }
    };

    // Main render function
    if (pageState === 'initializing' || !postData.frontmatter) {
        return <div className="blog-post-page"><LoadingSpinner message="Loading Post..." /></div>;
    }

    // Unlocked view for both free and paid content
    if (pageState === 'unlocked') {
        return (
            <div className="blog-post-page">
                <div className="blog-post-content-wrapper">
                    <h1 className="post-title">{postData.frontmatter.title}</h1>
                    <p className="post-meta">Published on {postData.frontmatter.date} by {postData.frontmatter.author}</p>
                    <div className="post-body-content">
                        <ReactMarkdown>{postData.content}</ReactMarkdown>
                    </div>
                </div>
            </div>
        );
    }

    // Paywall view for premium content that is not yet unlocked
    return (
        <div className="blog-post-page">
            <div className="blog-post-content-wrapper">
                <h1 className="post-title">{postData.frontmatter.title}</h1>
                <p className="post-meta">Published on {postData.frontmatter.date} by {postData.frontmatter.author}</p>
                <div className="post-body-content">
                    {/* Shows the teaser content */}
                    <ReactMarkdown>{postData.content}</ReactMarkdown>
                </div>
                
                <hr style={{margin: "3rem 0"}} />

                <div className="paywall">
                    <h3>Unlock Full Access</h3>
                    {renderPaywallActions()}
                </div>
            </div>
        </div>
    );
}

export default BlogPostDetail;