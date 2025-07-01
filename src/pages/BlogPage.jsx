// src/pages/BlogPage.jsx

import React from 'react';
import { Link } from 'react-router-dom';
import matter from 'gray-matter';
import './BlogPage.css';

// --- VITE GLOB IMPORT ---
const postModules = import.meta.glob('../posts/*.md', {
    as: 'raw',
    eager: true
});

const posts = Object.entries(postModules).map(([path, rawContent]) => {
    try {
        const { data } = matter(rawContent);
        // Generate slug from filename, which is the most reliable method
        const slug = path.split('/').pop().replace('.md', '');

        // Basic validation: A post must have a slug and a title to be displayed
        if (!slug || !data.title) {
            console.warn(`Skipping post from path: ${path} due to missing slug or title.`);
            return null;
        }

        return {
            slug: slug, // Use the reliable slug from the filename
            title: data.title,
            date: data.date || 'No Date',
        };
    } catch (e) {
        console.error(`Failed to parse frontmatter for post at path: ${path}`, e);
        return null;
    }
}).filter(post => post !== null) // Filter out any invalid or skipped posts
  .sort((a, b) => new Date(b.date) - new Date(a.date));


function BlogPage() {
    return (
        <div className="page-container blog-page">
            <h1>PiOracle Insights</h1>
            <p className="page-subtitle">Analysis, guides, and updates from the team.</p>
            <div className="post-list">
                {posts.length > 0 ? (
                    posts.map(post => (
                        // --- CRITICAL FIX IS HERE ---
                        // We double-check that post.slug exists before creating the Link.
                        post.slug ? (
                            <div key={post.slug} className="post-list-item">
                                <Link to={`/blog/${post.slug}`}>
                                    <h2>{post.title}</h2>
                                    <p className="post-meta">Published on {post.date}</p>
                                    <span className="read-more">Read More →</span>
                                </Link>
                            </div>
                        ) : null // If for some reason a bad post gets through, don't render it.
                    ))
                ) : (
                    <p>No posts found.</p>
                )}
            </div>
        </div>
    );
}

export default BlogPage;
