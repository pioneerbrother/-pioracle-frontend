// src/pages/BlogPage.jsx

import React from 'react';
import { Link } from 'react-router-dom';
import matter from 'gray-matter';
import './BlogPage.css';

const postModules = import.meta.glob('../posts/*.md', { query: '?raw', eager: true });

const posts = Object.entries(postModules).map(([path, rawContent]) => {
    const { data } = matter(rawContent);
    const slug = path.split('/').pop().replace('.md', '');
    return { slug, frontmatter: data };
}).filter(post => post.frontmatter.title)
  .sort((a, b) => new Date(b.frontmatter.date) - new Date(a.frontmatter.date));

function BlogPage() {
    return (
        <div className="page-container blog-page">
            <h1>PiOracle Insights</h1>
            <p className="page-subtitle">Analysis, guides, and updates from the team.</p>
            <div className="post-list">
                {posts.map(post => (
                    <div key={post.slug} className="post-list-item">
                        {/* --- THIS LINK IS NOW UNAMBIGUOUS --- */}
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