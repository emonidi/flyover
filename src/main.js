import './style.scss';
import 'mapbox-gl/dist/mapbox-gl.css';
import mapboxgl from 'mapbox-gl';
import path from '../sample.gpx.js';
import togeojson from '@mapbox/togeojson';
import { interpolateNumber } from 'd3-interpolate';
import Stats from 'https://threejs.org/examples/jsm/libs/stats.module.js';
import { GUI } from 'https://threejs.org/examples/jsm/libs/lil-gui.module.min.js'
import {
    nearestPointOnLine,
    along,
    point,
    lineString,
    length,
    featureCollection,
    lineSlice,
    rhumbDestination
} from '@turf/turf';

import { convertPathToGeoJson, createFlightLinesCollection } from './geo_utils';

import ControlBar from './controlbar';
import MouseControl from './mousecontrol';
import Config from './config.js';
import MapController from './mapcontroller';

if (import.meta.hot) {
    import.meta.hot.accept((newModule) => {
        console.log('updated: count is now ', newModule.count)
        window.location.reload();
    })
}

const stats = new Stats();
document.body.appendChild(stats.dom);
const gpx2geojson = togeojson.gpx(new DOMParser().parseFromString(path, 'text/xml'));
const controlBar = new ControlBar(document.getElementById('controlbar'),Config.speeds);
const flight = convertPathToGeoJson(gpx2geojson);
const mouseControl = new MouseControl();


const flightLine = lineString(flight.features.map(p => p.geometry.coordinates));
const flightLinesCollection = featureCollection(createFlightLinesCollection(flight));

flightLinesCollection.features = flightLinesCollection.features.filter(p => p !== undefined);

let gui;
let timeElapsed = 0;

const mapcontroller = new MapController({
    flight,
    flightLine,
    flightLinesCollection,
    accessToken: Config.mapboxAccessToken,
    animate
});

const {map, camera} = mapcontroller;



const setGui = () => {
    gui = new GUI();

    gui.add(mouseControl.state, 'distanceFromPlane', -1000, 1000).name("Distance from plane").onChange((ev) => {
        mouseControl.setState('distanceFromPlane',ev)
        animate(true)
    })

    gui.add(mouseControl.state, 'elevationFromPlane', -200, 200).name("Elevation from plane").onChange((ev) => {
        mouseControl.setState('elevationFromPlane', ev);
        animate(true)
    })

    gui.add(mouseControl.state, 'mapPitch', -0, 89).name("Map pitch").onChange((ev) => {
        mouseControl.setState('mapPitch', ev);
        animate(true)
    })

    gui.add(mouseControl.state, 'freeView').name("Free view").onChange((ev) => {
        mouseControl.setState('freeView', ev);
    })

    gui.add(mouseControl.state, 'timestamShift', -12, 12).name("Timestamp shift (Hr)").onChange((ev) => {
        mouseControl.setState('timestamShift', ev);
        animate(true)
    })
}

setGui(); 

const totalDuration = (flight.features[flight.features.length - 1].properties.time - flight.features[0].properties.time);
let duration = totalDuration / controlBar.speed;
let phase = 0;

controlBar.setOnCliderChangeCallback((value) => {
    timeElapsed = duration / 100 * value;
    !controlBar.isPlaying && animate(true);
})

controlBar.setOnPlayButtonClickCallback(() => {
    controlBar.togglePlay();
    document.querySelectorAll('.mdc-icon-button__icon').forEach(el => el.classList.toggle('mdc-icon-button__icon--on'));
    if (phase && phase >= 1) {
        phase = 0;
        timeElapsed = 0;
    }
    animate();
   
})

map.on('wheel',(ev)=>{
    if(ev.originalEvent.ctrlKey){   
        mouseControl.setState('elevationFromPlane',mouseControl.state.elevationFromPlane+=ev.originalEvent.deltaY/10);
    }else{
        mouseControl.setState('distanceFromPlane',mouseControl.state.distanceFromPlane+= ev.originalEvent.deltaY/10);
    }
})

