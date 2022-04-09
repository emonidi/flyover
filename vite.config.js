import copy from 'rollup-plugin-copy'

export default {
  
    server:{
        hmr:true,
        watch:true,
        cors:true
    },
    assetsInclude:['models/**/*','assets/**/*'],
    plugins:[
        copy({
            targets:[{src:'./models/a320.glb',dest:'/dist/models/a320.glb'}],
            hook: 'writeBundle' // notice here
        })
    ]
}