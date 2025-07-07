import React, { useState, useEffect, useContext, useMemo, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { ethers } from 'ethers';
import ReactMarkdown from 'react-markdown';
import matter from 'gray-matter';

import { WalletContext } from './WalletProvider';
import LoadingSpinner from '../components/common/LoadingSpinner';
import ConnectWalletButton from '../components/common/ConnectWalletButton';
// --- FIX: --- Import the helper function to get the target chain ID.
import { getConfigForChainId, getTargetChainIdHex } from '../config/contractConfig';
import PremiumContentABI from '../config/abis/PremiumContent.json';
import IERC20_ABI from '../config/abis/IERC20.json';
import './BlogPostPage.css';

function BlogPostDetail() {
    const { slug } = useParams();
    const { walletAddress, chainId, signer, isInitialized } = useContext(WalletContext);

    // --- FIX: --- Get the application's target chain ID from your config.
    const targetChainId = useMemo(() => parseInt(getTargetChainIdHex(), 16), []);

    const [postData, setPostData] = useState({ content: '', frontmatter: null });
    const [pageState, setPageState] = useState('initializing');
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

                // --- FIX: --- Enhanced logic to handle premium posts and network state.
                if (frontmatter.premium !== true) {
                    setPageState('unlocked');
                } else {
                    if (!walletAddress) {
                        setPageState('prompt_connect');
                    } else if (chainId !== targetChainId) {
                        // This is the new, crucial check for wrong network.
                        setPageState('unsupported_network');
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
        // --- FIX: --- Added chainId and targetChainId to the dependency array.
    }, [slug, walletAddress, isInitialized, chainId, targetChainId]);

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
        // Stop if not in the right state, or contracts/wallet not ready.
        if (pageState !== 'checking_access' || !premiumContentContract || !usdcContract || !walletAddress || !contentId) {
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
                    setContentPrice(fee);
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
                    setErrorMessage(`Failed to check on-chain access. Please ensure you are on the correct network.`);
                }
            }
        };

        checkAccess();
        return () => { isMounted = false; };
    }, [pageState, walletAddress, premiumContentContract, usdcContract, contentId, secureFetchContent]);

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

    const renderPaywallActions = () => {
        switch (pageState) {
            case 'prompt_connect':
                return <div><p>Please connect your wallet to unlock this premium article.</p><ConnectWalletButton /></div>;
            
            // --- FIX: --- Added the new case to render the "Unsupported Network" message.
            case 'unsupported_network':
                return <div className="error-message">Please switch your wallet to BNB Mainnet to continue.</div>;
            
            case 'needs_approval':
                return (
                    <div>
                        <p>To unlock this article, you need to approve USDC spending for the contract.</p>
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
            case 'fetching_secure':
            case 'checking_access':
                return <LoadingSpinner message="Verifying on-chain..." />;
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
                    {/* --- FIX: --- Changed this from a hardcoded message to show the initial content from the markdown file. */}
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


