// src/pages/BlogPostDetail.jsx

import React, { useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import matter from 'gray-matter';
import './BlogPostPage.css'; // Use the same stylesheet

const postModules = import.meta.glob('../posts/*.md', { 
    as: 'raw',
    eager: true 
});

function BlogPostDetail() {
    const { slug } = useParams();

    const post = useMemo(() => {
        const postPath = Object.keys(postModules).find(path => path.endsWith(`${slug}.md`));
        if (!postPath) return null;

        const rawContent = postModules[postPath];
        if (typeof rawContent !== 'string') return null;

        const { data, content } = matter(rawContent);
        return { slug, frontmatter: data, content };
    }, [slug]);

    if (!post) {
        return (
            <div className="blog-post-page">
                <div className="blog-post-content-wrapper">
                    <h1 className="post-title">404 - Post Not Found</h1>
                    <p><Link to="/blog">← Return to Blog List</Link></p>
                </div>
            </div>
        );
    }

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