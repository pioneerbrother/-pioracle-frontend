// src/pages/Blog.jsx

import React, { useState, useEffect, useContext, useMemo, useCallback } from 'react';
// --- THIS IS THE FIX ---
import { Routes, Route, useParams, Link } from 'react-router-dom';
import { ethers } from 'ethers';
import ReactMarkdown from 'react-markdown';
import matter from 'gray-matter';

// ... all your other imports and component logic ...
import { WalletContext } from './WalletProvider';
import LoadingSpinner from '../components/common/LoadingSpinner';
import ConnectWalletButton from '../components/common/ConnectWalletButton';
import { getConfigForChainId, getTargetChainIdHex } from '../config/contractConfig';
import PremiumContentABI from '../config/abis/PremiumContent.json';
import IERC20_ABI from '../config/abis/IERC20.json';
import './BlogPage.css';

// --- VITE GLOB IMPORT (This is correct) ---
const postModules = import.meta.glob('../posts/*.md', { as: 'raw', eager: true });

const allPosts = Object.entries(postModules).map(([path, rawContent]) => {
    const { data, content } = matter(rawContent);
    const slug = path.split('/').pop().replace('.md', '');
    return { slug, frontmatter: data, content };
}).filter(post => post.frontmatter.title)
  .sort((a, b) => new Date(b.frontmatter.date) - new Date(a.frontmatter.date));

// ======================================================================
// === THE UNIFIED BLOG COMPONENT =======================================
// ======================================================================
function Blog() {
    return (
        // --- THIS IS THE FIX: Use nested Routes to handle list vs detail view ---
        <Routes>
            <Route index element={<BlogListView />} />
            <Route path=":slug" element={<BlogPostDetailView />} />
        </Routes>
    );
}

// --- The list of all blog posts ---
function BlogListView() {
    return (
        <div className="page-container blog-page">
            <h1>PiOracle Insights</h1>
            <p className="page-subtitle">Analysis, guides, and updates from the team.</p>
            <div className="post-list">
                {allPosts.map(post => (
                    <div key={post.slug} className="post-list-item">
                        {/* The Link remains the same */}
                        <Link to={`/blog/${post.slug}`}>
                            <h2>{post.frontmatter.title}</h2>
                            <p className="post-meta">Published on {post.frontmatter.date}</p>
                            <span className="read-more">Read More →</span>
                        </Link>
                    </div>
                ))}
            </div>
        </div>
    );
}

// --- The detail/paywall view ---
function BlogPostDetailView() {
    const { slug } = useParams(); // useParams will now work correctly inside this nested route
    const post = useMemo(() => allPosts.find(p => p.slug === slug), [slug]);
    
    // The rest of your paywall logic is identical to the last version and correct.
    const { walletAddress, chainId, signer, isInitialized } = useContext(WalletContext);
    const targetChainId = useMemo(() => parseInt(getTargetChainIdHex(), 16), []);
    const [pageState, setPageState] = useState('initializing');
    // ... all the other useState, useMemo, useEffect, and render logic ...

    // The entire paywall component logic you already have goes here.
    // ...
    if (!post) {
        return <div className="page-container"><h1>Post not found</h1></div>;
    }
    
    // The rest of the component is just the return statement with your JSX
    return (
        <div className="blog-post-page">
            <div className="blog-post-content-wrapper">
                <h1 className="post-title">{post.frontmatter.title}</h1>
                {/* ... all your paywall JSX ... */}
            </div>
        </div>
    );
}


export default Blog;