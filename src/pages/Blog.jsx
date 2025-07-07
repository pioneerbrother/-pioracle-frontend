// src/pages/Blog.jsx

import React, { useState, useEffect, useContext, useMemo, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ethers } from 'ethers';
import ReactMarkdown from 'react-markdown';
import matter from 'gray-matter';

// --- Import all your context and components ---
import { WalletContext } from './WalletProvider';
import LoadingSpinner from '../components/common/LoadingSpinner';
import ConnectWalletButton from '../components/common/ConnectWalletButton';
import { getConfigForChainId, getTargetChainIdHex } from '../config/contractConfig';
import PremiumContentABI from '../config/abis/PremiumContent.json';
import IERC20_ABI from '../config/abis/IERC20.json';
import './BlogPage.css'; // You can reuse your existing CSS

// --- VITE GLOB IMPORT (This stays the same) ---
const postModules = import.meta.glob('../posts/*.md', { as: 'raw', eager: true });

const allPosts = Object.entries(postModules).map(([path, rawContent]) => {
    const { data } = matter(rawContent);
    const slug = path.split('/').pop().replace('.md', '');
    return {
        slug,
        frontmatter: data,
        content: matter(rawContent).content, // Keep the content for the detail view
    };
}).filter(post => post.frontmatter.title)
  .sort((a, b) => new Date(b.frontmatter.date) - new Date(a.frontmatter.date));


// ======================================================================
// === THE NEW, UNIFIED BLOG COMPONENT ==================================
// ======================================================================
function Blog() {
    const { slug } = useParams(); // This will be undefined on /blog, and have a value on /blog/:slug

    // If a slug exists in the URL, render the detail/paywall view
    if (slug) {
        const post = allPosts.find(p => p.slug === slug);
        if (!post) {
            return <div className="page-container"><h1>Post not found</h1></div>;
        }
        // Render the detail view component, passing the post data
        return <BlogPostDetailView post={post} />;
    }

    // If no slug exists, render the list view
    return (
        <div className="page-container blog-page">
            <h1>PiOracle Insights</h1>
            <p className="page-subtitle">Analysis, guides, and updates from the team.</p>
            <div className="post-list">
                {allPosts.map(post => (
                    <div key={post.slug} className="post-list-item">
                        <Link to={`/blog/${post.slug}`}>
                            <h2>{post.frontmatter.title}</h2>
                            <p className="post-meta">Published on {post.frontmatter.date}</p>
                            <span className="read-more">Read More →</span>
                        </Link>
                    </div>
                ))}
            </div>
        </div>
    );
}

// ======================================================================
// === THE PAYWALL LOGIC, NOW AS A DEDICATED SUB-COMPONENT =============
// ======================================================================
function BlogPostDetailView({ post }) {
    const { walletAddress, chainId, signer } = useContext(WalletContext);
    const targetChainId = useMemo(() => parseInt(getTargetChainIdHex(), 16), []);

    const [pageState, setPageState] = useState('initializing');
    const [errorMessage, setErrorMessage] = useState('');
    const [contentPrice, setContentPrice] = useState(ethers.BigNumber.from(0));

    // Stabilized contract instances using useMemo
    const premiumContentContract = useMemo(() => {
        if (signer && chainId) {
            const config = getConfigForChainId(chainId);
            if (config?.premiumContentContractAddress) {
                return new ethers.Contract(config.premiumContentContractAddress, (PremiumContentABI.abi || PremiumContentABI), signer);
            }
        }
        return null;
    }, [signer, chainId]);

    const usdcContract = useMemo(() => {
        if (signer && chainId) {
            const config = getConfigForChainId(chainId);
            if (config?.usdcTokenAddress) {
                return new ethers.Contract(config.usdcTokenAddress, (IERC20_ABI.abi || IERC20_ABI), signer);
            }
        }
        return null;
    }, [signer, chainId]);
    
    const contentId = useMemo(() => post.slug ? ethers.utils.id(post.slug) : null, [post.slug]);

    // The Master State Machine Effect
    useEffect(() => {
        if (post.frontmatter.premium !== true) {
            setPageState('unlocked');
            return;
        }
        if (!walletAddress) {
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
                    setContentPrice(fee);
                    const allowance = await usdcContract.allowance(walletAddress, premiumContentContract.address);
                    setPageState(allowance.lt(fee) ? 'needs_approval' : 'ready_to_unlock');
                }
            } catch (e) {
                setPageState('error');
                setErrorMessage('Failed to check access. Please ensure wallet is on the correct network and refresh.');
            }
        };
        checkAccess();
    }, [post, walletAddress, chainId, targetChainId, premiumContentContract, usdcContract, contentId]);
    
    // Callbacks for user actions
    const handleApprove = useCallback(async () => { /* ... (same logic as before) ... */ }, [usdcContract, premiumContentContract, contentPrice]);
    const handleUnlock = useCallback(async () => { /* ... (same logic as before) ... */ }, [premiumContentContract, contentId]);

    const renderPaywallActions = () => {
        switch (pageState) {
            case 'prompt_connect': return <div><p>Please connect your wallet to unlock this premium article.</p><ConnectWalletButton /></div>;
            case 'unsupported_network': return <div className="error-message">Please switch your wallet to BNB Mainnet to continue.</div>;
            case 'needs_approval': return (<div><p>To unlock this article, you must approve USDC spending.</p><button onClick={handleApprove} className="action-button">1. Approve USDC</button>{errorMessage && <p className="error-message">{errorMessage}</p>}</div>);
            case 'ready_to_unlock': return (<div><p>USDC approved. You can now unlock the content.</p><button onClick={handleUnlock} className="action-button highlight">2. Unlock Content</button>{errorMessage && <p className="error-message">{errorMessage}</p>}</div>);
            case 'checking': case 'checking_access': return <LoadingSpinner message="Verifying on-chain..." />;
            case 'error': return <p className="error-message">{errorMessage}</p>;
            default: return <LoadingSpinner message="Loading..." />;
        }
    };

    if (pageState === 'unlocked') {
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
    
    // Default locked view
    return (
        <div className="blog-post-page">
            <div className="blog-post-content-wrapper">
                <h1 className="post-title">{post.frontmatter.title}</h1>
                <p className="post-meta">Published on {post.frontmatter.date} by {post.frontmatter.author}</p>
                <div className="post-body-content"><ReactMarkdown>{post.content}</ReactMarkdown></div>
                <hr style={{margin: "3rem 0"}} />
                <div className="paywall"><h3>Unlock Full Access</h3>{renderPaywallActions()}</div>
            </div>
        </div>
    );
}

export default Blog;