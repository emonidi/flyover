import { viteStaticCopy } from 'vite-plugin-static-copy'
import wasmPack from 'vite-plugin-wasm-pack';

export default {

    server: {
        hmr: true,
        watch: true,
        cors:true
    },
    plugins:[
        wasmPack('./wasm')
    ]
}