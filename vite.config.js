import { defineConfig } from 'vite';
export default defineConfig({
  // Relative asset paths work on root domains and GitHub Pages subdirectories.
  base:'./',
  build:{rolldownOptions:{output:{codeSplitting:{groups:[{name:'three',test:/node_modules\/three/}]}}}},
});
