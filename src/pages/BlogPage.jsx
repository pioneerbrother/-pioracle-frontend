// src/pages/BlogPage.jsx
import React from 'react';
import { Link } from 'react-router-dom';
import './BlogPage.css'; // We'll create this for styling

// --- This is Vite's special 'glob' import ---
// It finds all .md files in the /posts/ directory and imports their metadata.
const posts = import.meta.glob('../posts/*.md', {
    eager: true,
    import: 'frontmatter' // Only import the frontmatter metadata, not the full content
});

// Convert the imported object into a sorted array of posts
const postList = Object.values(posts)
    .sort((a, b) => new Date(b.date) - new Date(a.date)); // Sort by date, newest first

function BlogPage() {
    return (
        <div className="page-container blog-page">
            <h1 className="blog-title">PiOracle Insights</h1>
            <p className="blog-subtitle">Analysis, guides, and updates from the team.</p>
            
            <div className="post-list">
                {postList.map((post, index) => (
                    <div className="post-preview-card" key={index}>
                        <h2 className="post-preview-title">
                            {/* The link uses the 'slug' from the frontmatter */}
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