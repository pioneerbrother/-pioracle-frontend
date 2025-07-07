// src/pages/Blog.jsx

import React, { useState, useEffect, useContext, useMemo, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
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
const allPosts = Object.entries(postModules).map(([path, rawContent]) => {
    const { data, content } = matter(rawContent);
    const slug = path.split('/').pop().replace('.md', '');
    return { slug, frontmatter: data, content };
}).filter(post => post.frontmatter.title).sort((a, b) => new Date(b.frontmatter.date) - new Date(a.frontmatter.date));

// This is the main component that decides whether to show the list or a single post
function Blog() {
    const { slug } = useParams();
    if (slug) {
        const post = allPosts.find(p => p.slug === slug);
        if (!post) {
            return <div className="page-container"><h1>Post not found</h1></div>;
        }
        return <BlogPostDetailView post={post} />;
    }
    return (
        <div className="page-container blog-page">
            <h1>PiOracle Insights</h1>
            <div className="post-list">
                {allPosts.map(post => (
                    <div key={post.slug} className="post-list-item">
                        <Link to={`/blog/${post.slug}`}><h2>{post.frontmatter.title}</h2><p className="post-meta">Published on {post.frontmatter.date}</p><span className="read-more">Read More →</span></Link>
                    </div>
                ))}
            </div>
        </div>
    );
}

// This is the sub-component that handles all the paywall logic
function BlogPostDetailView({ post }) {
    console.log("--- BLOG POST DETAIL VIEW - SELF SUFFICIENT VERSION LOADED ---");
    
    // Get the raw, stable data from our new "dumb" provider
    const { walletAddress, chainId, isConnected, walletProvider } = useContext(WalletContext);
    const targetChainId = useMemo(() => parseInt(getTargetChainIdHex(), 16), []);

    const [pageState, setPageState] = useState('initializing');
    const [errorMessage, setErrorMessage] = useState('');

    // --- NEW LOGIC: Create ethers objects locally inside the component ---
    const { signer, premiumContentContract, usdcContract } = useMemo(() => {
        if (isConnected && walletProvider && chainId) {
            const provider = new ethers.providers.Web3Provider(walletProvider);
            const signer = provider.getSigner();
            const config = getConfigForChainId(chainId);
            
            const pcc = config?.premiumContentContractAddress ? new ethers.Contract(config.premiumContentContractAddress, (PremiumContentABI.abi || PremiumContentABI), signer) : null;
            const usdc = config?.usdcTokenAddress ? new ethers.Contract(config.usdcTokenAddress, (IERC20_ABI.abi || IERC20_ABI), signer) : null;
            
            return { signer, premiumContentContract: pcc, usdcContract: usdc };
        }
        return { signer: null, premiumContentContract: null, usdcContract: null };
    }, [isConnected, walletProvider, chainId]);
    
    const contentId = useMemo(() => post.slug ? ethers.utils.id(post.slug) : null, [post.slug]);

    // This state machine is now stable because its dependencies are stable
    useEffect(() => {
        if (post.frontmatter.premium !== true) { setPageState('unlocked'); return; }
        if (!isConnected) { setPageState('prompt_connect'); return; }
        if (chainId !== targetChainId) { setPageState('unsupported_network'); return; }
        if (!premiumContentContract || !usdcContract) { setPageState('initializing'); return; }
        
        const checkAccess = async () => {
            setPageState('checking_access');
            try {
                const hasPaid = await premiumContentContract.hasAccess(contentId, walletAddress);
                if (hasPaid) { setPageState('unlocked'); }
                else {
                    const fee = await premiumContentContract.contentPrice();
                    const allowance = await usdcContract.allowance(walletAddress, premiumContentContract.address);
                    setPageState(allowance.lt(fee) ? 'needs_approval' : 'ready_to_unlock');
                }
            } catch (e) {
                setPageState('error');
                setErrorMessage('Failed to check access. Please ensure wallet is on the correct network and refresh.');
            }
        };
        checkAccess();
    }, [post, isConnected, walletAddress, chainId, targetChainId, premiumContentContract, usdcContract, contentId]);
    
    // --- The rest of your component (callbacks and render logic) is correct and unchanged ---
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
                <div className="post-body-content"><ReactMarkdown>{post.content}</ReactMarkdown></div>
                <hr style={{margin: "3rem 0"}} />
                <div className="paywall"><h3>Unlock Full Access</h3>{renderPaywallActions()}</div>
            </div>
        </div>
    );
}

export default Blog;