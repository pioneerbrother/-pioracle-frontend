// src/pages/BlogPage.jsx

import React from 'react';
import { Link } from 'react-router-dom';
import matter from 'gray-matter';
import { getPostBySlug } from '../posts/index.js'; // Import our new helper
import './BlogPage.css';

// To get all posts, we need to iterate over the slugs we defined in the manifest.
// This is a placeholder; you would ideally export an `allPosts` array from the manifest.
const posts = Object.keys(postContent).map(slug => {
    const rawContent = getPostBySlug(slug);
    const { data } = matter(rawContent);
    return { slug, frontmatter: data };
}).sort((a, b) => new Date(b.frontmatter.date) - new Date(a.frontmatter.date));


function BlogPage() {
    return (
        <div className="page-container blog-page">
            <h1>PiOracle Insights</h1>
            <div className="post-list">
                {posts.map(post => (
                    <div key={post.slug} className="post-list-item">
                        <Link to={`/posts/${post.slug}`}>
                            <h2>{post.frontmatter.title}</h2>
                            <p>{post.frontmatter.date}</p>
                        </Link>
                    </div>
                ))}
            </div>
        </div>
    );
}

export default BlogPage;