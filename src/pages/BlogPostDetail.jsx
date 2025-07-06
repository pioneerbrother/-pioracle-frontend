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

    useEffect(() => {
        if (!slug) return;
        
        let isMounted = true;
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
                    if (!walletAddress) {
                        setPageState('prompt_connect');
                    } else {
                        setPageState('checking_access');
                    }
                }
            } catch (e) {
                if (isMounted) {
                    setPageState('error');
                    setErrorMessage("Post not found.");
                }
            }
        };
        loadPost();
        return () => { isMounted = false; };
    }, [slug, walletAddress, isInitialized]);

    useEffect(() => {
        if (pageState !== 'checking_access' || !premiumContentContract || !usdcContract) {
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

    const renderPaywallActions = () => {
        switch (pageState) {
            case 'prompt_connect':
                return <div><p>Please connect your wallet to unlock this premium article.</p><ConnectWalletButton /></div>;
            case 'unsupported_network':
                 return <p className="error-message">Please switch to a supported network to continue.</p>;
            case 'needs_approval':
                return <button onClick={handleApprove} className="action-button">1. Approve USDC</button>;
            
            // --- THIS IS THE FIX ---
            case 'ready_to_unlock':
                return (
                    <div>
                        <button onClick={handleUnlock} className="action-button highlight">2. Unlock Content</button>
                        {/* Add a manual reset button for debugging and fixing stuck states */}
                        <button 
                            onClick={() => setPageState('needs_approval')} 
                            style={{fontSize: '0.8rem', marginTop: '1rem', background: 'none', border: 'none', color: '#666', cursor: 'pointer', textDecoration: 'underline', display: 'block', width: '100%', textAlign: 'center'}}
                        >
                            Wrong step? Click to re-approve.
                        </button>
                    </div>
                );
            // --- END OF FIX ---

            case 'checking':
            case 'fetching_secure':
                return <LoadingSpinner message="Verifying..." />;
            case 'error':
                return <p className="error-message">{errorMessage}</p>;
            default:
                return <LoadingSpinner message="Loading..." />;
        }
    };

    if (pageState === 'initializing' || pageState === 'loading' || !postData.frontmatter) {
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