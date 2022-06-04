import {THREE} from 'threebox-plugin'
import {MeshLine, MeshLineMaterial} from 'three.meshline';

export function createPathLaneModel(flightLine,tb){
    const textureLoader = new THREE.TextureLoader();
    
    const straightProject = tb.utils.lnglatsToWorld(flightLine.geometry.coordinates);
    const normalized = tb.utils.normalizeVertices(straightProject)
    const geometry = new THREE.BufferGeometry().setFromPoints(normalized.vertices);
   
    const material = new MeshLineMaterial( {
        map: textureLoader.load('/assets/paths/pattern.png',(texture)=>{
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
		repeat: new THREE.Vector2( 25*100,1 )
    });
    geometry.computeVertexNormals()
    geometry.normalizeNormals()
  
    const line = new MeshLine();
    line.setGeometry(geometry);
    
    const mesh = new THREE.Mesh(line.geometry, material);
    mesh.morphTargetInfluences = [0,0,0]
    mesh.frustumCulled = true;
    
    
  
    const obj = tb.Object3D({
        obj:mesh,
        anchor:'center',
        adjustment:{x:0,y:0,z:-.5},
        clone:true
       
    });
    return [obj,tb.unprojectFromWorld(normalized.position)];
}