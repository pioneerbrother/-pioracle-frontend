// src/pages/BlogPostPaywall.jsx

import React, { useMemo } from 'react';
import { useParams } from 'react-router-dom';
import matter from 'gray-matter';
import { getPostBySlug } from '../posts/index.js'; // Import our new helper

// ... other imports ...

function BlogPostPaywall() {
    const { slug } = useParams();

    // --- THIS IS THE ROBUST FIX ---
    // We use the safe manifest function instead of the fragile glob import.
    const post = useMemo(() => {
        const rawContent = getPostBySlug(slug);
        if (!rawContent) return null;
        
        const { data, content } = matter(rawContent);
        const excerpt = data.excerpt || content.substring(0, 400) + '...';
        return { slug, frontmatter: data, content, excerpt };
    }, [slug]);

    // ... The rest of your paywall component logic ...
    // This part of the code is now correct and stable.
}

export default BlogPostPaywall;