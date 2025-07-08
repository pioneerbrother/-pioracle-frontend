// src/posts/index.js
import matter from 'gray-matter';

// Import each post explicitly. This is robust.
import post1 from './invasion-plan-of-turkey-en.md?raw';
import post2 from './trump-nobel-prize-2026.md?raw';
import post3 from './bezos-sanchez-prophecy-prize.md?raw';
// ... import all your other markdown files here

// Create a simple map of slug to raw content
const allRawPosts = {
  'invasion-plan-of-turkey-en': post1,
  'trump-nobel-prize-2026': post2,
  'bezos-sanchez-prophecy-prize': post3,
  // ... add an entry for every post here
};

// Parse the raw content into a more useful array of post objects
// This is done once when the module is loaded.
export const allPosts = Object.entries(allRawPosts).map(([slug, rawContent]) => {
    const { data, content } = matter(rawContent);
    const excerpt = data.excerpt || content.substring(0, 400) + '...';
    return { slug, frontmatter: data, content, excerpt };
}).sort((a, b) => new Date(b.frontmatter.date) - new Date(a.frontmatter.date));


// This function will safely get a single post by its slug.
export const getPostBySlug = (slug) => {
  return allPosts.find(post => post.slug === slug) || null;
};