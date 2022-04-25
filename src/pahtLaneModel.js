import {center, cleanCoords} from '@turf/turf';

import {THREE,Threebox} from 'threebox-plugin'
import {MeshLine, MeshLineMaterial} from 'three.meshline';

export function createPathLaneModel(flightLine,tb){
    const textureLoader = new THREE.TextureLoader();
    
 
  
    flightLine = cleanCoords(flightLine);
    const straightProject = tb.utils.lnglatsToWorld(flightLine.geometry.coordinates);
    const normalized = tb.utils.normalizeVertices(straightProject)
    const curve = new THREE.CatmullRomCurve3(normalized.vertices, false, 'centripetal',1);
    const points = curve.getPoints(normalized.vertices.length*10);
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
   
    const material = new MeshLineMaterial( {
        map: textureLoader.load('https://emonidi-cors-proxy.herokuapp.com/https://www.pinclipart.com/picdir/big/564-5646797_green-arrow-clip-art-animated-arrow-gif-png.png',(texture)=>{
            texture.wrapS = THREE.RepeatWrapping;
            texture.wrapT = THREE.RepeatWrapping;
            texture.minFilter = THREE.NearestFilter;
        }),
	    useMap: true,
        sizeAttenuation: true,
		lineWidth: 8,
		depthTest: true,
		blending: THREE.NormalBlending,
		transparent: true,
		repeat: new THREE.Vector2( 64*64,1 )
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
        adjustment:{x:0,y:0,z:-.5},
        clone:true
       
    });
    return [obj,tb.unprojectFromWorld(normalized.position)];
}