// src/pages/Blog.jsx

import React, { useState, useEffect, useContext, useMemo, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ethers } from 'ethers';
import ReactMarkdown from 'react-markdown';
import { useWeb3ModalProvider } from '@web3modal/ethers5/react';

// Import our new, robust post helpers
import { allPosts, getPostBySlug } from '../posts/index.js';

// Import all necessary components and context
import { WalletContext } from '../context/WalletContext.jsx';
import LoadingSpinner from '../components/common/LoadingSpinner.jsx';
import ConnectWalletButton from '../components/common/ConnectWalletButton.jsx';
import { getConfigForChainId, getTargetChainIdHex } from '../config/contractConfig.js';
import PremiumContentABI from '../config/abis/PremiumContent.json';
import IERC20_ABI from '../config/abis/IERC20.json';
import './BlogPage.css';

// ======================================================================
// === THE UNIFIED BLOG COMPONENT =======================================
// ======================================================================
function Blog() {
    const { slug } = useParams();

    // If a slug exists in the URL, render the detail/paywall view
    if (slug) {
        const post = getPostBySlug(slug);
        if (!post) {
            return <div className="page-container"><h1>404 - Post Not Found</h1></div>;
        }
        return <BlogPostDetailView post={post} />;
    }

    // Otherwise, show the list of all posts
    return (
        <div className="page-container blog-page">
            <h1>PiOracle Insights</h1>
            <p className="page-subtitle">Analysis, guides, and updates from the team.</p>
            <div className="post-list">
                {allPosts.map(post => (
                    <div key={post.slug} className="post-list-item">
                        <Link to={`/posts/${post.slug}`}>
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
    const { walletAddress, chainId, isConnected, isInitialized } = useContext(WalletContext);
    const { walletProvider } = useWeb3ModalProvider();
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
    
    const contentId = useMemo(() => ethers.utils.id(post.slug), [post.slug]);

    useEffect(() => {
        if (!isInitialized) { setPageState('initializing'); return; }
        if (post.frontmatter.premium !== true) { setPageState('unlocked'); return; }
        if (!isConnected) { setPageState('prompt_connect'); return; }
        if (chainId !== targetChainId) { setPageState('unsupported_network'); return; }
        if (!premiumContentContract || !usdcContract) { setPageState('initializing'); return; }
        const checkAccess = async () => {
            setPageState('checking_access');
            try {
                const hasPaid = await premiumContentContract.hasAccess(contentId, walletAddress);
                if (hasPaid) {
                    setPageState('unlocked');
                } else {
                    const feeInWei = await premiumContentContract.contentPrice();
                    const decimals = 18;
                    setPrice({ amount: ethers.utils.formatUnits(feeInWei, decimals), symbol: 'USDC', raw: feeInWei });
                    const allowance = await usdcContract.allowance(walletAddress, premiumContentContract.address);
                    setPageState(allowance.lt(feeInWei) ? 'needs_approval' : 'ready_to_unlock');
                }
            } catch (e) {
                setPageState('error');
                setErrorMessage('Failed to check access. Please refresh.');
            }
        };
        checkAccess();
    }, [isInitialized, post, isConnected, walletAddress, chainId, targetChainId, premiumContentContract, usdcContract, contentId]);
    
    const handleApprove = useCallback(async () => { /* ... Your correct logic ... */ }, [usdcContract, premiumContentContract, price]);
    const handleUnlock = useCallback(async () => { /* ... Your correct logic ... */ }, [premiumContentContract, contentId]);
    const handleSwitchNetwork = useCallback(async () => { /* ... Your correct logic ... */ }, []);

    const renderPaywallActions = () => { /* ... Your correct logic ... */ };

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
    
    return (
        <div className="blog-post-page">
            <div className="blog-post-content-wrapper">
                <h1 className="post-title">{post.frontmatter.title}</h1>
                <p className="post-meta">Published on {post.frontmatter.date} by {post.frontmatter.author}</p>
                <div className="post-body-content excerpt">
                    <ReactMarkdown>{post.excerpt}</ReactMarkdown>
                    <div className="excerpt-fadeout" />
                </div>
                <div className="paywall"><h3>Unlock Full Access</h3>{renderPaywallActions()}</div>
            </div>
        </div>
    );
}

export default Blog;