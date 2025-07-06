// src/pages/BlogPostDetail.jsx

import React, { useState, useEffect, useContext, useMemo } from 'react'; // <-- I HAVE CORRECTED THIS LINE
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

    // Effect to create contract instances when signer/chain changes
    useEffect(() => {
        if (signer && chainId) {
            const config = getConfigForChainId(chainId);
            if (config?.premiumContentContractAddress) {
                const pcContract = new ethers.Contract(config.premiumContentContractAddress, (PremiumContentABI.abi || PremiumContentABI), signer);
                setPremiumContentContract(pcContract);
            }
            if (config?.usdcTokenAddress) {
                const usdc = new ethers.Contract(config.usdcTokenAddress, (IERC20_ABI.abi || IERC20_ABI), signer);
                setUsdcContract(usdc);
            }
        } else {
            setPremiumContentContract(null);
            setUsdcContract(null);
        }
    }, [signer, chainId]);

    const contentId = useMemo(() => slug ? ethers.utils.id(slug) : null, [slug]);

    // Main effect to check access
    useEffect(() => {
        if (!isInitialized || !slug) return;
        if (!postData.frontmatter) { // Only run if frontmatter is loaded
             const loadFrontmatter = async () => {
                 try {
                     const rawContentModule = await import(`../posts/${slug}.md?raw`);
                     const { data: frontmatter, content: localContent } = matter(rawContentModule.default);
                     setPostData({ content: localContent, frontmatter });
                 } catch (e) {
                     setPageState('error');
                     setErrorMessage("Post not found.");
                 }
             };
             loadFrontmatter();
             return;
        }

        const checkAccess = async () => {
            if (postData.frontmatter.premium === true) {
                if (!walletAddress) { setPageState('prompt_connect'); return; }
                if (!premiumContentContract || !usdcContract) { setPageState('unsupported_network'); return; }
                
                setPageState('checking');
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
                    setErrorMessage("Failed to check access.");
                }
            } else {
                setPageState('unlocked');
            }
        };

        checkAccess();
       
    }, [isInitialized, walletAddress, premiumContentContract, usdcContract, postData.frontmatter]);

    const secureFetchContent = async () => { /* ... same as before ... */ };
    const handleApprove = async () => { /* ... same as before ... */ };
    const handleUnlock = async () => { /* ... same as before ... */ };

    // --- RENDER LOGIC (remains the same) ---
    // ...
}

export default BlogPostDetail;