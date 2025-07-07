// src/hooks/usePaywall.js

import { useState, useEffect, useContext, useMemo, useCallback } from 'react';
import { ethers } from 'ethers';
import { useWeb3ModalProvider } from '@web3modal/ethers5/react';

import { WalletContext } from '../pages/WalletProvider';
import { getTargetChainIdHex, getConfigForChainId } from '../config/contractConfig';
import PremiumContentABI from '../config/abis/PremiumContent.json';
import IERC20_ABI from '../config/abis/IERC20.json';

export function usePaywall(post) {
    const { walletAddress, chainId, isConnected, isInitialized } = useContext(WalletContext);
    const { walletProvider } = useWeb3ModalProvider();

    const targetChainId = useMemo(() => parseInt(getTargetChainIdHex(), 16), []);
    
    const [pageState, setPageState] = useState('initializing');
    const [errorMessage, setErrorMessage] = useState('');
    const [price, setPrice] = useState(null);

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
                    setPrice({ amount: ethers.utils.formatUnits(feeInWei, decimals), symbol: 'USDC' });
                    const allowance = await usdcContract.allowance(walletAddress, premiumContentContract.address);
                    setPageState(allowance.lt(feeInWei) ? 'needs_approval' : 'ready_to_unlock');
                }
            } catch (e) {
                console.error("Error in usePaywall checkAccess:", e);
                setPageState('error');
                setErrorMessage('Could not verify access. Please ensure your wallet is on BNB Mainnet and refresh.');
            }
        };
        checkAccess();
    }, [isInitialized, post, isConnected, walletAddress, chainId, targetChainId, premiumContentContract, usdcContract, contentId]);
    
    const handleApprove = useCallback(async () => {
        if (!usdcContract || !premiumContentContract) return;
        setPageState('checking');
        setErrorMessage('');
        try {
            const fee = await premiumContentContract.contentPrice();
            const tx = await usdcContract.approve(premiumContentContract.address, fee);
            await tx.wait();
            setPageState('ready_to_unlock');
        } catch(e) {
            setErrorMessage(`Approval failed: ${e.reason || 'Transaction rejected.'}`);
            setPageState('needs_approval');
        }
    }, [usdcContract, premiumContentContract]);
    
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

    return { pageState, errorMessage, price, handleApprove, handleUnlock };
}