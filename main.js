import './style.scss';
import 'mapbox-gl/dist/mapbox-gl.css';
import mapboxgl from 'mapbox-gl';
import path from './sample.gpx.js';
import togeojson from '@mapbox/togeojson';
import { geoInterpolate } from 'd3-geo';
import { interpolateNumber } from 'd3-interpolate';
import { Threebox } from 'threebox-plugin';

import {
    nearestPointOnLine,
    along,
    point,
    lineString,
    length,
    featureCollection,
    lineSlice,
    bearing,
    destination
} from '@turf/turf';
import ControlBar from './controlbar';


if (import.meta.hot) {
    import.meta.hot.accept((newModule) => {
        console.log('updated: count is now ', newModule.count)
        window.location.reload();
    })
}

const gpx2geojson = togeojson.gpx(new DOMParser().parseFromString(path, 'text/xml'));
const controlBar = new ControlBar(document.getElementById('controlbar'));
let threebox;


const convertPathToGeoJson = (path) => {

    const geoJson = {
        "type": "FeatureCollection",
        "features": []
    }

    path.features[0].geometry.coordinates.forEach((point, index) => {

        geoJson.features.push({
            "type": "Feature",
            "geometry": {
                "type": "Point",
                "coordinates": [point[0], point[1],point[2]]
            },
            properties: {
                time: Date.parse(path.features[0].properties.coordTimes[index]),
                baro_altitude: point[2],
                true_track: bearing(
                    [point[0], point[1]],
                    [
                        path.features[0].geometry.coordinates[index + 1] ? path.features[0].geometry.coordinates[index + 1][0] : point[0],
                        path.features[0].geometry.coordinates[index + 1] ? path.features[0].geometry.coordinates[index + 1][1] : point[1]
                    ]

                )
            }
        })
    })
    return geoJson
}

const flight = convertPathToGeoJson(gpx2geojson);


const flightLine = lineString(flight.features.map(p => p.geometry.coordinates));
const flightLinesCollection = featureCollection(flight.features.map((p, index) => {
    if (index < flight.features.length - 1) {
        return lineString([p.geometry.coordinates, flight.features[index + 1].geometry.coordinates], {
            altitude: [p.properties.baro_altitude, flight.features[index + 1].properties.baro_altitude],
            bearing: [p.properties.true_track, flight.features[index + 1].properties.true_track],
        })
    }
}))

flightLinesCollection.features = flightLinesCollection.features.filter(p => p !== undefined);


mapboxgl.accessToken = 'pk.eyJ1IjoiZW1vbmlkaSIsImEiOiJjajdqd3pvOHYwaThqMzJxbjYyam1lanI4In0.V_4P8bJqzHxM2W9APpkf1w';
const map = new mapboxgl.Map({
    container: 'map',
    pitch: 90,
    center: [...flight.features[1].geometry.coordinates],
    zoom: 8,
    style: 'mapbox://styles/mapbox/satellite-v9',
    interactive: true,
    trackResize: true
});

window.airplane;

const camera = map.getFreeCameraOptions();

map.on('load', () => {

    map.flyTo({
        center: [...flight.features[1].geometry.coordinates],
        zoom: 18,
        pitch: 90,
        bearing: flightLinesCollection.features[1].properties.bearing[0],
        essential: true
    });
   
debugger;
   console.log(flight.features)

    controlBar.setProgress(0)

    map.addSource('mapbox-dem', {
        'type': 'raster-dem',
        'url': 'mapbox://mapbox.mapbox-terrain-dem-v1',
        'tileSize': 256,
        'maxzoom': 14
    });
    map.setTerrain({ 'source': 'mapbox-dem', 'exaggeration': .95 });
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

            window.tb = new Threebox(map,map.getCanvas().getContext('webgl'), {
                realSunlight: true,
                defaultLights: true,
                passiveRendering: true,
               
                sky:true,
                terrain:true
            });
            var options = {
                obj: 'models/a320.glb',
                type: 'gltf', //type enum, glb format is
                scale: 2, //20x the original size
                units: 'meters', //everything will be converted to meters in setCoords method				
                rotation: { x: 0, y:0, z:0 }, //default rotation
                adjustment: { x: 0, y: 0, z: 0 }, // model center is displaced
                feature: flight.features[0], // a valid GeoJson feature
                anchor: 'center',
                // normalize:true,
                clone:false
            }
            
            window.tb.add(window.tb.line({geometry:flightLine.geometry.coordinates, color:"red",width:10}))

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


});


