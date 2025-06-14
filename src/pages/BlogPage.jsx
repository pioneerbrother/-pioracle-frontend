// src/pages/BlogPage.jsx
import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import matter from 'gray-matter'; // <-- Import the parser
import './BlogPage.css';

// This special import syntax tells Vite to import all .md files as raw text strings
const postModules = import.meta.glob('../posts/*.md', { as: 'raw', eager: true });

function BlogPage() {
    const postList = useMemo(() => {
        return Object.entries(postModules).map(([path, rawContent]) => {
            // Use gray-matter to parse the raw text
            const { data } = matter(rawContent);
            return {
                ...data, // This is the frontmatter (title, date, description, slug)
            };
        }).sort((a, b) => new Date(b.date) - new Date(a.date));
    }, []);

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