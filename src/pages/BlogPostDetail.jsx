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

    // This is our new function to securely fetch the article from our backend.
    const secureFetchContent = async () => {
        if (!signer || !walletAddress || !slug || !chainId) return;
        setPageState('fetching_secure'); // New loading state
        try {
            // 1. Create the EXACT message string our backend expects.
            const message = `I am verifying my identity to read '${slug}' on pioracle.online`;
            const signature = await signer.signMessage(message);

            // 2. Call our new backend function.
            const response = await fetch('/.netlify/functions/get-premium-content', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ slug, walletAddress, signature, chainId })
            });

            const data = await response.json();
            if (!response.ok) { throw new Error(data.error || 'Failed to fetch content.'); }

            // 3. On success, set the content and unlock the page.
            setPostContent(data.content);
            setPageState('unlocked');

        } catch (error) {
            console.error("Secure fetch failed:", error);
            setPageState('error');
            setErrorMessage(error.message);
        }
    };
    
    // Main effect to check access when the component loads
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

    // Payment handlers are now simpler: they just trigger a re-check or a secure fetch.
    const handleApprove = async () => { /* ... same handleApprove logic ... */ };
    const handleUnlock = async () => {
        if (!premiumContentContract || !contentId) return;
        setPageState('checking');
        try {
            const tx = await premiumContentContract.unlockContent(contentId);
            await tx.wait(1);
            await secureFetchContent(); // On success, fetch the content securely.
        } catch (err) {
            setErrorMessage(err.reason || "Unlock failed.");
            setPageState('needs_payment');
        }
    };
    
    // --- RENDER LOGIC ---
    // (This part can be copied from your previous working version)
    // ...
}

export default BlogPostDetail;