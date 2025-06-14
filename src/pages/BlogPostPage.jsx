// src/pages/BlogPostPage.jsx
import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import matter from 'gray-matter'; // <-- Import the parser
import LoadingSpinner from '../components/common/LoadingSpinner';
import './BlogPostPage.css';

const postModules = import.meta.glob('../posts/*.md', { as: 'raw' });

function BlogPostPage() {
    const { slug } = useParams();
    const [post, setPost] = useState({ frontmatter: null, content: null });
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const modulePath = `../posts/${slug}.md`;

        if (postModules[modulePath]) {
            postModules[modulePath]().then(rawContent => {
                // Use gray-matter to parse the raw text string
                const { data, content } = matter(rawContent);
                setPost({
                    frontmatter: data,
                    content: content,
                });
                setIsLoading(false);
            }).catch(err => {
                setError("Failed to load post content.");
                setIsLoading(false);
            });
        } else {
            setError("Post not found.");
            setIsLoading(false);
        }
    }, [slug]);

    if (isLoading) return <LoadingSpinner message="Loading post..." />;
    if (error) return (
        <div className="page-container blog-post-page">
            <p>{error}</p>
            <Link to="/blog">← Back to all posts</Link>
        </div>
    );
    
    return (
        <div className="page-container blog-post-page">
            <Link to="/blog" className="back-to-blog-link">← All Posts</Link>
            <article className="blog-content">
                <h1>{post.frontmatter.title}</h1>
                <p className="post-meta">
                    By {post.frontmatter.author} on {new Date(post.frontmatter.date).toLocaleDateString()}
                </p>
                <ReactMarkdown>{post.content}</ReactMarkdown>
            </article>
        </div>
    );
}

export default BlogPostPage;