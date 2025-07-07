import React, { useState, useEffect, useContext, useMemo, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { ethers } from 'ethers';
import ReactMarkdown from 'react-markdown';
import matter from 'gray-matter';
import { useWeb3ModalProvider } from '@web3modal/ethers5/react';

import { WalletContext } from './WalletProvider';
import LoadingSpinner from '../components/common/LoadingSpinner';
import ConnectWalletButton from '../components/common/ConnectWalletButton';
import { getConfigForChainId, getTargetChainIdHex } from '../config/contractConfig';
import PremiumContentABI from '../config/abis/PremiumContent.json';
import IERC20_ABI from '../config/abis/IERC20.json';
import './BlogPage.css';

// --- This is the Vite-specific feature to load all markdown files. ---
// By placing it here, it is available to the entire component.
const postModules = import.meta.glob('../posts/*.md', { as: 'raw', eager: true });

function BlogPostPaywall() {
    console.log("--- BLOG POST PAYWALL - UNIFIED & CORRECTED VERSION ---");
    const { slug } = useParams();

    // The logic to find the post is now safely inside the component that defines postModules.
    const post = useMemo(() => {
        const postPath = Object.keys(postModules).find(path => path.endsWith(`${slug}.md`));
        if (!postPath) return null;
        const rawContent = postModules[postPath];
        const { data, content } = matter(rawContent);
        const excerpt = data.excerpt || content.substring(0, 400) + '...';
        return { slug, frontmatter: data, content, excerpt };
    }, [slug]);

    // Consume the simple, stable state from the WalletProvider.
    const { walletAddress, chainId, isConnected, isInitialized } = useContext(WalletContext);
    const { walletProvider } = useWeb3ModalProvider();
    
    const targetChainId = useMemo(() => parseInt(getTargetChainIdHex(), 16), []);
    const [pageState, setPageState] = useState('initializing');
    const [errorMessage, setErrorMessage] = useState('');
    const [price, setPrice] = useState(null);

    // Create stable contract instances right here, where they are needed.
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
    
    const contentId = useMemo(() => post?.slug ? ethers.utils.id(post.slug) : null, [post]);

    // The Master State Machine Effect. This is stable and correct.
    useEffect(() => {
        if (!isInitialized || !post) {
            setPageState('initializing');
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
                    const feeInWei = await premiumContentContract.contentPrice();
                    const decimals = 18; // Assume 18, but could fetch from contract if needed
                    setPrice({ amount: ethers.utils.formatUnits(feeInWei, decimals), symbol: 'USDC', raw: feeInWei });
                    const allowance = await usdcContract.allowance(walletAddress, premiumContentContract.address);
                    setPageState(allowance.lt(feeInWei) ? 'needs_approval' : 'ready_to_unlock');
                }
            } catch (e) {
                console.error("Error checking access:", e);
                setPageState('error');
                setErrorMessage('Failed to check access. Please refresh.');
            }
        };
        checkAccess();
    }, [isInitialized, post, isConnected, walletAddress, chainId, targetChainId, premiumContentContract, usdcContract, contentId]);
    
    const handleApprove = useCallback(async () => {
        if (!usdcContract || !premiumContentContract || !price) return;
        setPageState('checking');
        setErrorMessage('');
        try {
            const tx = await usdcContract.approve(premiumContentContract.address, price.raw);
            await tx.wait();
            setPageState('ready_to_unlock');
        } catch(e) {
            setErrorMessage(`Approval failed: ${e.reason || 'Transaction rejected.'}`);
            setPageState('needs_approval');
        }
    }, [usdcContract, premiumContentContract, price]);
    
    const handleUnlock = useCallback(async () => {
        if (!premiumContentContract || !contentId) return;
        setPageState('checking');
        setErrorMessage('');
        try {
            const tx = await premiumContentContract.purchaseContent(contentId);
            await tx.wait();
            setPageState('unlocked');
        } catch(e) {
            setErrorMessage(`Unlock failed: ${e.reason || 'Transaction rejected.'}`);
            setPageState('ready_to_unlock');
        }
    }, [premiumContentContract, contentId]);

    const handleSwitchNetwork = useCallback(async () => {
        if (!window.ethereum) return;
        try {
            await window.ethereum.request({
                method: 'wallet_switchEthereumChain',
                params: [{ chainId: getTargetChainIdHex() }],
            });
        } catch (error) {
            setErrorMessage("Failed to switch network. Please do it manually in your wallet.");
        }
    }, []);

    const renderPaywallActions = () => {
        // Guard against hydration mismatch
        if (!isInitialized) {
            return <LoadingSpinner message="Loading..." />;
        }
        switch (pageState) {
            case 'prompt_connect':
                return (
                    <div className="wallet-connect-prompt">
                        <h4>Premium Content Locked</h4>
                        <p>Connect your wallet to unlock this exclusive analysis.</p>
                        <ConnectWalletButton />
                        <p className="small-text">You will need USDC on the BNB Chain.</p>
                    </div>
                );
            case 'unsupported_network':
                return (
                    <div className="network-alert">
                        <h4>Wrong Network</h4>
                        <p>This content is available on the BNB Smart Chain.</p>
                        <button onClick={handleSwitchNetwork} className="action-button">Switch to BNB Chain</button>
                    </div>
                );
            case 'needs_approval':
                return (
                    <div className="payment-flow">
                        <div className="steps"><div className="step active">1. Approve</div><div className="step">2. Unlock</div></div>
                        <p>Unlock this article for **{price?.amount} {price?.symbol}**. First, approve spending.</p>
                        <button onClick={handleApprove} className="action-button">Approve {price?.symbol}</button>
                        {errorMessage && <p className="error-message">{errorMessage}</p>}
                    </div>
                );
            case 'ready_to_unlock':
                 return (
                    <div className="payment-flow">
                        <div className="steps"><div className="step complete">✓</div><div className="step active">2. Unlock</div></div>
                        <p>Approval successful! You can now unlock the content.</p>
                        <button onClick={handleUnlock} className="action-button highlight">Unlock Content</button>
                        {errorMessage && <p className="error-message">{errorMessage}</p>}
                    </div>
                );
            case 'checking':
            case 'checking_access':
                return <LoadingSpinner message="Verifying on-chain..." />;
            case 'error':
                return <p className="error-message">{errorMessage}</p>;
            default: // 'initializing'
                return <LoadingSpinner message="Loading..." />;
        }
    };

    if (!post) {
        if (isInitialized) return <div className="page-container"><h1>404 - Post Not Found</h1></div>;
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
                <div className="post-body-content excerpt">
                    <ReactMarkdown>{post.excerpt}</ReactMarkdown>
                    <div className="excerpt-fadeout" />
                </div>
                <div className="paywall"><h3>Unlock Full Access</h3>{renderPaywallActions()}</div>
            </div>
        </div>
    );
}

export default BlogPostPaywall;