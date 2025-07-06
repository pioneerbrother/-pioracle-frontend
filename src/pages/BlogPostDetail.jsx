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
                    if (!premiumContentContract) {
                        setPageState('unsupported_network');
                        return;
                    }
                    
                    const hasPaid = await premiumContentContract.hasAccess(contentId, walletAddress);
                    if (hasPaid) {
                        await secureFetchContent();
                    } else {
                        const fee = await premiumContentContract.contentPrice();
                        const allowance = await usdcContract.allowance(walletAddress, premiumContentContract.address);
                        if (allowance.lt(fee)) {
                            setPageState('needs_approval');
                        } else {
                            setPageState('ready_to_unlock');
                        }
                    }
                } else {
                    setPageState('unlocked');
                }
            } catch (e) {
                setPageState('error');
                setErrorMessage("Post not found.");
            }
        };

        loadPostAndCheckAccess();
    }, [isInitialized, walletAddress, chainId]); // Rerunning on chainId change is important

    const secureFetchContent = async () => { /* ... same as before ... */ };
    const handleApprove = async () => { /* ... same as before ... */ };
    const handleUnlock = async () => { /* ... same as before ... */ };

    // --- RENDER LOGIC ---

    const renderPaywallOrActions = () => {
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
                return null;
        }
    };

    if (pageState === 'initializing' || !postData.frontmatter) {
        return <div className="blog-post-page"><LoadingSpinner message="Loading Post..." /></div>;
    }

    return (
        <div className="blog-post-page">
            <div className="blog-post-content-wrapper">
                <h1 className="post-title">{postData.frontmatter.title}</h1>
                <p className="post-meta">Published on {postData.frontmatter.date} by {postData.frontmatter.author}</p>
                
                {pageState === 'unlocked' ? (
                    <div className="post-body-content">
                        <ReactMarkdown>{postData.content}</ReactMarkdown>
                    </div>
                ) : (
                    <>
                        <div className="post-body-content">
                            {/* This shows the teaser content for premium posts */}
                            <ReactMarkdown>{postData.content}</ReactMarkdown>
                        </div>
                        <div className="paywall">
                            <h3>Unlock Full Access</h3>
                            {renderPaywallOrActions()}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}

export default BlogPostDetail;