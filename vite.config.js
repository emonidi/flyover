import { viteStaticCopy } from 'vite-plugin-static-copy'

export default {

    server: {
        hmr: true,
        watch: true,
        cors:true
    },
    // assetsInclude: ['models/**/*', 'assets/**/*'],
    // plugins: [
    //     viteStaticCopy({
    //         targets: [
    //             {
    //                 src: 'assets/models',
    //                 dest: 'assets'
    //             },
    //             {
    //                 src: 'netlify.toml',
    //                 dest:''
    //             }
    //         ]
    //     })
    // ]
}