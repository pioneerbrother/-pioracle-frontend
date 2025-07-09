// src/pages/BlogPage.jsx

import React from 'react';
import { Link } from 'react-router-dom';
import matter from 'gray-matter';
import './BlogPage.css'; // Your existing stylesheet

const postModules = import.meta.glob('../posts/*.md', { 
    as: 'raw',
    eager: true 
});

const posts = Object.entries(postModules)
  .map(([path, rawContent]) => {
    // --- THIS IS THE FIX ---
    // If for any reason the content is not a string, skip this file.
    if (typeof rawContent !== 'string') {
        console.warn(`Skipping post from path: ${path} because its content is invalid.`);
        return null;
    }
    // --- END OF FIX ---

    try {
        const { data } = matter(rawContent);
        const slug = path.split('/').pop().replace('.md', '');

        // A post must have a slug and a title to be displayed.
        if (!slug || !data.title) {
            console.warn(`Skipping post from path: ${path} due to missing slug or title.`);
            return null;
        }

        return { slug, title: data.title, date: data.date || 'No Date' };
    } catch (e) {
        console.error(`Failed to parse frontmatter for post at path: ${path}`, e);
        return null;
    }
  })
  .filter(post => post !== null) // Remove any null entries from the final list
  .sort((a, b) => new Date(b.date) - new Date(a.date));


function BlogPage() {
    return (
        <div className="page-container blog-page">
            <h1>PiOracle Insights</h1>
            <p className="page-subtitle">Analysis, guides, and updates from the team.</p>
            <div className="post-list">
                {posts.length > 0 ? (
                    posts.map(post => (
                        <div key={post.slug} className="post-list-item">
                            <Link to={`/blog/${post.slug}`}>
                                <h2>{post.title}</h2>
                                <p className="post-meta">Published on {post.date}</p>
                                <span className="read-more">Read More →</span>
                            </Link>
                        </div>
                    ))
                ) : (
                    <p>No blog posts found.</p>
                )}
            </div>
        </div>
    );
}

export default BlogPage;