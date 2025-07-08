// src/pages/BlogPostDetail.jsx

import React, { useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import matter from 'gray-matter';
import './BlogPage.css';

// Using the corrected glob import syntax
const postModules = import.meta.glob('../posts/*.md', { query: '?raw', eager: true });

function BlogPostDetail() {
    const { slug } = useParams();

    // Find the correct post based on the slug from the URL.
    const post = useMemo(() => {
        const postPath = Object.keys(postModules).find(path => path.endsWith(`${slug}.md`));
        if (!postPath) return null;
        const rawContent = postModules[postPath];
        const { data, content } = matter(rawContent);
        return { slug, frontmatter: data, content };
    }, [slug]);

    if (!post) {
        return (
            <div className="page-container">
                <h1>404 - Post Not Found</h1>
                <p>The post you are looking for does not exist. <Link to="/blog">Return to blog</Link>.</p>
            </div>
        );
    }

    // Render the full post content. There is no paywall.
    return (
        <div className="blog-post-page">
            <div className="blog-post-content-wrapper">
                <h1 className="post-title">{post.frontmatter.title}</h1>
                <p className="post-meta">Published on {post.frontmatter.date} by {post.frontmatter.author}</p>
                <div className="post-body-content">
                    <ReactMarkdown>{post.content}</ReactMarkdown>
                </div>
            </div>
        </div>
    );
}

export default BlogPostDetail;