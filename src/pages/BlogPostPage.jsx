// src/pages/BlogPostPage.jsx
import React, { useState, useEffect, Suspense } from 'react';
import { useParams, Link } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import LoadingSpinner from '../components/common/LoadingSpinner';
import './BlogPostPage.css'; // We'll create this for styling

// Use glob import to get a map of all possible posts
const postModules = import.meta.glob('../posts/*.md');

function BlogPostPage() {
    const { slug } = useParams();
    const [post, setPost] = useState({ frontmatter: null, content: null });
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        // Find the correct module path based on the slug
        const modulePath = `../posts/${slug}.md`;

        if (postModules[modulePath]) {
            // Dynamically import the module
            postModules[modulePath]().then(mod => {
                setPost({
                    frontmatter: mod.frontmatter,
                    content: mod.default, // The default export is the markdown content string
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

    if (isLoading) {
        return <LoadingSpinner message="Loading post..." />;
    }

    if (error) {
        return (
            <div className="page-container blog-post-page">
                <p>{error}</p>
                <Link to="/blog">← Back to all posts</Link>
            </div>
        );
    }
    
    return (
        <div className="page-container blog-post-page">
            <Link to="/blog" className="back-to-blog-link">← All Posts</Link>
            <article className="blog-content">
                <h1>{post.frontmatter.title}</h1>
                <p className="post-meta">
                    By {post.frontmatter.author} on {new Date(post.frontmatter.date).toLocaleDateString()}
                </p>
                {/* Here we use ReactMarkdown to render the content */}
                <ReactMarkdown>{post.content}</ReactMarkdown>
            </article>
        </div>
    );
}

export default BlogPostPage;