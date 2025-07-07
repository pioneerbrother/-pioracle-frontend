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

    const [postData, setPostData] = useState({ content: '', frontmatter: null });
    const [pageState, setPageState] = useState('initializing'); // 'initializing', 'loading', 'prompt_connect', 'checking_access', 'needs_approval', 'ready_to_unlock', 'unlocked', 'error', 'fetching_secure'
    const [errorMessage, setErrorMessage] = useState('');
    const [contentPrice, setContentPrice] = useState(ethers.BigNumber.from(0));

    const [premiumContentContract, setPremiumContentContract] = useState(null);
    const [usdcContract, setUsdcContract] = useState(null);

    // Effect to initialize contracts when signer or chainId changes
    useEffect(() => {
        if (signer && chainId) {
            const config = getConfigForChainId(chainId);
            if (config?.premiumContentContractAddress) {
                setPremiumContentContract(new ethers.Contract(config.premiumContentContractAddress, (PremiumContentABI.abi || PremiumContentABI), signer));
            } else {
                setPremiumContentContract(null); // Clear contract if chain is not supported
            }
            if (config?.usdcTokenAddress) {
                setUsdcContract(new ethers.Contract(config.usdcTokenAddress, (IERC20_ABI.abi || IERC20_ABI), signer));
            } else {
                setUsdcContract(null); // Clear contract if chain is not supported
            }
        } else {
            setPremiumContentContract(null);
            setUsdcContract(null);
        }
    }, [signer, chainId]);

    const contentId = useMemo(() => slug ? ethers.utils.id(slug) : null, [slug]);

    // Effect to load post content and determine initial paywall state
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

                // Determine initial state based on premium status and wallet connection
                if (frontmatter.premium !== true) {
                    setPageState('unlocked');
                } else {
                    if (!walletAddress) {
                        setPageState('prompt_connect');
                    } else {
                        // If wallet is connected, proceed to check access
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
    }, [slug, walletAddress, isInitialized]); // isInitialized ensures wallet context is ready

    // Callback to securely fetch premium content (placeholder)
    const secureFetchContent = useCallback(async () => {
        // In a real application, this would fetch the premium content
        // from a secure backend after successful payment/access verification.
        // For this example, we'll just simulate it and set the state to unlocked.
        setPageState('fetching_secure');
        await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate network delay
        if (postData.frontmatter) {
            setPageState('unlocked');
        } else {
            setPageState('error');
            setErrorMessage("Failed to fetch premium content.");
        }
    }, [postData.frontmatter]); // Dependency on postData.frontmatter

    // Effect to check on-chain access and allowance
    useEffect(() => {
        // Only proceed if it's a premium post and contracts are ready
        if (!postData.frontmatter?.premium || !premiumContentContract || !usdcContract || !walletAddress || !contentId) {
            // If wallet is not connected for a premium post, ensure prompt_connect state
            if (postData.frontmatter?.premium && !walletAddress && pageState !== 'prompt_connect') {
                setPageState('prompt_connect');
            }
            return;
        }

        // Ensure we are in a state that requires access checking
        if (pageState !== 'checking_access' && pageState !== 'needs_approval' && pageState !== 'ready_to_unlock') {
            // If wallet just connected, or state needs re-evaluation, set to checking_access
            if (walletAddress && postData.frontmatter?.premium && pageState !== 'fetching_secure' && pageState !== 'unlocked') {
                 setPageState('checking_access');
            } else {
                return; // Do not proceed if not in an relevant state
            }
        }

        let isMounted = true;
        const checkAccess = async () => {
            setPageState('checking_access'); // Set state to checking_access before starting checks
            try {
                const hasPaid = await premiumContentContract.hasAccess(contentId, walletAddress);
                if (!isMounted) return;

                if (hasPaid) {
                    await secureFetchContent();
                } else {
                    const fee = await premiumContentContract.contentPrice();
                    setContentPrice(fee); // Store the content price
                    const allowance = await usdcContract.allowance(walletAddress, premiumContentContract.address);
                    if (!isMounted) return;

                    if (allowance.lt(fee)) {
                        setPageState('needs_approval');
                    } else {
                        setPageState('ready_to_unlock');
                    }
                }
            } catch (e) {
                console.error("Error checking on-chain access:", e);
                if (isMounted) {
                    setPageState('error');
                    // Ensure this template literal is correctly formed
                    setErrorMessage(`Failed to check on-chain access. ${e.message || e.toString()}`);
                }
            }
        };

        // Only run checkAccess if we are in the appropriate state
        if (pageState === 'checking_access' || (walletAddress && postData.frontmatter?.premium && (pageState === 'prompt_connect' || pageState === 'needs_approval' || pageState === 'ready_to_unlock'))) {
            checkAccess();
        }

        return () => { isMounted = false; };
    }, [walletAddress, premiumContentContract, usdcContract, contentId, postData.frontmatter, secureFetchContent, pageState]); // Added pageState to dependencies to react to state changes

    // Handle Approve USDC transaction
    const handleApprove = useCallback(async () => {
        if (!usdcContract || !premiumContentContract || !contentPrice.gt(0)) {
            setErrorMessage("Contracts not ready or content price not loaded.");
            setPageState('error');
            return;
        }

        setPageState('checking'); // Indicate transaction is in progress
        setErrorMessage('');
        try {
            const tx = await usdcContract.approve(premiumContentContract.address, contentPrice);
            await tx.wait(); // Wait for the transaction to be mined
            setPageState('ready_to_unlock'); // Move to unlock step after approval
        } catch (e) {
            console.error("Error approving USDC:", e);
            // Ensure this template literal is correctly formed
            setErrorMessage(`Failed to approve USDC. ${e.reason || e.message || e.toString()}`);
            setPageState('needs_approval'); // Stay on approval step if failed
        }
    }, [usdcContract, premiumContentContract, contentPrice]);

    // Handle Unlock Content transaction
    const handleUnlock = useCallback(async () => {
        if (!premiumContentContract || !contentId) {
            setErrorMessage("Premium content contract not ready.");
            setPageState('error');
            return;
        }

        setPageState('checking'); // Indicate transaction is in progress
        setErrorMessage('');
        try {
            const tx = await premiumContentContract.purchaseContent(contentId);
            await tx.wait(); // Wait for the transaction to be mined
            await secureFetchContent(); // Fetch content after successful purchase
        } catch (e) {
            console.error("Error unlocking content:", e);
            // Ensure this template literal is correctly formed
            setErrorMessage(`Failed to unlock content. ${e.reason || e.message || e.toString()}`);
            setPageState('ready_to_unlock'); // Stay on unlock step if failed
        }
    }, [premiumContentContract, contentId, secureFetchContent]);


    const renderPaywallActions = () => {
        switch (pageState) {
            case 'prompt_connect':
                return <div><p>Please connect your wallet to unlock this premium article.</p><ConnectWalletButton /></div>;
            case 'unsupported_network': // This state should ideally be handled by WalletProvider's `isUnsupportedByDApp`
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
                        {/* Add a manual reset button for debugging and fixing stuck states */}
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
            case 'checking_access': // Display loading spinner while checking access
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
                    {/* Display a preview or truncated content if desired */}
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

