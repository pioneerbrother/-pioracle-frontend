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

    // Effect to create contract instances
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

    // --- FINAL, SIMPLIFIED useEffect LOGIC ---
    useEffect(() => {
        if (!slug) return;
        
        // This function will ALWAYS run once the slug is available.
        const loadPost = async () => {
            setPageState('loading');
            try {
                const rawContentModule = await import(`../posts/${slug}.md?raw`);
                const { data: frontmatter, content: localContent } = matter(rawContentModule.default);
                
                // Immediately set the data we have.
                setPostData({ content: localContent, frontmatter });
                
                // Now, decide what to do based on the frontmatter
                if (frontmatter.premium !== true) {
                    // It's a free post, we are done.
                    setPageState('unlocked');
                } else {
                    // It's a premium post, now we need a wallet.
                    if (!walletAddress) {
                        setPageState('prompt_connect'); // Show paywall, ask to connect
                    } else {
                        // Wallet is connected, proceed to check access
                        setPageState('checking_access'); // Go to a new state before the async call
                    }
                }
            } catch (e) {
                setPageState('error');
                setErrorMessage("Post not found.");
            }
        };

        loadPost();
    }, [slug, isInitialized]); // Depend only on slug and initialization

    // A SEPARATE effect to handle the on-chain check AFTER the wallet is connected
    // and we've determined it's a premium post.
    useEffect(() => {
        if (pageState === 'checking_access' && walletAddress && premiumContentContract && usdcContract) {
            const checkAccess = async () => {
                 try {
                    const hasPaid = await premiumContentContract.hasAccess(contentId, walletAddress);
                    if (hasPaid) {
                        await secureFetchContent();
                    } else {
                        const fee = await premiumContentContract.contentPrice();
                        const allowance = await usdcContract.allowance(walletAddress, premiumContentContract.address);
                        if (allowance.lt(fee)) {
                            setPageState('needs_approval');
                        } else {
                            setPageState('ready_to_unlock');
                        }
                    }
                } catch (e) {
                    setPageState('error');
                    setErrorMessage("Failed to check on-chain access.");
                }
            };
            checkAccess();
        }
    }, [pageState, walletAddress, premiumContentContract, usdcContract]);

    const secureFetchContent = async () => { /* ... same as before ... */ };
    const handleApprove = async () => { /* ... same as before ... */ };
    const handleUnlock = async () => { /* ... same as before ... */ };

    // --- RENDER LOGIC (remains the same) ---
    // ...
}

export default BlogPostDetail;