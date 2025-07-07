// src/pages/BlogPage.jsx

import React from 'react';
import { Link } from 'react-router-dom';
import matter from 'gray-matter';
import './BlogPage.css';

const postModules = import.meta.glob('../posts/*.md', { as: 'raw', eager: true });

const posts = Object.entries(postModules).map(([path, rawContent]) => {
    const { data } = matter(rawContent);
    const slug = path.split('/').pop().replace('.md', '');
    if (!data.title) return null;
    return { slug, title: data.title, date: data.date || 'No Date' };
}).filter(Boolean).sort((a, b) => new Date(b.date) - new Date(a.date));

function BlogPage() {
    return (
        <div className="page-container blog-page">
            <h1>PiOracle Insights</h1>
            <p className="page-subtitle">Analysis, guides, and updates from the team.</p>
            <div className="post-list">
                {posts.map(post => (
                    <div key={post.slug} className="post-list-item">
                        <Link to={`/blog/${post.slug}`}>
                            <h2>{post.title}</h2>
                            <p className="post-meta">Published on {post.date}</p>
                            <span className="read-more">Read More →</span>
                        </Link>
                    </div>
                ))}
            </div>
        </div>
    );
}

export default BlogPage;