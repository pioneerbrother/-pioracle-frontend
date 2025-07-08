// src/posts/index.js
import matter from 'gray-matter';

// STEP A: Import each post file explicitly.
import post1 from './invasion-plan-of-turkey-en.md?raw';
import post2 from './trump-nobel-prize-2026.md?raw';
import post3 from './bezos-sanchez-prophecy-prize.md?raw';
import post4 from './btc-prague-saylor-effect.md?raw';
import post5 from './elon-musk-america-party-analysis.md?raw';
import post6 from './ethereum-mirroring-2017-playbook.md?raw';
import post7 from './okx-delisting-pi-safe.md?raw';
import post8 from './okx-delisting-pi-urdu.md?raw';
import post9 from './prediction-markets-explained.md?raw';
import post10 from './prophecy-prize-rules.md?raw';
import post11 from './tochnit-plisha-turkiya.md?raw';
// Add more imports if you have more files.

// STEP B: Map the slug to the imported content.
const allRawPosts = {
  'invasion-plan-of-turkey-en': post1,
  'trump-nobel-prize-2026': post2,
  'bezos-sanchez-prophecy-prize': post3,
  'btc-prague-saylor-effect': post4,
  'elon-musk-america-party-analysis': post5,
  'ethereum-mirroring-2017-playbook': post6,
  'okx-delisting-pi-safe': post7,
  'okx-delisting-pi-urdu': post8,
  'prediction-markets-explained': post9,
  'prophecy-prize-rules': post10,
  'tochnit-plisha-turkiya': post11,
  // Add more entries here. The key MUST match the filename without .md.
};

// This processes the raw text into usable post objects.
export const allPosts = Object.entries(allRawPosts).map(([slug, rawContent]) => {
    const { data, content } = matter(rawContent);
    const excerpt = data.excerpt || content.substring(0, 400) + '...';
    return { slug, frontmatter: data, content, excerpt };
}).sort((a, b) => new Date(b.frontmatter.date) - new Date(a.frontmatter.date));


// This function safely gets a single post by its slug from the processed array.
export const getPostBySlug = (slug) => {
  return allPosts.find(post => post.slug === slug) || null;
};