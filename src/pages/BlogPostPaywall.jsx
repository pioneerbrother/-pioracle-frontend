import React, { useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import matter from 'gray-matter';

// Import our new custom hook and other components
import { usePaywall } from '../hooks/usePaywall'; 
import LoadingSpinner from '../components/common/LoadingSpinner';
import ConnectWalletButton from '../components/common/ConnectWalletButton';
import './BlogPage.css';

const postModules = import.meta.glob('../posts/*.md', { as: 'raw', eager: true });

function BlogPostPaywall() {
    console.log("--- BLOG POST PAYWALL - REFACTORED HOOK VERSION ---");
    const { slug } = useParams();

    const post = useMemo(() => {
        const postPath = Object.keys(postModules).find(path => path.endsWith(`${slug}.md`));
        if (!postPath) return null;
        const rawContent = postModules[postPath];
        const { data, content } = matter(rawContent);
        const excerpt = data.excerpt || content.substring(0, 300) + '...';
        return { slug, frontmatter: data, content, excerpt };
    }, [slug]);

    if (!post) {
        return <div className="page-container"><h1>404 - Post Not Found</h1></div>;
    }

    return <PaywallView post={post} />;
}

function PaywallView({ post }) {
    // All the complex logic is now neatly contained in this one line.
    const { pageState, errorMessage, price, handleApprove, handleUnlock } = usePaywall(post);

    const renderPaywallActions = () => {
        switch (pageState) {
            case 'prompt_connect':
                return <div><p>This is a premium article. Please connect your wallet to unlock.</p><ConnectWalletButton /></div>;
            case 'unsupported_network':
                return <div className="error-message">Please switch your wallet to BNB Mainnet to continue.</div>;
            case 'needs_approval':
                return (
                    <div>
                        <p>Unlock this article for **{price?.amount} {price?.symbol}**. First, you must approve spending.</p>
                        <button onClick={handleApprove} className="action-button">1. Approve {price?.symbol}</button>
                        {errorMessage && <p className="error-message">{errorMessage}</p>}
                    </div>
                );
            case 'ready_to_unlock':
                return (
                    <div>
                        <p>You have approved spending. You can now unlock the content for **{price?.amount} {price?.symbol}**.</p>
                        <button onClick={handleUnlock} className="action-button highlight">2. Unlock Content</button>
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
    
    // The "locked" view now shows the excerpt, not the full content.
    return (
        <div className="blog-post-page">
            <div className="blog-post-content-wrapper">
                <h1 className="post-title">{post.frontmatter.title}</h1>
                <p className="post-meta">Published on {post.frontmatter.date} by {post.frontmatter.author}</p>
                <div className="post-body-content"><ReactMarkdown>{post.excerpt}</ReactMarkdown></div>
                <hr style={{margin: "3rem 0"}} />
                <div className="paywall"><h3>Unlock Full Access</h3>{renderPaywallActions()}</div>
            </div>
        </div>
    );
}

export default BlogPostPaywall;