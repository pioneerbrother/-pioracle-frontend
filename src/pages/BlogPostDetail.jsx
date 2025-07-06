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

    // Effect 1: Create contract instances ONLY when the signer is ready.
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

    // Effect 2: Load the post's frontmatter. This is the first step.
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
                    // It's premium. Now, wait for the wallet.
                    setPageState(walletAddress ? 'checking_access' : 'prompt_connect');
                }
            } catch (e) {
                if (isMounted) setPageState('error');
            }
        };
        loadPost();
        return () => { isMounted = false; };
    }, [slug, walletAddress, isInitialized]); // Re-run if wallet connects

    // Effect 3: The on-chain check. This ONLY runs when the state is correct.
    useEffect(() => {
        if (pageState !== 'checking_access' || !premiumContentContract || !usdcContract) return;

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
                    setPageState(allowance.lt(fee) ? 'needs_approval' : 'ready_to_unlock');
                }
            } catch (e) {
                if (isMounted) setPageState('error');
            }
        };
        checkAccess();
        return () => { isMounted = false; };
    }, [pageState, premiumContentContract, usdcContract]); // Depends on contracts being ready

    const secureFetchContent = async () => { /* ... (This logic is correct and unchanged) ... */ };
    const handleApprove = async () => { /* ... (This logic is correct and unchanged) ... */ };
    const handleUnlock = async () => { /* ... (This logic is correct and unchanged) ... */ };

    // --- The complete render logic from the best version ---
    // ... (This logic is correct and can be pasted from our best previous version) ...
}

export default BlogPostDetail;
