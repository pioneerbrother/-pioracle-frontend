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

    const [premiumContentContract, setPremiumContentContract] = useState(null);
    const [usdcContract, setUsdcContract] = useState(null);

    // Effect to create contract instances
    useEffect(() => {
        if (signer && chainId) {
            const config = getConfigForChainId(chainId);
            if (config?.premiumContentContractAddress) {
                setPremiumContentContract(new ethers.Contract(config.premiumContentContractAddress, (PremiumContentABI.abi || PremiumContentABI), signer));
            }
            if (config?.usdcTokenAddress) {
                setUsdcContract(new ethers.Contract(config.usdcTokenAddress, (IERC20_ABI.abi || IERC20_ABI), signer));
            }
        } else {
            setPremiumContentContract(null);
            setUsdcContract(null);
        }
    }, [signer, chainId]);

    const contentId = useMemo(() => slug ? ethers.utils.id(slug) : null, [slug]);

    // Main effect to load post and check access
    useEffect(() => {
        if (!slug) return;
        
        let isMounted = true; // Prevent state updates on unmounted component
        const loadPost = async () => {
            if (!isMounted) return;
            setPageState('loading');
            try {
                const rawContentModule = await import(`../posts/${slug}.md?raw`);
                const { data: frontmatter, content: localContent } = matter(rawContentModule.default);
                if (!isMounted) return;
                setPostData({ content: localContent, frontmatter });
                
                if (frontmatter.premium !== true) {
                    setPageState('unlocked');
                } else {
                    setPageState('checking_access'); // Move to next state for premium check
                }
            } catch (e) {
                if (isMounted) {
                    setPageState('error');
                    setErrorMessage("Post not found.");
                }
            }
        };
        loadPost();
        return () => { isMounted = false; }; // Cleanup function
    }, [slug]);

    // Second effect for on-chain checks
    useEffect(() => {
        if (pageState !== 'checking_access' || !walletAddress || !premiumContentContract || !usdcContract) {
            // If not connected while trying to check, show connect prompt
            if (pageState === 'checking_access' && !walletAddress) {
                setPageState('prompt_connect');
            }
            return;
        }

        let isMounted = true;
        const checkAccess = async () => {
            try {
                const hasPaid = await premiumContentContract.hasAccess(contentId, walletAddress);
                if (!isMounted) return;
                if (hasPaid) {
                    await secureFetchContent();
                } else {
                    const fee = await premiumContentContract.contentPrice();
                    const allowance = await usdcContract.allowance(walletAddress, premiumContentContract.address);
                    if (!isMounted) return;
                    if (allowance.lt(fee)) {
                        setPageState('needs_approval');
                    } else {
                        setPageState('ready_to_unlock');
                    }
                }
            } catch (e) {
                if (isMounted) {
                    setPageState('error');
                    setErrorMessage("Failed to check on-chain access.");
                }
            }
        };
        checkAccess();
        return () => { isMounted = false; };
    }, [pageState, walletAddress, premiumContentContract, usdcContract]);


    const secureFetchContent = async () => { /* ... same as before ... */ };
    const handleApprove = async () => { /* ... same as before ... */ };
    const handleUnlock = async () => { /* ... same as before ... */ };

    // --- FINAL, FOOLPROOF RENDER LOGIC ---
    // This logic is now inside the main component body, not a helper function.
    
    // 1. Handle initial loading before we even have frontmatter
    if (!postData.frontmatter) {
        if (pageState === 'error') {
            return <div className="blog-post-page"><div className="blog-post-content-wrapper"><p className="error-message">{errorMessage}</p></div></div>;
        }
        return <div className="blog-post-page"><LoadingSpinner message="Loading Post..." /></div>;
    }

    // 2. If the page state is "unlocked", show the content. This is the success case.
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
    
    // 3. If we've gotten here, it means the page is NOT unlocked. It's either a premium paywall or a loading/error state.
    // This is our default case that will always show something.
    return (
        <div className="blog-post-page">
            <div className="blog-post-content-wrapper">
                <h1 className="post-title">{postData.frontmatter.title}</h1>
                <p className="post-meta">Published on {postData.frontmatter.date} by {postData.frontmatter.author}</p>
                
                {/* For premium posts, show the teaser content above the paywall */}
                {postData.frontmatter.premium === true && (
                     <div className="post-body-content">
                        <ReactMarkdown>{postData.content}</ReactMarkdown>
                    </div>
                )}
                
                <hr style={{margin: "3rem 0"}} />

                <div className="paywall">
                    <h3>Unlock Full Access</h3>
                    {pageState === 'loading' && <LoadingSpinner message="Loading..." />}
                    {pageState === 'checking_access' && <LoadingSpinner message="Verifying access on-chain..." />}
                    {pageState === 'fetching_secure' && <LoadingSpinner message="Decrypting secure content..." />}
                    {pageState === 'prompt_connect' && <ConnectWalletButton />}
                    {pageState === 'unsupported_network' && <p className="error-message">Please switch to a supported network.</p>}
                    {pageState === 'needs_approval' && <button onClick={handleApprove} className="action-button">1. Approve USDC</button>}
                    {pageState === 'ready_to_unlock' && <button onClick={handleUnlock} className="action-button highlight">2. Unlock Content</button>}
                    {pageState === 'error' && <p className="error-message">{errorMessage}</p>}
                </div>
            </div>
        </div>
    );
}

export default BlogPostDetail;