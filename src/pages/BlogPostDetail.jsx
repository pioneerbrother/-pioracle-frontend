// src/pages/BlogPostDetail.jsx

import React, { useState, useEffect, useContext, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { ethers } from 'ethers';
import ReactMarkdown from 'react-markdown';

import { WalletContext } from './WalletProvider';
import LoadingSpinner from '../components/common/LoadingSpinner';
import ConnectWalletButton from '../components/common/ConnectWalletButton';

// ABIs
import PremiumContentABI from '../config/abis/PremiumContent.json';
import IERC20_ABI from '../config/abis/IERC20.json';

// --- THIS IS THE FINAL FIX ---
// I forgot to include this import in the previous version. My apologies.
import { getConfigForChainId } from '../config/contractConfig';
// --- END OF FIX ---


function BlogPostDetail() {
    const { slug } = useParams();
    const { walletAddress, chainId, signer, isInitialized } = useContext(WalletContext);
    
    const [postContent, setPostContent] = useState('');
    const [pageState, setPageState] = useState('initializing');
    const [errorMessage, setErrorMessage] = useState('');

    const premiumContentContract = useMemo(() => {
        if (!signer) return null;
        const config = getConfigForChainId(chainId); // This line needs the import
        if (!config?.premiumContentContractAddress) return null;
        return new ethers.Contract(config.premiumContentContractAddress, (PremiumContentABI.abi || PremiumContentABI), signer);
    }, [signer, chainId]);

    const usdcContract = useMemo(() => {
        if (!signer) return null;
        const config = getConfigForChainId(chainId); // This line also needs the import
        if (!config?.usdcTokenAddress) return null;
        return new ethers.Contract(config.usdcTokenAddress, (IERC20_ABI.abi || IERC20_ABI), signer);
    }, [signer, chainId]);

    const contentId = useMemo(() => slug ? ethers.id(slug) : null, [slug]);

    const secureFetchContent = async () => {
        if (!signer || !walletAddress || !slug || !chainId) return;
        setPageState('fetching_secure');
        try {
            const message = `I am proving ownership of my address to read article: ${slug}`;
            const signature = await signer.signMessage(message);

            const response = await fetch('/.netlify/functions/get-premium-content', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ slug, walletAddress, signature, chainId })
            });

            const data = await response.json();
            if (!response.ok) { throw new Error(data.error || 'Failed to fetch content.'); }

            setPostContent(data.content);
            setPageState('unlocked');
        } catch (error) {
            setPageState('error');
            setErrorMessage(error.message);
        }
    };
    
    useEffect(() => {
        if (!isInitialized || !slug) return;
        if (!walletAddress) { setPageState('needs_payment'); return; }
        
        const checkAccess = async () => {
            setPageState('checking');
            if (!premiumContentContract) { setPageState('unsupported_network'); return; }
            try {
                const hasPaid = await premiumContentContract.hasAccess(contentId, walletAddress);
                if (hasPaid) { await secureFetchContent(); } 
                else { setPageState('needs_payment'); }
            } catch (e) {
                setPageState('error');
                setErrorMessage("Failed to check on-chain access. Please refresh.");
            }
        };
        checkAccess();
    }, [isInitialized, walletAddress, premiumContentContract]);


    const handleApprove = async () => { /* ... (Your approve logic) ... */ };
    const handleUnlock = async () => { /* ... (Your unlock logic) ... */ };


    // --- Your complete rendering logic goes here ---
    if (pageState === 'unlocked') {
        return (
            <div className="page-container blog-post">
                <ReactMarkdown className="post-content">{postContent}</ReactMarkdown>
            </div>
        );
    }
    
    // ... all other render states ...
}

export default BlogPostDetail;