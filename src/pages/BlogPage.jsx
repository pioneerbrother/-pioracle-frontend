// src/pages/BlogPage.jsx

import React from 'react';
import { Link } from 'react-router-dom';
// --- THIS IS THE CRITICAL FIX ---
import { allPosts } from '../posts/index.js';
// --- END OF FIX ---
import './BlogPage.css';

function BlogPage() {
    return (
        <div className="page-container blog-page">
            <h1>PiOracle Insights</h1>
            <p className="page-subtitle">Analysis, guides, and updates from the team.</p>
            <div className="post-list">
                {/* The component now correctly uses the imported `allPosts` array */}
                {allPosts.map(post => (
                    <div key={post.slug} className="post-list-item">
                        <Link to={`/posts/${post.slug}`}>
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

export default BlogPage;