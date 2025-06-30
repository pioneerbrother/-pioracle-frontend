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

console.log("BlogPage: Found post modules:", postModules); // Log all found modules

const posts = Object.entries(postModules).map(([path, rawContent]) => {
    try {
        const { data } = matter(rawContent);
        const slug = path.split('/').pop().replace('.md', '');

        // --- ADD DETAILED LOGGING ---
        console.log(`BlogPage: Processing path: ${path}`);
        console.log(`BlogPage: Extracted slug: ${slug}`);
        console.log(`BlogPage: Parsed frontmatter data:`, data);
        
        // Check if title exists after parsing
        if (!data.title) {
            console.warn(`BlogPage: Post with slug '${slug}' is missing a 'title' in its frontmatter. Skipping.`);
            return null;
        }

        return {
            slug,
            title: data.title,
            date: data.date || 'No Date',
            // Add a snippet/excerpt if you want
            excerpt: rawContent.substring(0, 150) + '...' // Example excerpt
        };
    } catch (e) {
        console.error(`BlogPage: Failed to parse frontmatter for post at path: ${path}`, e);
        return null; // Return null if parsing fails, so it doesn't crash the page
    }
}).filter(post => post !== null) // Filter out any posts that failed parsing or were skipped
  .sort((a, b) => new Date(b.date) - new Date(a.date));

console.log("BlogPage: Final processed posts to be displayed:", posts); // Log the final list


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
                                {/* <p className="post-excerpt">{post.excerpt}</p> */}
                                <span className="read-more">Read More →</span>
                            </Link>
                        </div>
                    ))
                ) : (
                    <p>No posts found.</p>
                )}
            </div>
        </div>
    );
}

export default BlogPage;