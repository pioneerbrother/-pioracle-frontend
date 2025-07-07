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
    console.log("--- BLOG POST DETAIL - LATEST VERSION LOADED (vFinal) ---");
    const { slug } = useParams();
    const { walletAddress, chainId, signer, isInitialized } = useContext(WalletContext);

    const targetChainId = useMemo(() => parseInt(getTargetChainIdHex(), 16), []);

    const [postData, setPostData] = useState({ content: '', frontmatter: null, isLoading: true });
    const [pageState, setPageState] = useState('initializing');
    const [errorMessage, setErrorMessage] = useState('');
    const [contentPrice, setContentPrice] = useState(ethers.BigNumber.from(0));

    const [premiumContentContract, setPremiumContentContract] = useState(null);
    const [usdcContract, setUsdcContract] = useState(null);

    // Effect 1: Initialize contracts when the signer changes.
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

    // Effect 2: Load the post's markdown file.
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

    // Effect 3: The Master State Machine. This is the single source of truth for the UI state.
    useEffect(() => {
        if (postData.isLoading || !postData.frontmatter || !contentId) {
            setPageState('initializing');
            return;
        }

        if (postData.frontmatter.premium !== true) {
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
                console.error("Error during on-chain access check:", e);
                setPageState('error');
                setErrorMessage('Failed to check access. Please ensure wallet is on the correct network and refresh.');
            }
        };

        checkAccess();

    }, [postData, walletAddress, chainId, targetChainId, premiumContentContract, usdcContract, contentId]);


    // --- Callbacks for user actions ---
    const secureFetchContent = useCallback(() => setPageState('unlocked'), []);

    const handleApprove = useCallback(async () => {
        if (!usdcContract || !premiumContentContract || !contentPrice.gt(0)) {
            setErrorMessage("Contracts not ready. Please refresh.");
            setPageState('error');
            return;
        }
        setPageState('checking');
        setErrorMessage('');
        try {
            const tx = await usdcContract.approve(premiumContentContract.address, contentPrice);
            await tx.wait();
            setPageState('ready_to_unlock');
        } catch (e) {
            console.error("Error approving USDC:", e);
            setErrorMessage(`Failed to approve USDC. ${e.reason || 'Transaction rejected.'}`);
            setPageState('needs_approval');
        }
    }, [usdcContract, premiumContentContract, contentPrice]);

    const handleUnlock = useCallback(async () => {
        if (!premiumContentContract || !contentId) {
            setErrorMessage("Premium content contract not ready.");
            setPageState('error');
            return;
        }
        setPageState('checking');
        setErrorMessage('');
        try {
            const tx = await premiumContentContract.purchaseContent(contentId);
            await tx.wait();
            await secureFetchContent();
        } catch (e) {
            console.error("Error unlocking content:", e);
            setErrorMessage(`Failed to unlock content. ${e.reason || 'Transaction rejected.'}`);
            setPageState('ready_to_unlock');
        }
    }, [premiumContentContract, contentId, secureFetchContent]);


    // --- Render logic ---
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

    if (postData.isLoading || pageState === 'initializing') {
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

    // This is the default "locked" view
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