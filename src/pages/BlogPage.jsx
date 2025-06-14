// src/pages/BlogPage.jsx
import React from 'react';
import { Link } from 'react-router-dom';
import './BlogPage.css';

// This glob import now uses the vite-plugin-markdown loader automatically
const posts = import.meta.glob('../posts/*.md', { eager: true });

// --- ADJUSTMENT HERE ---
// We now map the object to get the frontmatter from each module
const postList = Object.values(posts)
    .map(postModule => postModule.frontmatter) // <-- Get frontmatter from the module
    .sort((a, b) => new Date(b.date) - new Date(a.date));

function BlogPage() {
    return (
        <div className="page-container blog-page">
            <h1 className="blog-title">PiOracle Insights</h1>
            <p className="blog-subtitle">Analysis, guides, and updates from the team.</p>
            <div className="post-list">
                {postList.map((post, index) => (
                    <div className="post-preview-card" key={index}>
                        <h2 className="post-preview-title">
                            <Link to={`/blog/${post.slug}`}>{post.title}</Link>
                        </h2>
                        <p className="post-preview-meta">
                            By {post.author} on {new Date(post.date).toLocaleDateString()}
                        </p>
                        <p className="post-preview-description">{post.description}</p>
                        <Link to={`/blog/${post.slug}`} className="read-more-link">
                            Read More →
                        </Link>
                    </div>
                ))}
            </div>
        </div>
    );
}

export default BlogPage;