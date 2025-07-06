// src/pages/BlogPostDetail.jsx

import React, { useState, useEffect, useContext, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ethers } from 'ethers';
import ReactMarkdown from 'react-markdown';
import matter from 'gray-matter';

import { WalletContext } from './WalletProvider';
import LoadingSpinner from '../components/common/LoadingSpinner';
import ConnectWalletButton from '../components/common/ConnectWalletButton';

// ABIs
import PremiumContentABI from '../config/abis/PremiumContent.json';
import IERC20_ABI from '../config/abis/IERC20.json';

import { getConfigForChainId } from '../config/contractConfig';
import './BlogPostPage.css'; // Make sure you import your CSS file

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

        const loadPost = async () => {
            setPageState('checking');
            try {
                const rawContentModule = await import(`../posts/${slug}.md?raw`);
                const { data: frontmatter, content: localContent } = matter(rawContentModule.default);
                
                setPostData({ content: localContent, frontmatter: frontmatter });

                if (frontmatter.premium === true) {
                    if (!walletAddress) {
                        setPageState('needs_payment');
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
                        setPageState('needs_payment');
                    }
                } else {
                    setPageState('unlocked');
                }
            } catch (e) {
                setPageState('error');
                setErrorMessage("Post not found or failed to load.");
            }
        };
        loadPost();
    }, [isInitialized, walletAddress, premiumContentContract, slug, contentId]);

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

            setPostData(prev => ({ ...prev, content: data.content }));
            setPageState('unlocked');
        } catch (error) {
            setPageState('error');
            setErrorMessage(error.message);
        }
    };
    
    const handleApprove = async () => { /* ... Your approve logic ... */ };
    const handleUnlock = async () => { /* ... Your unlock logic ... */ };

    // --- RENDER LOGIC ---

    // Loading State
    if (pageState === 'initializing' || pageState === 'checking' || !postData.frontmatter) {
        return (
            <div className="blog-post-page">
                <div className="blog-post-content-wrapper">
                    <LoadingSpinner message="Loading Post..." />
                </div>
            </div>
        );
    }

    // Unlocked State (for both free and paid articles)
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

    // Paywall State (for premium articles not yet unlocked)
    return (
        <div className="blog-post-page">
            <div className="blog-post-content-wrapper">
                <h1 className="post-title">{postData.frontmatter.title}</h1>
                <p className="post-meta">Published on {postData.frontmatter.date} by {postData.frontmatter.author}</p>
                <div className="post-body-content">
                    <ReactMarkdown>{postData.content}</ReactMarkdown>
                </div>
                
                <div className="paywall">
                    <h3>Unlock Full Access</h3>
                    <p>This is a premium article secured on the blockchain. Please connect your wallet to continue.</p>
                    {/* Your logic for buttons, spinners, errors would go here */}
                </div>
            </div>
        </div>
    );
}

export default BlogPostDetail;