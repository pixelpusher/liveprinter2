import { defineConfig } from 'vite';
import { plugin as markdown } from 'vite-plugin-markdown';

// for github pages

export default defineConfig({
  base: '/liveprinter2/',
  plugins: [markdown({ mode: ['html'] })]
});