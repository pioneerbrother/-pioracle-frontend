// src/pages/BlogLayout.jsx

import React from 'react';
import { Outlet } from 'react-router-dom';

// This component's only job is to render the currently active child route.
function BlogLayout() {
  return <Outlet />;
}

export default BlogLayout;