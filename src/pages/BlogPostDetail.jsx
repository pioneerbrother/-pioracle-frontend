// src/pages/BlogPostDetail.jsx

import React, { useState, useEffect, useContext, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { ethers } from 'ethers';
import ReactMarkdown from 'react-markdown';
import matter from 'gray-matter'; // We need this again to read frontmatter

import { WalletContext } from './WalletProvider';
import LoadingSpinner from '../components/common/LoadingSpinner';
import ConnectWalletButton from '../components/common/ConnectWalletButton';

// ABIs
import PremiumContentABI from '../config/abis/PremiumContent.json';
import IERC20_ABI from '../config/abis/IERC20.json';

import { getConfigForChainId } from '../config/contractConfig';

function BlogPostDetail() {
    const { slug } = useParams();
    const { walletAddress, chainId, signer, isInitialized } = useContext(WalletContext);
    
    // This state now holds all post data, including frontmatter
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

    // --- MAIN useEffect: Handles BOTH Free and Premium Posts ---
    useEffect(() => {
        if (!isInitialized || !slug) return;

        const loadPost = async () => {
            setPageState('checking');
            try {
                // First, always fetch the local markdown file. For premium posts, this acts as a "teaser".
                const rawContentModule = await import(`../posts/${slug}.md?raw`);
                const { data: frontmatter, content: localContent } = matter(rawContentModule.default);
                
                setPostData({ content: localContent, frontmatter: frontmatter }); // Initially set local content

                // --- THIS IS THE CRITICAL LOGIC ---
                // Now, check if the post is marked as premium.
                if (frontmatter.premium === true) {
                    // --- PREMIUM POST LOGIC ---
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
                        // User has access, fetch the secure, full content from the backend
                        await secureFetchContent();
                    } else {
                        // User needs to pay, show the paywall buttons
                        setPageState('needs_payment');
                    }
                } else {
                    // --- FREE POST LOGIC ---
                    // If not premium, the local content is all we need. Unlock the page.
                    setPageState('unlocked');
                }
            } catch (e) {
                console.error("Failed to load post:", e);
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

            // On success, UPDATE the post content with the secure version
            setPostData(prev => ({ ...prev, content: data.content }));
            setPageState('unlocked');
        } catch (error) {
            setPageState('error');
            setErrorMessage(error.message);
        }
    };
    
    // --- handleApprove and handleUnlock functions remain the same ---
    const handleApprove = async () => { /* ... */ };
    const handleUnlock = async () => { /* ... */ };


    // --- RENDER LOGIC ---
    const renderPageContent = () => {
        // If state is unlocked, always show the full content
        if (pageState === 'unlocked') {
            return <ReactMarkdown className="post-content">{postData.content}</ReactMarkdown>;
        }

        // If it's a premium post that's not yet unlocked, show the paywall
        if (postData.frontmatter?.premium === true) {
            return (
                <div className="paywall">
                    <h1>{postData.frontmatter.title}</h1>
                    <p>This is a premium article secured on the blockchain.</p>
                    {/* Render the teaser content from the local file */}
                    <ReactMarkdown className="post-teaser">{postData.content}</ReactMarkdown> 
                    <div className="paywall-action">
                        <h3>Unlock Full Access</h3>
                        {/* ... your rendering logic for buttons, spinners, errors ... */}
                    </div>
                </div>
            );
        }

        // Default loading state
        return <LoadingSpinner message="Loading post..." />;
    };

    return (
        <div className="blog-post-page">
            {renderPageContent()}
        </div>
    );
}

export default BlogPostDetail;
