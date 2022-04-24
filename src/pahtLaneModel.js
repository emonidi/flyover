import {center, cleanCoords} from '@turf/turf';

import {THREE,Threebox} from 'threebox-plugin'
import {MeshLine, MeshLineMaterial} from 'three.meshline';

export function createPathLaneModel(flightLine,tb){
    const textureLoader = new THREE.TextureLoader();
    
 
  
    flightLine = cleanCoords(flightLine);
    const straightProject = tb.utils.lnglatsToWorld(flightLine.geometry.coordinates);
    const normalized = tb.utils.normalizeVertices(straightProject)
   
    const geometry = new THREE.BufferGeometry().setFromPoints(normalized.vertices);
   
    const material = new MeshLineMaterial( {
        map: textureLoader.load('https://emonidi-cors-proxy.herokuapp.com/https://thumbs.dreamstime.com/b/web-233347557.jpg',(texture)=>{
            texture.wrapS = THREE.RepeatWrapping;
            texture.wrapT = THREE.RepeatWrapping;
        }),
	    useMap: true,
        sizeAttenuation: true,
		lineWidth: 12,
		depthTest: false,
		blending: THREE.NormalBlending,
		transparent: false,
		repeat: new THREE.Vector2( 48*48,1 )
     
    });
    geometry.computeVertexNormals()
    geometry.normalizeNormals()
  
    const line = new MeshLine();
    line.setGeometry(geometry);
    
    const mesh = new THREE.Mesh(line.geometry, material);
    mesh.morphTargetInfluences = [0,0,0]
    mesh.frustumCulled = false;
    console.log(tb.unprojectFromWorld(normalized.position))
    
  
    const obj = tb.Object3D({
        obj:mesh,
        anchor:'center',
        adjustment:{x:0,y:0,z:-.51},
        clone:true
       
    });
    return [obj,tb.unprojectFromWorld(normalized.position)];
}