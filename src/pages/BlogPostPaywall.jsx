// src/pages/BlogPostPaywall.jsx

import React, { useState, useEffect, useContext, useMemo, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { ethers } from 'ethers';
import ReactMarkdown from 'react-markdown';
import { useWeb3ModalProvider } from '@web3modal/ethers5/react';

import { getPostBySlug } from '../posts/index.js';
import { WalletContext } from '../context/WalletContext.jsx';
import LoadingSpinner from '../components/common/LoadingSpinner.jsx';
import ConnectWalletButton from '../components/common/ConnectWalletButton.jsx';
import { getConfigForChainId, getTargetChainIdHex } from '../config/contractConfig.js';
import PremiumContentABI from '../config/abis/PremiumContent.json';
import IERC20_ABI from '../config/abis/IERC20.json';
import './BlogPage.css';

function BlogPostPaywall() {
    const { slug } = useParams();
    const { walletAddress, chainId, isConnected, isInitialized } = useContext(WalletContext);
    const { walletProvider } = useWeb3ModalProvider(); 
    
    const post = useMemo(() => getPostBySlug(slug), [slug]);

    const targetChainId = useMemo(() => parseInt(getTargetChainIdHex(), 16), []);
    const [pageState, setPageState] = useState('initializing');
    const [errorMessage, setErrorMessage] = useState('');
    const [price, setPrice] = useState(null);

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
    
    const contentId = useMemo(() => post?.slug ? ethers.utils.id(post.slug) : null, [post]);

    useEffect(() => {
        if (!isInitialized || !post) {
            setPageState('initializing');
            return;
        }
        if (post.frontmatter.premium !== true) {
            setPageState('unlocked');
            return;
        }
        if (!isConnected) {
            setPageState('prompt_connect');
            return;
        }
        if (chainId !== targetChainId) {
            setPageState('unsupported_network');
            return;
        }
        if (!premiumContentContract || !usdcContract) {
            setPageState('initializing');
            return;
        }
        const checkAccess = async () => {
            setPageState('checking_access');
            try {
                const hasPaid = await premiumContentContract.hasAccess(contentId, walletAddress);
                if (hasPaid) {
                    setPageState('unlocked');
                } else {
                    const fee = await premiumContentContract.contentPrice();
                    const allowance = await usdcContract.allowance(walletAddress, premiumContentContract.address);
                    setPrice({ amount: ethers.utils.formatUnits(fee), symbol: 'USDC', raw: fee });
                    setPageState(allowance.lt(fee) ? 'needs_approval' : 'ready_to_unlock');
                }
            } catch (e) {
                setPageState('error');
                setErrorMessage('Failed to check access. Please refresh.');
            }
        };
        checkAccess();
    }, [isInitialized, post, isConnected, walletAddress, chainId, targetChainId, premiumContentContract, usdcContract, contentId]);
    
    const handleApprove = useCallback(async () => { /* ... */ }, [usdcContract, premiumContentContract, price]);
    const handleUnlock = useCallback(async () => { /* ... */ }, [premiumContentContract, contentId]);
    const handleSwitchNetwork = useCallback(async () => { /* ... */ }, []);

    const renderPaywallActions = () => { /* ... */ };

    if (!isInitialized || !post || pageState === 'initializing') {
        return <div className="page-container"><div className="blog-post-content-wrapper"><LoadingSpinner message="Loading..." /></div></div>;
    }
    
    if (pageState === 'unlocked') {
        // Unlocked View
        return (
            <div className="blog-post-page">
                <div className="blog-post-content-wrapper">
                    <h1 className="post-title">{post.frontmatter.title}</h1>
                    <p className="post-meta">Published on {post.frontmatter.date} by {post.frontmatter.author}</p>
                    <div className="post-body-content"><ReactMarkdown>{post.content}</ReactMarkdown></div>
                </div>
            </div>
        );
    }
    
    // Locked View
    return (
        <div className="blog-post-page">
            <div className="blog-post-content-wrapper">
                <h1 className="post-title">{post.frontmatter.title}</h1>
                <p className="post-meta">Published on {post.frontmatter.date} by {post.frontmatter.author}</p>
                <div className="post-body-content excerpt">
                    <ReactMarkdown>{post.excerpt}</ReactMarkdown>
                    <div className="excerpt-fadeout" />
                </div>
                <div className="paywall">
                    <h3>Unlock Full Access</h3>
                    {renderPaywallActions()}
                </div>
            </div>
        </div>
    );
}

export default BlogPostPaywall;