import React, { useState, useEffect, useContext, useMemo, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ethers } from 'ethers';
import ReactMarkdown from 'react-markdown';
import matter from 'gray-matter';

import { WalletContext } from './WalletProvider';
import LoadingSpinner from '../components/common/LoadingSpinner';
import ConnectWalletButton from '../components/common/ConnectWalletButton';
import { getTargetChainIdHex } from '../config/contractConfig';
import './BlogPage.css';

const postModules = import.meta.glob('../posts/*.md', { as: 'raw', eager: true });

function BlogPostPaywall() {
    console.log("--- BLOG POST PAYWALL - FINAL SIMPLIFIED VERSION LOADED ---");
    const { slug } = useParams();

    const post = useMemo(() => {
        const path = `../posts/${slug}.md`;
        const rawContent = postModules[path];
        if (!rawContent) return null;
        const { data, content } = matter(rawContent);
        return { slug, frontmatter: data, content };
    }, [slug]);

    const { 
        walletAddress, chainId, isConnected,
        premiumContentContract, usdcContract
    } = useContext(WalletContext);

    const targetChainId = useMemo(() => parseInt(getTargetChainIdHex(), 16), []);
    
    const [pageState, setPageState] = useState('initializing');
    const [errorMessage, setErrorMessage] = useState('');

    const contentId = useMemo(() => post?.slug ? ethers.utils.id(post.slug) : null, [post]);

    useEffect(() => {
        if (!post) {
            setPageState('initializing'); // Show loader while post loads
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
            setPageState('initializing'); // Show loader while provider creates contracts
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
                    setPageState(allowance.lt(fee) ? 'needs_approval' : 'ready_to_unlock');
                }
            } catch (e) {
                console.error("Error checking access:", e);
                setPageState('error');
                setErrorMessage('Failed to check access. Please refresh.');
            }
        };
        checkAccess();
    }, [post, isConnected, walletAddress, chainId, targetChainId, premiumContentContract, usdcContract, contentId]);
    
    const handleApprove = useCallback(async () => {
        if (!usdcContract || !premiumContentContract) return;
        setPageState('checking');
        setErrorMessage('');
        try {
            const fee = await premiumContentContract.contentPrice();
            const tx = await usdcContract.approve(premiumContentContract.address, fee);
            await tx.wait();
            setPageState('ready_to_unlock');
        } catch(e) {
            setErrorMessage(`Approval failed. ${e.reason || 'Transaction rejected.'}`);
            setPageState('needs_approval');
        }
    }, [usdcContract, premiumContentContract]);
    
    const handleUnlock = useCallback(async () => {
        if (!premiumContentContract || !contentId) return;
        setPageState('checking');
        setErrorMessage('');
        try {
            const tx = await premiumContentContract.purchaseContent(contentId);
            await tx.wait();
            setPageState('unlocked');
        } catch(e) {
            setErrorMessage(`Unlock failed. ${e.reason || 'Transaction rejected.'}`);
            setPageState('ready_to_unlock');
        }
    }, [premiumContentContract, contentId]);

    const renderPaywallActions = () => {
        switch (pageState) {
            case 'prompt_connect':
                return <div><p>Please connect your wallet to unlock this premium article.</p><ConnectWalletButton /></div>;
            case 'unsupported_network':
                return <div className="error-message">Please switch your wallet to BNB Mainnet to continue.</div>;
            case 'needs_approval':
                return (<div><p>To unlock this article, you must approve USDC spending.</p><button onClick={handleApprove} className="action-button">1. Approve USDC</button>{errorMessage && <p className="error-message">{errorMessage}</p>}</div>);
            case 'ready_to_unlock':
                return (<div><p>USDC approved. You can now unlock the content.</p><button onClick={handleUnlock} className="action-button highlight">2. Unlock Content</button>{errorMessage && <p className="error-message">{errorMessage}</p>}</div>);
            case 'checking':
            case 'checking_access':
                return <LoadingSpinner message="Verifying on-chain..." />;
            case 'error':
                return <p className="error-message">{errorMessage}</p>;
            default: // Catches 'initializing'
                return <LoadingSpinner message="Loading..." />;
        }
    };

    if (!post) {
        return <div className="page-container"><div className="blog-post-content-wrapper"><LoadingSpinner message="Loading Post..." /></div></div>;
    }

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

export default BlogPostPaywall;