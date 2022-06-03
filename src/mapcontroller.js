import mapboxgl from 'mapbox-gl';
import { Threebox } from 'threebox-plugin';
import { getPosition, getTimes } from 'suncalc';
import {scaleLinear, scaleSequential} from 'd3-scale';
import { createPathLaneModel } from './pahtLaneModel';
import config from './config';
import PinchZoom from 'pinch-zoom-js';

export default class MapController {


    constructor({ flight, flightLine, animate, accessToken, flightLinesCollection }) {
        mapboxgl.accessToken = accessToken;
        this.animate = animate;
        this.map = this.init(flight);
        this.camera = this.map.getFreeCameraOptions();
        this.flightLinesCollection = flightLinesCollection;
        
        this.map.on('load', () => {
            this.initializeScene(flightLine, flight, flightLinesCollection);
            document.getElementById('preload').style.display = 'none';
            this.map.addControl(new mapboxgl.AttributionControl(), 'top-left');
           
        })
        this.nightLightOpacityScale = scaleSequential([0,1500], [0,.5]);
        this.sunAltitudeScale = scaleLinear([0,Math.PI/2],[0.5,1]);
       
       
    }

    init(flight) {
        const map = new mapboxgl.Map({
            container: 'map',
            pitch: 75,
            center: [...flight.features[1].geometry.coordinates],
            zoom: 5,
            style: {
                version: 8,
                sources: {
                    'map-tiler': {
                        type: 'raster',
                        tiles:['https://api.maptiler.com/tiles/satellite-v2/{z}/{x}/{y}.jpg?key=e1RrPnLOPEw0LCkLeKYK'], //maptiler
                        // tiles:['https://api.mapbox.com/styles/v1/mapbox/streets-v9/tiles/{z}/{x}/{y}?access_token=pk.eyJ1IjoiZW1vbmlkaSIsImEiOiJjajdqd3pvOHYwaThqMzJxbjYyam1lanI4In0.V_4P8bJqzHxM2W9APpkf1w'],
                        // tiles: ['https://2.aerial.maps.ls.hereapi.com/maptile/2.1/maptile/newest/satellite.day/{z}/{x}/{y}/512/png?apiKey=Nt-jchpJ9cxObvHSsTKPCsWMsrXWIELcFU8nAQQPsD0'], //arcgis
                        // tiles:['https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}&hl=en&s=Ga'], //google
                        tileSize: 512
                    },
                    'night-earth':{
                        type:'raster',
                        //there is proxy here!!! remove for production
                        tiles:['https://emonidi-cors-proxy.herokuapp.com/https://map1.vis.earthdata.nasa.gov/wmts-webmerc/VIIRS_CityLights_2012/default//GoogleMapsCompatible_Level8/{z}/{y}/{x}.jpg'],
                        tileSize: 512
                    }, 
                    'mapbox-dem': {
                        'type': 'raster-dem',
                        'url': 'mapbox://mapbox.mapbox-terrain-dem-v1',
                        tileSize: 512,
                        'maxzoom': 20
                    }
                },
                layers: [
                    {
                        id: 'map-tiler',
                        source: 'map-tiler',
                        type: 'raster'
                    },
                    {
                        id:'night-earth',
                        source:'night-earth',
                        type:'raster',
                        paint:{
                            'raster-opacity':0
                        }
                        
                    }, 
                    {
                        'id': 'sky-layer',
                        'type': 'sky',
                        'paint': {
                            // set up the sky layer for atmospheric scattering
                            'sky-type': 'atmosphere',
                            // explicitly set the position of the sun rather than allowing the sun to be attached to the main light source
                            // 'sky-atmosphere-sun':[...this.getSunPosition(this.flightLinesCollection.features[0].properties.timestamp[0], this.flightLinesCollection.features[0].geometry.coordinates[0])].slice(0,2),
                            // set the intensity of the sun as a light source (0-100 with higher values corresponding to brighter skies)
                            'sky-atmosphere-sun-intensity': 5
                        }
                    }
                ]
            },
            interactive: true,
            trackResize: true
        });

        return map;
    }

    initializeScene(flightLine, flight, flightLinesCollection) {
        const { map } = this;
        map.setTerrain({ 'source': 'mapbox-dem', 'exaggeration': 1 });
        map.flyTo({
            center: [...flight.features[0].geometry.coordinates],
            zoom: 16.5,
            pitch: 82,
            bearing: flightLinesCollection.features[0].properties.bearing[0],
            essential: true,
            duration: 1600
        });

        map.once('moveend', () => {
            this.animate(true)
        })

       
        

        map.addLayer({
            'id': 'airplane',
            'type': 'custom',
            'renderingMode': '3d',
            onAdd: (map, gl) => {

                window.tb = new Threebox(map, map.getCanvas().getContext('webgl'), {
                    
                    defaultLights: true,
                    passiveRendering: false,
                    preserveDrawingBuffer: false,
                    multiLayer:true,
                    fov:30
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
                    clone: false,
                    transparent:false
                }
                
                window.tb.camera.frustumCulled = false;
                function line(){
                    const [model,position] = createPathLaneModel(flightLine,window.tb);
                    window.pathModel = model;
                    window.pathPositoion = position;
                    model.traverse(function (object) {
                        object.frustumCulled = false;
                    });
                    model.setCoords(position)
                    window.tb.add(model);
                }

                line();
                // window.tb.add(window.tb.line({ geometry: flightLine.geometry.coordinates, color: "red", width: 20, lincap:"round",linjoin:"round" }));
               
                window.tb.loadObj(options, (model, err) => {
                    model.traverse(function (object) {
                        object.frustumCulled = false;
                    });
                    // model.selected = true;
                    window.airplane = model.setCoords([...flight.features[0].geometry.coordinates, flight.features[0].properties.baro_altitude]);

                    window.tb.add(window.airplane);

                   
                })
            },
            
            render: (gl, matrix) => {
              
                window.tb && window.tb.update();
            }
        })

        this.setSkyAndLandColor(this.flightLinesCollection.features[1].properties.timestamp[1], this.flightLinesCollection.features[1].geometry.coordinates[1])
    }

    
   getSunPosition(timestamp, position) {
   
    const sunPosition = getPosition(timestamp || Date.now(), position[1], position[0]);
    
    const sunAzimuth = 180 + (sunPosition.azimuth * 180) / Math.PI;
    const sunAltitude = 90 - (sunPosition.altitude * 180) / Math.PI;
    
    return  [sunAzimuth, sunAltitude, sunPosition]
   }

    setSkyAndLandColor(timestamp, position, elevation) {
        const times = getTimes(timestamp, position[1], position[0]);
        const [sunAzimuth, sunAltitude, sunPosition] = this.getSunPosition(timestamp, position);
        
        this.map.setPaintProperty('sky-layer', 'sky-atmosphere-sun', [sunAzimuth, sunAltitude]);
        this.map.setPaintProperty('map-tiler', 'raster-brightness-max', this.sunAltitudeScale(sunPosition.altitude));
        if((new Date(times.sunriseEnd).getTime() > timestamp || new Date(times.sunsetStart).getTime() < timestamp)) {
            this.map.setPaintProperty('night-earth', 'raster-opacity', this.nightLightOpacityScale(elevation));
        }else{
            this.map.setPaintProperty('night-earth', 'raster-opacity', 0);
        }
    }
}