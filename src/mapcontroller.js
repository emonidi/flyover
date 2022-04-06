import mapboxgl from 'mapbox-gl';
import { Threebox } from 'threebox-plugin';
export default class MapController {
    
    
    constructor({flight, flightLine,animate, accessToken,flightLinesCollection}){
        mapboxgl.accessToken = accessToken;
        this.animate = animate;
        this.map = this.init(flight);
        this.camera = this.map.getFreeCameraOptions();
        this.map.on('load',()=>{
            this.initializeScene(flightLine, flight,flightLinesCollection)
        })
    }

    init(flight){
        const map = new mapboxgl.Map({
            container: 'map',
            pitch: 90,
            center: [...flight.features[1].geometry.coordinates],
            zoom: 8,
            style: {
                version: 8,
                sources: {
                    'map-tiler': {
                        type: 'raster',
                        // tiles:['https://api.maptiler.com/tiles/satellite-v2/{z}/{x}/{y}.jpg?key=<your-key>'], //maptiler
                        //tiles:['https://api.mapbox.com/v4/mapbox.satellite/{z}/{x}/{y}.jpg90?access_token=pk.eyJ1IjoiZW1vbmlkaSIsImEiOiJjajdqd3pvOHYwaThqMzJxbjYyam1lanI4In0.V_4P8bJqzHxM2W9APpkf1w'],
                        tiles: ['https://2.aerial.maps.ls.hereapi.com/maptile/2.1/maptile/newest/satellite.day/{z}/{x}/{y}/512/png8?apiKey=Nt-jchpJ9cxObvHSsTKPCsWMsrXWIELcFU8nAQQPsD0'], //arcgis
                        tileSize: 512,
                    }
                },
                layers: [
                    {
                        id: 'map-tiler',
                        source: 'map-tiler',
                        type: 'raster'
                    }
                ]
            },
            interactive: true,
            trackResize: true
        });

        return map;
    }

    initializeScene(flightLine,flight,flightLinesCollection){
        const {map} = this;
        map.flyTo({
            center: [...flight.features[1].geometry.coordinates],
            zoom: 16.5,
            pitch: 75,
            bearing: flightLinesCollection.features[0].properties.bearing[0],
            essential: true,
            duration: 2000
        });
    
        map.once('moveend', () => this.animate(true))
    
        
    
        map.addSource('mapbox-dem', {
            'type': 'raster-dem',
            'url': 'mapbox://mapbox.mapbox-terrain-dem-v1',
            'tileSize': 512,
            'maxzoom': 14
        });
        map.setTerrain({ 'source': 'mapbox-dem', 'exaggeration': 1 });
        map.addLayer({
            'id': 'sky-layer',
            'type': 'sky',
            'paint': {
                // set up the sky layer to use a color gradient
                'sky-type': 'gradient',
                // the sky will be lightest in the center and get darker moving radially outward
                // this simulates the look of the sun just below the horizon
                'sky-gradient': [
                    'interpolate',
                    ['linear'],
                    ['sky-radial-progress'],
                    0.8,
                    'rgba(135, 206, 235, 1.0)',
                    1,
                    'rgba(0,0,0,0.1)'
                ],
                'sky-gradient-center': [0, 0],
                'sky-gradient-radius': 90,
                'sky-opacity': [
                    'interpolate',
                    ['exponential', 0.1],
                    ['zoom'],
                    5,
                    0,
                    22,
                    1
                ]
            }
        });
    
    
        map.addSource('flightLine', {
            type: 'geojson',
            data: flightLine
        })
    
        map.addLayer({
            'id': 'flightLine',
            'type': 'line',
            'source': 'flightLine',
            'layout': {
                'line-join': 'round',
                'line-cap': 'round'
            },
            'paint': {
                'line-color': '#888',
                'line-width': 8
            }
        })
    
        map.addLayer({
            'id': 'airplane',
            'type': 'custom',
            'renderingMode': '3d',
            onAdd: (map, gl) => {
    
                window.tb = new Threebox(map, map.getCanvas().getContext('webgl'), {
                    realSunlight: true,
                    defaultLights: true,
                    passiveRendering: true,
                    preserveDrawingBuffer: true,
                    sky: true,
                    terrain: true
                });
                var options = {
                    obj: 'assets/models/a320.glb',
                    type: 'gltf', //type enum, glb format is
                    scale: 2, //20x the original size
                    units: 'meters', //everything will be converted to meters in setCoords method				
                    rotation: { x: 0, y: 0, z: 0 }, //default rotation
                    adjustment: { x: 0, y: 0, z: 0 }, // model center is displaced
                    feature: flight.features[0], // a valid GeoJson feature
                    anchor: 'center',
                    fixedZoom: 16.5,
                    clone: false
                }
    
                window.tb.add(window.tb.line({ geometry: flightLine.geometry.coordinates, color: "red", width: 5 }))
    
                window.tb.loadObj(options, (model, err) => {
                    model.traverse(function (object) {
                        object.frustumCulled = false;
                    });
                    model.selected = true;
                    window.airplane = model.setCoords([...flight.features[0].geometry.coordinates, flight.features[0].properties.baro_altitude]);
    
                    window.tb.add(window.airplane);
                })
            },
    
            render: (gl, matrix) => {
                window.tb && window.tb.update();
            }
        })    
    }
}