import React, { useState, useEffect, useContext, useMemo, useCallback } from 'react';
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
    const { walletAddress, chainId, signer, isInitialized, provider } = useContext(WalletContext);

    // --- ADD THIS CONSOLE LOG ---
    console.log('BlogPostDetail Rendered/Re-rendered. Wallet Address:', walletAddress, 'Chain ID:', chainId, 'isInitialized:', isInitialized, 'Current PageState:', pageState);
    // --- END ADD ---

    const [postData, setPostData] = useState({ content: '', frontmatter: null });
    const [pageState, setPageState] = useState('initializing');
    const [errorMessage, setErrorMessage] = useState('');
    const [contentPrice, setContentPrice] = useState(ethers.BigNumber.from(0));

    const [premiumContentContract, setPremiumContentContract] = useState(null);
    const [usdcContract, setUsdcContract] = useState(null);

    // Effect to initialize contracts when signer or chainId changes
    useEffect(() => {
        // --- ADD THIS CONSOLE LOG ---
        console.log('BlogPostDetail: Contract Init Effect. Signer:', !!signer, 'Chain ID:', chainId);
        // --- END ADD ---
        if (signer && chainId) {
            const config = getConfigForChainId(chainId);
            if (config?.premiumContentContractAddress) {
                setPremiumContentContract(new ethers.Contract(config.premiumContentContractAddress, (PremiumContentABI.abi || PremiumContentABI), signer));
            } else {
                setPremiumContentContract(null);
            }
            if (config?.usdcTokenAddress) {
                setUsdcContract(new ethers.Contract(config.usdcTokenAddress, (IERC20_ABI.abi || IERC20_ABI), signer));
            } else {
                setUsdcContract(null);
            }
        } else {
            setPremiumContentContract(null);
            setUsdcContract(null);
        }
    }, [signer, chainId]);

    const contentId = useMemo(() => slug ? ethers.utils.id(slug) : null, [slug]);

    // Effect to load post content and determine initial paywall state
    useEffect(() => {
        // --- ADD THIS CONSOLE LOG ---
        console.log('BlogPostDetail: Load Post Effect. Slug:', slug, 'Wallet Address:', walletAddress, 'isInitialized:', isInitialized);
        // --- END ADD ---
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

                // Determine initial state based on premium status and wallet connection
                if (frontmatter.premium !== true) {
                    // --- ADD THIS CONSOLE LOG ---
                    console.log('BlogPostDetail: Post is NOT premium. Setting pageState to unlocked.');
                    // --- END ADD ---
                    setPageState('unlocked');
                } else {
                    if (!walletAddress) {
                        // --- ADD THIS CONSOLE LOG ---
                        console.log('BlogPostDetail: Post is premium, wallet NOT connected. Setting pageState to prompt_connect.');
                        // --- END ADD ---
                        setPageState('prompt_connect');
                    } else {
                        // --- ADD THIS CONSOLE LOG ---
                        console.log('BlogPostDetail: Post is premium, wallet IS connected. Setting pageState to checking_access.');
                        // --- END ADD ---
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

    // Callback to securely fetch premium content (placeholder)
    const secureFetchContent = useCallback(async () => {
        setPageState('fetching_secure');
        await new Promise(resolve => setTimeout(resolve, 1000));
        if (postData.frontmatter) {
            setPageState('unlocked');
        } else {
            setPageState('error');
            setErrorMessage("Failed to fetch premium content.");
        }
    }, [postData.frontmatter]);

    // Effect to check on-chain access and allowance
    useEffect(() => {
        // --- ADD THIS CONSOLE LOG ---
        console.log('BlogPostDetail: Access Check Effect. Current PageState:', pageState, 'Wallet:', walletAddress, 'Premium Content Contract:', !!premiumContentContract, 'USDC Contract:', !!usdcContract, 'Content ID:', contentId, 'Is Premium Post:', postData.frontmatter?.premium);
        // --- END ADD ---

        if (!postData.frontmatter?.premium || !premiumContentContract || !usdcContract || !walletAddress || !contentId) {
            if (postData.frontmatter?.premium && !walletAddress && pageState !== 'prompt_connect') {
                // --- ADD THIS CONSOLE LOG ---
                console.log('BlogPostDetail: Access Check Effect - Premium post, no wallet, not prompt_connect. Setting to prompt_connect.');
                // --- END ADD ---
                setPageState('prompt_connect');
            }
            return;
        }

        if (pageState !== 'checking_access' && pageState !== 'needs_approval' && pageState !== 'ready_to_unlock') {
            if (walletAddress && postData.frontmatter?.premium && pageState !== 'fetching_secure' && pageState !== 'unlocked') {
                 // --- ADD THIS CONSOLE LOG ---
                 console.log('BlogPostDetail: Access Check Effect - Wallet connected, premium post, not final state. Setting to checking_access.');
                 // --- END ADD ---
                 setPageState('checking_access');
            } else {
                return;
            }
        }

        let isMounted = true;
        const checkAccess = async () => {
            // --- ADD THIS CONSOLE LOG ---
            console.log('BlogPostDetail: Running checkAccess function...');
            // --- END ADD ---
            setPageState('checking_access');
            try {
                const hasPaid = await premiumContentContract.hasAccess(contentId, walletAddress);
                if (!isMounted) return;

                if (hasPaid) {
                    // --- ADD THIS CONSOLE LOG ---
                    console.log('BlogPostDetail: User has paid. Fetching secure content.');
                    // --- END ADD ---
                    await secureFetchContent();
                } else {
                    const fee = await premiumContentContract.contentPrice();
                    setContentPrice(fee);
                    const allowance = await usdcContract.allowance(walletAddress, premiumContentContract.address);
                    if (!isMounted) return;

                    if (allowance.lt(fee)) {
                        // --- ADD THIS CONSOLE LOG ---
                        console.log('BlogPostDetail: Needs approval. Setting pageState to needs_approval. Allowance:', allowance.toString(), 'Fee:', fee.toString());
                        // --- END ADD ---
                        setPageState('needs_approval');
                    } else {
                        // --- ADD THIS CONSOLE LOG ---
                        console.log('BlogPostDetail: Ready to unlock. Setting pageState to ready_to_unlock. Allowance:', allowance.toString(), 'Fee:', fee.toString());
                        // --- END ADD ---
                        setPageState('ready_to_unlock');
                    }
                }
            } catch (e) {
                console.error("Error checking on-chain access:", e);
                if (isMounted) {
                    setPageState('error');
                    setErrorMessage(`Failed to check on-chain access. ${e.message || e.toString()}`);
                }
            }
        };

        if (pageState === 'checking_access' || (walletAddress && postData.frontmatter?.premium && (pageState === 'prompt_connect' || pageState === 'needs_approval' || pageState === 'ready_to_unlock'))) {
            checkAccess();
        }

        return () => { isMounted = false; };
    }, [walletAddress, premiumContentContract, usdcContract, contentId, postData.frontmatter, secureFetchContent, pageState]);

    // ... rest of the component (handleApprove, handleUnlock, renderPaywallActions, etc.)
    // No changes needed in handleApprove, handleUnlock, renderPaywallActions for this debugging step.
    // ...
    const handleApprove = useCallback(async () => {
        if (!usdcContract || !premiumContentContract || !contentPrice.gt(0)) {
            setErrorMessage("Contracts not ready or content price not loaded.");
            setPageState('error');
            return;
        }

        setPageState('checking');
        setErrorMessage('');
        try {
            const tx = await usdcContract.approve(premiumContentContract.address, contentPrice);
            // --- ADD THIS CONSOLE LOG ---
            console.log('BlogPostDetail: Approve TX sent:', tx.hash);
            // --- END ADD ---
            await tx.wait();
            // --- ADD THIS CONSOLE LOG ---
            console.log('BlogPostDetail: Approve TX confirmed.');
            // --- END ADD ---
            setPageState('ready_to_unlock');
        } catch (e) {
            console.error("Error approving USDC:", e);
            setErrorMessage(`Failed to approve USDC. ${e.reason || e.message || e.toString()}`);
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
            // --- ADD THIS CONSOLE LOG ---
            console.log('BlogPostDetail: Unlock TX sent:', tx.hash);
            // --- END ADD ---
            await tx.wait();
            // --- ADD THIS CONSOLE LOG ---
            console.log('BlogPostDetail: Unlock TX confirmed.');
            // --- END ADD ---
            await secureFetchContent();
        } catch (e) {
            console.error("Error unlocking content:", e);
            setErrorMessage(`Failed to unlock content. ${e.reason || e.message || e.toString()}`);
            setPageState('ready_to_unlock');
        }
    }, [premiumContentContract, contentId, secureFetchContent]);


    const renderPaywallActions = () => {
        switch (pageState) {
            case 'prompt_connect':
                return <div><p>Please connect your wallet to unlock this premium article.</p><ConnectWalletButton /></div>;
            case 'unsupported_network':
                 return <p className="error-message">Please switch to a supported network to continue.</p>;
            case 'needs_approval':
                return (
                    <div>
                        <p>To unlock this article, you need to approve USDC for the contract.</p>
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
                        <button
                            onClick={() => setPageState('needs_approval')}
                            style={{fontSize: '0.8rem', marginTop: '1rem', background: 'none', border: 'none', color: '#666', cursor: 'pointer', textDecoration: 'underline', display: 'block', width: '100%', textAlign: 'center'}}
                        >
                            Wrong step? Click to re-approve.
                        </button>
                    </div>
                );
            case 'checking':
            case 'fetching_secure':
            case 'checking_access':
                return <LoadingSpinner message="Verifying access..." />;
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
                    <p>This is a premium article. Please unlock to view full content.</p>
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


