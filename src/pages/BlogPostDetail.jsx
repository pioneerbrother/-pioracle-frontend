// src/pages/BlogPostDetail.jsx  (This is the final, recommended component)

import React, { useState, useEffect, useContext, useMemo } from 'react';
import { useParams } from 'react-router-dom'; // To read the slug from the URL
import { ethers } from 'ethers';
import matter from 'gray-matter';
import ReactMarkdown from 'react-markdown';

import { WalletContext } from './WalletProvider'; // Your existing context
import { getConfigForChainId } from '../config/contractConfig';

// ABIs - assuming they are in the correct path
import PAYWALL_ABI from '../config/abis/PremiumContent.json'; 
import IERC20_ABI from '../config/abis/IERC20.json';

// Reusable components
import LoadingSpinner from '../components/common/LoadingSpinner';
import ConnectWalletButton from '../components/common/ConnectWalletButton';

function BlogPostDetail() {
    // 1. Get the article slug dynamically from the URL (e.g., 'invasion-plan-of-turkey-en')
    const { slug } = useParams(); 

    // 2. Use your excellent state management logic
    const [pageState, setPageState] = useState('initializing');
    const [errorMessage, setErrorMessage] = useState('');
    const [post, setPost] = useState({ frontmatter: null, content: null });

    // 3. Consume the wallet context
    const { walletAddress, signer, chainId, isInitialized } = useContext(WalletContext);
    
    // 4. Derive config and contracts using useMemo for efficiency
    const currentNetworkConfig = useMemo(() => getConfigForChainId(chainId), [chainId]);
    const paywallAddress = currentNetworkConfig?.premiumContentContractAddress; // Make sure this name matches your config
    const usdcAddress = currentNetworkConfig?.usdcTokenAddress; // Make sure this name matches your config

    const paywallContract = useMemo(() => {
        if (!signer || !paywallAddress) return null;
        const abi = PAYWALL_ABI.abi || PAYWALL_ABI;
        return new ethers.Contract(paywallAddress, abi, signer);
    }, [signer, paywallAddress]);

    const usdcContract = useMemo(() => {
        if (!signer || !usdcAddress) return null;
        const abi = IERC20_ABI.abi || IERC20_ABI;
        return new ethers.Contract(usdcAddress, abi, signer);
    }, [signer, usdcAddress]);

    // 5. Generate the content ID dynamically from the slug
    const contentId = useMemo(() => {
        if (!slug) return null;
        return ethers.utils.id(slug);
    }, [slug]);

    // Effect 1: Load the post's content and frontmatter based on the slug
    useEffect(() => {
        if (!slug) return;
        
        const fetchPost = async () => {
            try {
                // Dynamically import the markdown file
                const rawContentModule = await import(`../posts/${slug}.md?raw`);
                const { data, content } = matter(rawContentModule.default);
                setPost({ frontmatter: data, content: content });
            } catch (e) {
                setPageState('error');
                setErrorMessage("Post not found.");
            }
        };
        fetchPost();
    }, [slug]);

    // Effect 2: Run the access check logic once everything is ready
    useEffect(() => {
        // Wait for all dependencies to be ready
        if (!isInitialized || !post.frontmatter || !contentId) {
            return;
        }

        // If the post is NOT premium, unlock it immediately and stop.
        if (!post.frontmatter.premium) {
            setPageState('unlocked');
            return;
        }

        // --- If it IS a premium post, run your paywall logic ---
        if (!walletAddress) {
            setPageState('prompt_connect');
            return;
        }
        if (!paywallContract || !usdcContract) {
            setPageState('error');
            setErrorMessage(`App is not configured for this chain (ID: ${chainId}). Please switch network.`);
            return;
        }

        const checkAccess = async () => {
            setPageState('checking');
            setErrorMessage('');
            try {
                const hasPaid = await paywallContract.hasAccess(contentId, walletAddress);

                if (hasPaid) {
                    setPageState('unlocked');
                } else {
                    const requiredPrice = await paywallContract.contentPrice();
                    const currentAllowance = await usdcContract.allowance(walletAddress, paywallContract.address);
                    if (currentAllowance.lt(requiredPrice)) {
                        setPageState('needs_approval');
                    } else {
                        setPageState('ready_to_unlock');
                    }
                }
            } catch (e) {
                console.error("Error in checkAccess effect:", e);
                setPageState('error');
                setErrorMessage("Failed to check access on-chain. Please refresh.");
            }
        };
        
        checkAccess();

    }, [isInitialized, walletAddress, chainId, paywallContract, usdcContract, post.frontmatter, contentId]);


    // --- Your Handler Functions (Approve & Unlock) ---
    // These are great as they are, just using the dynamic 'contentId'
    const handleApprove = async () => { /* ... your existing handleApprove logic ... */ };
    const handleUnlock = async () => { /* ... your existing handleUnlock logic ... */ };

    // --- RENDER LOGIC ---

    if (!post.frontmatter && pageState !== 'error') {
        return <LoadingSpinner message="Loading post..." />;
    }

    if (pageState === 'unlocked') {
        return (
            <div className="page-container blog-post">
                <h1>{post.frontmatter.title}</h1>
                <p className="post-meta">Published on {post.frontmatter.date}</p>
                <hr />
                <ReactMarkdown className="post-content">{post.content}</ReactMarkdown>
            </div>
        );
    }

    // Paywall UI
    const renderPaywallActions = () => {
        switch (pageState) {
            case 'initializing': return <LoadingSpinner message="Initializing..." />;
            case 'prompt_connect': return <ConnectWalletButton />;
            case 'checking': return <LoadingSpinner message="Verifying with blockchain..." />;
            case 'needs_approval':
                return <button className="unlock-btn" onClick={handleApprove}>1. Approve USDC</button>;
            case 'ready_to_unlock':
                return <button className="unlock-btn" onClick={handleUnlock}>2. Unlock Content for 1,000,000 USDC</button>;
            case 'error':
                return <p className="error-message">{errorMessage}</p>;
            default:
                return <p>Something went wrong.</p>;
        }
    };

    return (
        <div className="page-container blog-post">
            <div className="paywall">
                <h1>{post.frontmatter.title}</h1>
                <p className="paywall-subtitle">This is a premium article.</p>
                <div className="paywall-action">
                    <h3>Unlock Full Access</h3>
                    <div className="button-group">
                        {renderPaywallActions()}
                    </div>
                    {pageState !== 'error' && errorMessage && <p className="error-message">{errorMessage}</p>}
                </div>
            </div>
        </div>
    );
}

export default BlogPostDetail;