map.on('mousedown',(ev)=>{
    mouseControl.isDragging = true;
})

map.on('mouseup',(ev)=>{
    mouseControl.isDragging = false;
})

map.on('mousemove',(ev)=>{
  
    if(mouseControl.isDragging) {
        const direction = ev.originalEvent.movementY > 0 ? 'up' : 'down';
        if(mouseControl.state.mapPitch >= 85 && direction === 'up'){
            mouseControl.setState('mapPitch',85);
        }else if(mouseControl.state.mapPitch <= 0 && direction === 'down'){
            mouseControl.setState('mapPitch',0);
        }else{
            mouseControl.setState('mapPitch',mouseControl.state.mapPitch+ev.originalEvent.movementY/10);
        }
        mouseControl.setState('cameraAngle',mouseControl.state.cameraAngle-ev.originalEvent.movementX/10);
    }
})

let currentSegmentIndex  = -1;
let segmentLength, elevationInterpolator, bearingInterpolator, distanceInterpolator, timestampInterpolator;

function animate(justOnce) {

    let start = 0;
    const routeDistance = length(flightLine, { units: 'meters' });

    function frame(time) {
        if (!start) start = time;
        const delta = (time - start) * controlBar.speed
        timeElapsed += delta;
        phase = timeElapsed / duration;

        const alongRoute = along(
            flightLine,
            routeDistance * phase,
            { units: 'meters' }
        );

        const segmentLine = flightLinesCollection.features.map((f, i) => {
            const res = nearestPointOnLine(f, alongRoute, { units: 'meters' });
            res.properties.lineIndex = i
            return res;
        }).sort((a, b) => a.properties.dist - b.properties.dist);

        const segmentLineIndex = segmentLine[0].properties.lineIndex;

        if(segmentLineIndex !== currentSegmentIndex){
            currentSegmentIndex = segmentLineIndex;
            let {altitude, bearing, timestamp} = flightLinesCollection.features[segmentLineIndex].properties;
            segmentLength = length(flightLinesCollection.features[segmentLineIndex], { units: 'meters' })
            elevationInterpolator = interpolateNumber(altitude[0],altitude[1])

            bearingInterpolator =  interpolateNumber(bearing[0],bearing[1]);
            
            timestampInterpolator = interpolateNumber(
                timestamp[0]+mouseControl.state.timestamShift,
                timestamp[1]+mouseControl.state.timestamShift);
        }

        const segmentDistance = length(
            lineSlice(
                point(flightLinesCollection.features[segmentLineIndex].geometry.coordinates[0]),
                alongRoute,
                flightLinesCollection.features[segmentLineIndex]
            ), { units: 'meters' })


        const segmentPhase = segmentDistance / segmentLength;

        const elevation = elevationInterpolator(segmentPhase);
        const bearing = bearingInterpolator(segmentPhase)
        const interpolatedTimeStamp = timestampInterpolator(segmentPhase)+mouseControl.state.timestamShift*1000*60*60

       

        mapcontroller.setSkyAndLandColor(interpolatedTimeStamp,alongRoute.geometry.coordinates,elevation)


        if (!mouseControl.state.freeView) {
            const cameraPoint = rhumbDestination(alongRoute, mouseControl.state.distanceFromPlane, bearing, { units: 'meters', properties: { elevation: elevation } });

            camera.position = mapboxgl.MercatorCoordinate.fromLngLat(
                {
                    lng: cameraPoint.geometry.coordinates[0],
                    lat: cameraPoint.geometry.coordinates[1]
                },
                cameraPoint.properties.elevation+mouseControl.state.elevationFromPlane
            );

            camera.setPitchBearing(mouseControl.state.mapPitch, bearing+mouseControl.state.cameraAngle)
           
            map.setFreeCameraOptions(camera);
            
        }
      

        window.airplane.setCoords([alongRoute.geometry.coordinates[0], alongRoute.geometry.coordinates[1], elevation])

        window.airplane.setRotation({ x: 0, y: 0, z: 180 - bearing })
        window.airplane.setObjectScale(map.transform.scale)
     
        stats.update();
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