const totalDuration = (flight.features[flight.features.length - 1].properties.time - flight.features[0].properties.time);
const speeds = [1, 2, 4, 8, 16, 32, 64, 128, 256, 512, 1024, 2048]
let speed = speeds[0];

let timeElapsed = 0;
let duration = totalDuration / speed;

let phase = 0;

controlBar.setOnCliderChangeCallback((value) => {
    timeElapsed = duration / 100 * value;
    !controlBar.isPlaying && animate(true);
})

const playButton = document.getElementById('play');

playButton.addEventListener('click', () => {

    controlBar.togglePlay();
    document.querySelectorAll('.mdc-icon-button__icon').forEach(el => el.classList.toggle('mdc-icon-button__icon--on'));
    if (phase && phase >= 1) {
        phase = 0;
        timeElapsed = 0;
    }
    animate();
})


controlBar.setOnSpeedIncreaseCallback((ev) => {
    const speedIndex = speeds.indexOf(speed);
    if (speedIndex < speeds.length - 1) {
        speed = speeds[speedIndex + 1];

        controlBar.setSpeed(speed)
    }
})

controlBar.setOnSpeedDecreaseCallback((ev) => {
    const speedIndex = speeds.indexOf(speed);
    if (speedIndex >= 0) {
        speed = speeds[speedIndex - 1];

        controlBar.setSpeed(speed)
    }
})

let distanceFromPlane = -10;

controlBar.setSpeed(speed)

function animate(justOnce) {

    let start = 0;
    const routeDistance = length(flightLine, { units: 'meters' });

    function frame(time) {

        if (!start) start = time;
        const delta = (time - start) * speed
        timeElapsed += delta;
        phase = timeElapsed / duration;

        const alongRoute = along(
            flightLine,
            routeDistance * phase,
            {units:'meters'}
        );



        const segmentLine = flightLinesCollection.features.map((f, i) => {
            const res = nearestPointOnLine(f, alongRoute, { units: 'meters' });
            res.properties.lineIndex = i
            return res;
        }).sort((a, b) => a.properties.dist - b.properties.dist);

        const segmentLineIndex = segmentLine[0].properties.lineIndex;

        const segmentLength = length(flightLinesCollection.features[segmentLineIndex], { units: 'meters' })
        const segmentDistance = length(
            lineSlice(
                point(flightLinesCollection.features[segmentLineIndex].geometry.coordinates[0]),
                alongRoute,
                flightLinesCollection.features[segmentLineIndex]
            ), { units: 'meters' }
        )
        const segmentPhase = segmentDistance / segmentLength;

        let elevation = interpolateNumber(
            flightLinesCollection.features[segmentLineIndex].properties.altitude[0],
            flightLinesCollection.features[segmentLineIndex].properties.altitude[1])(segmentPhase)


        const bearing = interpolateNumber(
            flightLinesCollection.features[segmentLineIndex].properties.bearing[0],
            flightLinesCollection.features[segmentLineIndex].properties.bearing[1])(segmentPhase)
        
        
        const cameraPoint = destination(alongRoute,-650, bearing, { units: 'meters',properties:{elevation:elevation}}); 
        
        camera.position = mapboxgl.MercatorCoordinate.fromLngLat(
            {
                lng: cameraPoint.geometry.coordinates[0],
                lat: cameraPoint.geometry.coordinates[1]
            },
            elevation+200
        );


     
        // camera.lookAtPoint(alongRoute.geometry.coordinates);
        
        camera.setPitchBearing(75, bearing)
        console.log(camera);
       
        map.setFreeCameraOptions(camera);

        window.airplane.setCoords([alongRoute.geometry.coordinates[0], alongRoute.geometry.coordinates[1], elevation])
       
        window.airplane.setRotation({x:0,y:0,z:180-bearing})
       
      
       
        start = time;
       
        if (!justOnce && !controlBar.isPlaying) return;
        controlBar.setProgress(phase * 100);
        if (phase >= 1) {
            document.querySelectorAll('.mdc-icon-button__icon').forEach(el => el.classList.toggle('mdc-icon-button__icon--on'));
            controlBar.togglePlay();
            return;
        };
        !justOnce && window.requestAnimationFrame(frame);

    }

    window.requestAnimationFrame(frame);
}