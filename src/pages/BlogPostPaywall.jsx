// src/pages/BlogPostPaywall.jsx

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
import './BlogPage.css';

const postModules = import.meta.glob('../posts/*.md', { as: 'raw', eager: true });

function BlogPostPaywall() {
    const { slug } = useParams();
    const post = useMemo(() => {
        const path = `../posts/${slug}.md`;
        const rawContent = postModules[path];
        if (!rawContent) return null;
        const { data, content } = matter(rawContent);
        return { slug, frontmatter: data, content };
    }, [slug]);
    if (!post) { return <div className="page-container"><h1>Post not found</h1></div>; }
    return <PaywallView post={post} />;
}

function PaywallView({ post }) {
    const { walletAddress, chainId, isConnected, walletProvider } = useContext(WalletContext);
    const targetChainId = useMemo(() => parseInt(getTargetChainIdHex(), 16), []);
    const [pageState, setPageState] = useState('initializing');
    const [errorMessage, setErrorMessage] = useState('');

    const { premiumContentContract, usdcContract } = useMemo(() => {
        if (isConnected && walletProvider && chainId) {
            const provider = new ethers.providers.Web3Provider(walletProvider);
            const signer = provider.getSigner();
            const config = getConfigForChainId(chainId);
            const pcc = config?.premiumContentContractAddress ? new ethers.Contract(config.premiumContentContractAddress, (PremiumContentABI.abi || PremiumContentABI), signer) : null;
            const usdc = config?.usdcTokenAddress ? new ethers.Contract(config.usdcTokenAddress, (IERC20_ABI.abi || IERC20_ABI), signer) : null;
            return { premiumContentContract: pcc, usdcContract: usdc };
        }
        return { premiumContentContract: null, usdcContract: null };
    }, [isConnected, walletProvider, chainId]);
    
    const contentId = useMemo(() => post.slug ? ethers.utils.id(post.slug) : null, [post.slug]);

    useEffect(() => {
        if (post.frontmatter.premium !== true) { setPageState('unlocked'); return; }
        if (!isConnected) { setPageState('prompt_connect'); return; }
        if (chainId !== targetChainId) { setPageState('unsupported_network'); return; }
        
        // --- THIS IS THE FINAL FIX ---
        // We know if we got this far, the contracts are being created. 
        // We start the check immediately. This removes the race condition.
        const checkAccess = async () => {
            // Guard against the contracts not being ready yet.
            if (!premiumContentContract || !usdcContract) {
                setPageState('initializing'); // Stay in loading state
                return;
            }
            setPageState('checking_access');
            try {
                const hasPaid = await premiumContentContract.hasAccess(contentId, walletAddress);
                if (hasPaid) {
                    setPageState('unlocked');
                } else {
                    const fee = await premiumContentContract.contentPrice();
                    const allowance = await usdcContract.allowance(walletAddress, premiumContentContract.address);
                    setPageState(allowance.lt(fee) ? 'needs_approval' : 'ready_to_unlock');
                }
            } catch (e) {
                setPageState('error');
                setErrorMessage('Failed to check access. Please refresh.');
            }
        };
        checkAccess();
    }, [post, isConnected, walletAddress, chainId, targetChainId, premiumContentContract, usdcContract, contentId]);
    
    // Callbacks and render functions remain the same
    const handleApprove = useCallback(async () => { /* ... */ }, [usdcContract, premiumContentContract]);
    const handleUnlock = useCallback(async () => { /* ... */ }, [premiumContentContract, contentId]);

    const renderPaywallActions = () => {
        switch (pageState) {
            case 'prompt_connect': return <div><p>Please connect your wallet to unlock this premium article.</p><ConnectWalletButton /></div>;
            case 'unsupported_network': return <div className="error-message">Please switch your wallet to BNB Mainnet to continue.</div>;
            case 'needs_approval': return (<div><p>To unlock this article, you must approve USDC spending.</p><button onClick={handleApprove}>1. Approve USDC</button>{errorMessage && <p>{errorMessage}</p>}</div>);
            case 'ready_to_unlock': return (<div><p>USDC approved. You can now unlock the content.</p><button onClick={handleUnlock}>2. Unlock Content</button>{errorMessage && <p>{errorMessage}</p>}</div>);
            case 'checking': case 'checking_access': return <LoadingSpinner message="Verifying on-chain..." />;
            case 'error': return <p className="error-message">{errorMessage}</p>;
            default: return <LoadingSpinner message="Loading..." />;
        }
    };
    if (pageState === 'unlocked') { return (<div className="blog-post-page"><div className="blog-post-content-wrapper"><h1>{post.frontmatter.title}</h1><p className="post-meta">Published on {post.frontmatter.date} by {post.frontmatter.author}</p><div className="post-body-content"><ReactMarkdown>{post.content}</ReactMarkdown></div></div></div>); }
    return (<div className="blog-post-page"><div className="blog-post-content-wrapper"><h1>{post.frontmatter.title}</h1><p className="post-meta">Published on {post.frontmatter.date} by {post.frontmatter.author}</p><div className="post-body-content"><ReactMarkdown>{post.content}</ReactMarkdown></div><hr style={{margin: "3rem 0"}} /><div className="paywall"><h3>Unlock Full Access</h3>{renderPaywallActions()}</div></div></div>);
}

export default BlogPostPaywall;