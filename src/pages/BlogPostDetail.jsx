// src/pages/BlogPostDetail.jsx

import React, { useState, useEffect, useContext, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { ethers } from 'ethers';
import ReactMarkdown from 'react-markdown';

import { WalletContext } from './WalletProvider';
import LoadingSpinner from '../components/common/LoadingSpinner';
import ConnectWalletButton from '../components/common/ConnectWalletButton';

function BlogPostDetail() {
    const { slug } = useParams();
    const { walletAddress, chainId, signer, premiumContentContract, isInitialized } = useContext(WalletContext);
    
    const [postContent, setPostContent] = useState('');
    const [pageState, setPageState] = useState('initializing');
    const [errorMessage, setErrorMessage] = useState('');

    const contentId = useMemo(() => slug ? ethers.utils.id(slug) : null, [slug]);

    const secureFetchContent = async () => {
        if (!signer || !walletAddress || !slug || !chainId) return;
        setPageState('fetching_secure');
        try {
            // --- THIS IS THE CRITICAL FIX ---
            // This message now EXACTLY matches the one expected by your backend.
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
            console.error("Secure fetch failed:", error);
            setPageState('error');
            setErrorMessage(error.message);
        }
    };
    
    useEffect(() => {
        if (!isInitialized || !contentId || !slug) return;
        if (!walletAddress) { setPageState('needs_payment'); return; }
        if (!premiumContentContract) { setPageState('unsupported_network'); return; }

        const checkAccess = async () => {
            setPageState('checking');
            try {
                const hasPaid = await premiumContentContract.hasAccess(contentId, walletAddress);
                if (hasPaid) { await secureFetchContent(); } 
                else { setPageState('needs_payment'); }
            } catch (e) {
                setPageState('error');
                setErrorMessage("Failed to check access. Please refresh.");
            }
        };
        checkAccess();
    }, [isInitialized, walletAddress, contentId, premiumContentContract]);

    // ... (Your handleApprove and handleUnlock functions remain the same)
    // ... (Your rendering logic remains the same)
}

export default BlogPostDetail;