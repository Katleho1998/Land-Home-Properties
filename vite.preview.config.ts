import {defineConfig} from 'vite';
import vinext from 'vinext';

// Frontend-only local preview. The hosted Sites build retains vite.config.ts.
// This avoids starting a Workers emulator for pages with no server bindings.
export default defineConfig({plugins:[vinext()],server:{host:'127.0.0.1',port:5174,strictPort:true}});
