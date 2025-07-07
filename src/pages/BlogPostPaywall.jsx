import React, { useMemo } from 'react';
import { useParams } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import matter from 'gray-matter';

import { usePaywall } from '../hooks/usePaywall'; 
import LoadingSpinner from '../components/common/LoadingSpinner';
import ConnectWalletButton from '../components/common/ConnectWalletButton';
import './BlogPage.css'; // Make sure to add the new CSS here

function BlogPostPaywall() {
    const { slug } = useParams();

    const post = useMemo(() => {
        const postPath = Object.keys(postModules).find(path => path.endsWith(`${slug}.md`));
        if (!postPath) return null;
        const rawContent = postModules[postPath];
        const { data, content } = matter(rawContent);
        const excerpt = data.excerpt || content.substring(0, 400) + '...';
        return { slug, frontmatter: data, content, excerpt };
    }, [slug]);

    if (!post) {
        return <div className="page-container"><h1>404 - Post Not Found</h1></div>;
    }

    return <PaywallView post={post} />;
}

function PaywallView({ post }) {
    const { pageState, errorMessage, price, txStatus, handleApprove, handleUnlock, handleSwitchNetwork } = usePaywall(post);

    const renderPaywallActions = () => {
        if (txStatus?.status === 'pending' || txStatus?.status === 'mined') {
            return <LoadingSpinner message={txStatus.type === 'approval' ? "Processing Approval..." : "Unlocking Content..."} txHash={txStatus.txHash} />;
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
                        {errorMessage && <p className="error-message">{errorMessage}</p>}
                    </div>
                );
            case 'needs_approval':
                return (
                    <div className="payment-flow">
                        <div className="steps"><div className="step active">1. Approve</div><div className="step">2. Unlock</div></div>
                        <p>Unlock this article for **{price?.amount} {price?.symbol}**. First, you must approve spending.</p>
                        <button onClick={handleApprove} className="action-button">Approve {price?.symbol}</button>
                        {errorMessage && <p className="error-message">{errorMessage}</p>}
                    </div>
                );
            case 'ready_to_unlock':
                return (
                    <div className="payment-flow">
                        <div className="steps"><div className="step complete">✓</div><div className="step active">2. Unlock</div></div>
                        <p>Approval successful! You can now unlock the content for **{price?.amount} {price?.symbol}**.</p>
                        <button onClick={handleUnlock} className="action-button highlight">Unlock Content</button>
                        {errorMessage && <p className="error-message">{errorMessage}</p>}
                    </div>
                );
            case 'checking': case 'checking_access':
                return <LoadingSpinner message="Verifying on-chain..." />;
            case 'error':
                return <p className="error-message">{errorMessage}</p>;
            default: // 'initializing'
                return <LoadingSpinner message="Loading..." />;
        }
    };

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