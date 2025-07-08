// src/posts/index.js

// Import each post explicitly. This is robust and will not fail in production.
import post1 from './invasion-plan-of-turkey-en.md?raw';

// ... add one import for every single post you have.

// Create a simple map that links the slug to the raw content.
const postContent = {
  'invasion-plan-of-turkey-en': post1,
  
  // ... add one entry for every post, matching the slug to the import.
};

// This function will safely get the content for a given slug.
export const getPostBySlug = (slug) => {
  return postContent[slug] || null;
};