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

const postModules = import.meta.glob('../posts/*.md', { as: 'raw', eager: true });

function BlogPostPaywall() {
    const { slug } = useParams();
    const { walletAddress, chainId, isConnected, isInitialized } = useContext(WalletContext);
    const { walletProvider } = useWeb3ModalProvider();
    
    const [pageState, setPageState] = useState('initializing');
    const [errorMessage, setErrorMessage] = useState('');
    const [price, setPrice] = useState(null);
    const [txStatus, setTxStatus] = useState(null);

    const post = useMemo(() => {
        const postPath = Object.keys(postModules).find(path => path.endsWith(`${slug}.md`));
        if (!postPath) return null;
        const rawContent = postModules[postPath];
        const { data, content } = matter(rawContent);
        const excerpt = data.excerpt || content.substring(0, 400) + '...';
        return { slug, frontmatter: data, content, excerpt };
    }, [slug]);

    const targetChainId = useMemo(() => parseInt(getTargetChainIdHex(), 16), []);
    const { premiumContentContract, usdcContract } = useMemo(() => {
        if (isConnected && walletProvider && chainId) {
            const provider = new ethers.providers.Web3Provider(walletProvider);
            const signer = provider.getSigner();
            const config = getConfigForChainId(chainId);
            const pcc = config?.premiumContentContractAddress ? 
                new ethers.Contract(config.premiumContentContractAddress, PremiumContentABI.abi, signer) : null;
            const usdc = config?.usdcTokenAddress ? 
                new ethers.Contract(config.usdcTokenAddress, IERC20_ABI.abi, signer) : null;
            return { premiumContentContract: pcc, usdcContract: usdc };
        }
        return { premiumContentContract: null, usdcContract: null };
    }, [isConnected, walletProvider, chainId]);
    
    const contentId = useMemo(() => post?.slug ? ethers.utils.id(post.slug) : null, [post]);

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
                    const decimals = await usdcContract.decimals();
                    setPrice({ 
                        amount: parseFloat(ethers.utils.formatUnits(feeInWei, decimals)).toFixed(2), 
                        symbol: 'USDC', 
                        raw: feeInWei 
                    });
                    const allowance = await usdcContract.allowance(walletAddress, premiumContentContract.address);
                    setPageState(allowance.lt(feeInWei) ? 'needs_approval' : 'ready_to_unlock');
                }
            } catch (e) {
                console.error("Error checking access:", e);
                setPageState('error');
                setErrorMessage('Failed to verify access. Please refresh or try again later.');
            }
        };
        checkAccess();
    }, [isInitialized, post, isConnected, walletAddress, chainId, targetChainId, premiumContentContract, usdcContract, contentId]);
    
    const handleApprove = useCallback(async () => {
        if (!usdcContract || !premiumContentContract || !price) return;
        setPageState('checking');
        setErrorMessage('');
        setTxStatus({ type: 'approval', status: 'pending' });
        
        try {
            const tx = await usdcContract.approve(premiumContentContract.address, price.raw);
            setTxStatus({ type: 'approval', status: 'mined', txHash: tx.hash });
            await tx.wait();
            setPageState('ready_to_unlock');
            setTxStatus(null);
        } catch(e) {
            setErrorMessage(`Approval failed: ${e.reason || 'Transaction rejected.'}`);
            setPageState('needs_approval');
            setTxStatus({ type: 'approval', status: 'error', error: e.message });
        }
    }, [usdcContract, premiumContentContract, price]);
    
    const handleUnlock = useCallback(async () => {
        if (!premiumContentContract || !contentId) return;
        setPageState('checking');
        setErrorMessage('');
        setTxStatus({ type: 'purchase', status: 'pending' });
        
        try {
            const tx = await premiumContentContract.purchaseContent(contentId);
            setTxStatus({ type: 'purchase', status: 'mined', txHash: tx.hash });
            await tx.wait();
            setPageState('unlocked');
            setTxStatus(null);
        } catch(e) {
            setErrorMessage(`Unlock failed: ${e.reason || 'Transaction rejected.'}`);
            setPageState('ready_to_unlock');
            setTxStatus({ type: 'purchase', status: 'error', error: e.message });
        }
    }, [premiumContentContract, contentId]);

    const handleSwitchNetwork = useCallback(async () => {
        if (!window.ethereum) {
            setErrorMessage("Wallet extension not detected");
            return;
        }
        
        try {
            await window.ethereum.request({
                method: 'wallet_switchEthereumChain',
                params: [{ chainId: getTargetChainIdHex() }],
            });
        } catch (error) {
            setErrorMessage("Failed to switch network. Please switch manually in your wallet.");
        }
    }, []);

    const renderPaywallActions = () => {
        if (!isInitialized) return <LoadingSpinner message="Initializing..." />;
        
        switch (pageState) {
            case 'prompt_connect':
                return (
                    <div className="wallet-prompt">
                        <div className="lock-icon">🔒</div>
                        <h3>Premium Content Locked</h3>
                        <p>Connect your wallet to access this exclusive analysis</p>
                        <ConnectWalletButton />
                        <div className="network-requirements">
                            <span>Requires:</span>
                            <span>• BNB Smart Chain</span>
                            <span>• USDC for payment</span>
                        </div>
                    </div>
                );
                
            case 'unsupported_network':
                return (
                    <div className="network-alert">
                        <h3>Wrong Network Detected</h3>
                        <p>Please switch to BNB Smart Chain to continue</p>
                        <button 
                            onClick={handleSwitchNetwork}
                            className="network-switch-button"
                        >
                            Switch to BNB Chain
                        </button>
                        {errorMessage && <p className="error">{errorMessage}</p>}
                    </div>
                );
                
            case 'needs_approval':
                return (
                    <div className="payment-flow">
                        <div className="steps">
                            <div className="step active">1. Approve USDC</div>
                            <div className="step">2. Unlock Content</div>
                        </div>
                        <div className="price-display">
                            Price: {price?.amount} {price?.symbol}
                        </div>
                        <button 
                            onClick={handleApprove}
                            className="action-button"
                            disabled={txStatus?.status === 'pending'}
                        >
                            {txStatus?.status === 'pending' ? 'Approving...' : 'Approve USDC'}
                        </button>
                        {txStatus?.status === 'mined' && (
                            <div className="tx-status">
                                Transaction confirmed! Proceeding to next step...
                            </div>
                        )}
                        {errorMessage && <div className="error">{errorMessage}</div>}
                    </div>
                );
                
            case 'ready_to_unlock':
                return (
                    <div className="payment-flow">
                        <div className="steps">
                            <div className="step completed">✓ Approved</div>
                            <div className="step active">2. Unlock Content</div>
                        </div>
                        <button 
                            onClick={handleUnlock}
                            className="action-button highlight"
                            disabled={txStatus?.status === 'pending'}
                        >
                            {txStatus?.status === 'pending' ? 'Processing...' : 'Unlock for ' + price?.amount + ' USDC'}
                        </button>
                        {txStatus?.status === 'mined' && (
                            <div className="tx-status success">
                                Content unlocked! Loading...
                            </div>
                        )}
                        {errorMessage && <div className="error">{errorMessage}</div>}
                    </div>
                );
                
            case 'checking_access':
                return <LoadingSpinner message="Checking your access..." />;
                
            case 'error':
                return (
                    <div className="error-state">
                        <p>{errorMessage}</p>
                        <button 
                            onClick={() => window.location.reload()}
                            className="retry-button"
                        >
                            Try Again
                        </button>
                    </div>
                );
                
            default:
                return <LoadingSpinner message="Loading..." />;
        }
    };

    if (!post) {
        return (
            <div className="not-found">
                <h1>Article Not Found</h1>
                <p>The requested analysis could not be located.</p>
            </div>
        );
    }

    if (pageState === 'unlocked') {
        return (
            <div className="article-container">
                <article className="premium-article">
                    <header>
                        <h1>{post.frontmatter.title}</h1>
                        <div className="meta">
                            <span>Published: {post.frontmatter.date}</span>
                            <span>Author: {post.frontmatter.author}</span>
                        </div>
                    </header>
                    <div className="content">
                        <ReactMarkdown>{post.content}</ReactMarkdown>
                    </div>
                </article>
            </div>
        );
    }

    return (
        <div className="article-preview">
            <article>
                <header>
                    <h1>{post.frontmatter.title}</h1>
                    <div className="meta">
                        <span>Published: {post.frontmatter.date}</span>
                        <span>Author: {post.frontmatter.author}</span>
                    </div>
                </header>
                <div className="excerpt-container">
                    <div className="excerpt">
                        <ReactMarkdown>{post.excerpt}</ReactMarkdown>
                    </div>
                    <div className="excerpt-fade" />
                </div>
            </article>
            
            <div className="paywall-container">
                <div className="paywall-header">
                    <h2>Continue Reading</h2>
                    <p>Unlock full access to this premium analysis</p>
                </div>
                {renderPaywallActions()}
            </div>
        </div>
    );
}

export default BlogPostPaywall;