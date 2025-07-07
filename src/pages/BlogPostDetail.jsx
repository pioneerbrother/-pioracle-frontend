import React, { useState, useEffect, useContext, useMemo, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { ethers } from 'ethers';
import ReactMarkdown from 'react-markdown';
import matter from 'gray-matter';

import { WalletContext } from './WalletProvider';
import LoadingSpinner from '../components/common/LoadingSpinner';
import ConnectWalletButton from '../components/common/ConnectWalletButton';
import { getConfigForChainId, getTargetChainIdHex } from '../config/contractConfig';
import PremiumContentABI from '../config/abis/PremiumContent.json';
import IERC20_ABI from '../config/abis/IERC20.json';
import './BlogPostPage.css';

function BlogPostDetail() {
    const { slug } = useParams();
    const { walletAddress, chainId, signer, isInitialized } = useContext(WalletContext);

    const targetChainId = useMemo(() => parseInt(getTargetChainIdHex(), 16), []);

    const [postData, setPostData] = useState({ content: '', frontmatter: null, isLoading: true });
    const [pageState, setPageState] = useState('initializing');
    const [errorMessage, setErrorMessage] = useState('');
    const [contentPrice, setContentPrice] = useState(ethers.BigNumber.from(0));

    const [premiumContentContract, setPremiumContentContract] = useState(null);
    const [usdcContract, setUsdcContract] = useState(null);

    // --- REFACTORED LOGIC ---

    // Effect 1: Initialize contracts. This is a separate concern.
    useEffect(() => {
        if (signer && chainId) {
            const config = getConfigForChainId(chainId);
            if (config?.premiumContentContractAddress) {
                setPremiumContentContract(new ethers.Contract(config.premiumContentContractAddress, (PremiumContentABI.abi || PremiumContentABI), signer));
            } else { setPremiumContentContract(null); }
            if (config?.usdcTokenAddress) {
                setUsdcContract(new ethers.Contract(config.usdcTokenAddress, (IERC20_ABI.abi || IERC20_ABI), signer));
            } else { setUsdcContract(null); }
        } else {
            setPremiumContentContract(null);
            setUsdcContract(null);
        }
    }, [signer, chainId]);

    const contentId = useMemo(() => slug ? ethers.utils.id(slug) : null, [slug]);

    // Effect 2: Load the post's markdown file. This only depends on the slug.
    useEffect(() => {
        if (!slug) return;
        let isMounted = true;
        const loadPost = async () => {
            setPostData({ content: '', frontmatter: null, isLoading: true });
            try {
                const rawContentModule = await import(`../posts/${slug}.md?raw`);
                const { data: frontmatter, content: localContent } = matter(rawContentModule.default);
                if (isMounted) {
                    setPostData({ content: localContent, frontmatter, isLoading: false });
                }
            } catch (e) {
                if (isMounted) {
                    setErrorMessage("Post not found.");
                    setPostData(prev => ({ ...prev, isLoading: false }));
                }
            }
        };
        loadPost();
        return () => { isMounted = false; };
    }, [slug]);

    // Effect 3: The main State Machine. This effect runs whenever the core data changes.
    // It decides what the page should be doing based on the current context.
    useEffect(() => {
        // Don't do anything until the post markdown has finished loading.
        if (postData.isLoading) {
            setPageState('initializing');
            return;
        }

        const isPremium = postData.frontmatter?.premium === true;

        if (!isPremium) {
            setPageState('unlocked');
            return;
        }

        // From here, we know it's a premium post.
        if (!walletAddress) {
            setPageState('prompt_connect');
        } else if (chainId !== targetChainId) {
            setPageState('unsupported_network');
        } else {
            // Wallet connected and on the right network. Start the on-chain check.
            setPageState('checking_access');
        }

    }, [postData, walletAddress, chainId, targetChainId]);


    // Effect 4: Handles the on-chain logic AFTER the state has been set to 'checking_access'.
    useEffect(() => {
        if (pageState !== 'checking_access' || !premiumContentContract || !usdcContract || !walletAddress || !contentId) {
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
                    setContentPrice(fee);
                    const allowance = await usdcContract.allowance(walletAddress, premiumContentContract.address);
                    if (!isMounted) return;

                    setPageState(allowance.lt(fee) ? 'needs_approval' : 'ready_to_unlock');
                }
            } catch (e) {
                console.error("Error checking on-chain access:", e);
                if (isMounted) {
                    setPageState('error');
                    setErrorMessage(`Failed to check on-chain access. Please ensure you are on the correct network.`);
                }
            }
        };

        checkAccess();
        return () => { isMounted = false; };
    }, [pageState, walletAddress, premiumContentContract, usdcContract, contentId]);


    // --- CALLBACKS & RENDER LOGIC (Mostly Unchanged) ---

    const secureFetchContent = useCallback(async () => { /* ... same as before ... */ }, [postData.frontmatter]);
    const handleApprove = useCallback(async () => { /* ... same as before ... */ }, [usdcContract, premiumContentContract, contentPrice]);
    const handleUnlock = useCallback(async () => { /* ... same as before ... */ }, [premiumContentContract, contentId, secureFetchContent]);

    const renderPaywallActions = () => {
        switch (pageState) {
            case 'prompt_connect':
                return <div><p>Please connect your wallet to unlock this premium article.</p><ConnectWalletButton /></div>;
            case 'unsupported_network':
                return <div className="error-message">Please switch your wallet to BNB Mainnet to continue.</div>;
            case 'needs_approval':
                return (
                    <div>
                        <p>To unlock this article, you must approve USDC spending.</p>
                        <button onClick={handleApprove} className="action-button">1. Approve USDC</button>
                        {errorMessage && <p className="error-message">{errorMessage}</p>}
                    </div>
                );
            case 'ready_to_unlock':
                 return (
                    <div>
                        <p>USDC approved. You can now unlock the content.</p>
                        <button onClick={handleUnlock} className="action-button highlight">2. Unlock Content</button>
                        {errorMessage && <p className="error-message">{errorMessage}</p>}
                    </div>
                );
            case 'checking':
            case 'checking_access':
                return <LoadingSpinner message="Verifying on-chain..." />;
            case 'error':
                return <p className="error-message">{errorMessage}</p>;
            default:
                return <LoadingSpinner message="Loading..." />;
        }
    };

    if (postData.isLoading) {
        return <div className="blog-post-page"><div className="blog-post-content-wrapper"><LoadingSpinner message="Loading Post..." /></div></div>;
    }

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

    return (
        <div className="blog-post-page">
            <div className="blog-post-content-wrapper">
                <h1 className="post-title">{postData.frontmatter.title}</h1>
                <p className="post-meta">Published on {postData.frontmatter.date} by {postData.frontmatter.author}</p>
                <div className="post-body-content">
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
