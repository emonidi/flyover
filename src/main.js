import './style.scss';
import 'mapbox-gl/dist/mapbox-gl.css';
import mapboxgl from 'mapbox-gl';
import Stats from 'https://threejs.org/examples/jsm/libs/stats.module.js';
import { GUI } from 'https://threejs.org/examples/jsm/libs/lil-gui.module.min.js'
import Odometer from 'odometer';
import Hammer from 'hammerjs';
import init, { LineIndex } from 'wasm';

const hasStats = location.search.indexOf('stats') > 0;

// const worker = new Worker(new URL('./worker.js', import.meta.url), {
//     type: 'module'
// })

import {
    point,
    lineString,
    featureCollection,
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
(async () => {
    await init();

    const altitudeGauge = new Odometer({
        el: document.querySelector('#altitude_gauge'),
        theme: 'default',
        format: '( ddd)',
    })
    const speedGauge = new Odometer({
        el: document.querySelector("#speed_gauge"),
        theme: 'default',
        format: '( ddd)'
    })

    speedGauge.render();
    altitudeGauge.render();

    const path = await fetch('assets/flights/flight.json').then(res => res.text());

    const stats = new Stats();
    hasStats && document.body.appendChild(stats.dom);
    // const gpx2geojson = togeojson.gpx(new DOMParser().parseFromString(path, 'text/xml'));
    const controlBar = new ControlBar(document.getElementById('controlbar'), Config.speeds);

    const flight = convertPathToGeoJson(JSON.parse(path));


    const mouseControl = new MouseControl();


    const flightLine = lineString(flight.features.map(p => p.geometry.coordinates));
    const flightLinesCollection = featureCollection(createFlightLinesCollection(flight));

    flightLinesCollection.features = flightLinesCollection.features.filter(p => p !== undefined);

    let lineIndex = new LineIndex(flightLinesCollection, flightLine,.00001);

    // worker.postMessage({ method: "init", data: { flightLinesCollection, flightLine, epsylon: 0 } });


    let gui;
    let timeElapsed = 0;

    const mapcontroller = new MapController({
        flight,
        flightLine,
        flightLinesCollection,
        accessToken: Config.mapboxAccessToken,
        animate
    });

    const { map, camera } = mapcontroller;

    const directionValueEl = document.querySelector(".direction .value");

    const setGui = () => {
        gui = new GUI();

        gui.add(mouseControl.state, 'distanceFromPlane', -1000, 1000).name("Distance from plane").onChange((ev) => {
            mouseControl.setState('distanceFromPlane', ev)
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

    // setGui();

    const totalDuration = (flight.features[flight.features.length - 1].properties.time - flight.features[0].properties.time);
    let duration = totalDuration / controlBar.speed;
    let phase = 0;

    controlBar.setOnCliderChangeCallback((value) => {
        timeElapsed = duration / 100 * value;
        !controlBar.isPlaying && animate(true);
    })

    const hammer = new Hammer(document.getElementById("map"));
    hammer.get('pinch').set({ enable: true })

    hammer.on('pinch', (ev) => {
        if (controlBar.isPlaying) {
            mouseControl.setState('distanceFromPlane', mouseControl.state.distanceFromPlane += (ev.distance * (ev.velocity > 0 ? 1 : -1) / 10))
            ev.preventDefault();
        }
    })

    hammer.on('panleft', (ev) => {
        ev.preventDefault();
        if (controlBar.isPlaying) {
            mouseControl.setState('cameraAngle', mouseControl.state.cameraAngle + ev.distance / 250);
            ev.preventDefault();
        }
    })

    hammer.on('panright', (ev) => {
        ev.preventDefault();
        if (controlBar.isPlaying) {
            mouseControl.setState('cameraAngle', mouseControl.state.cameraAngle - ev.distance / 250);
        }

    })

    hammer.on('panup', (ev) => {
        ev.preventDefault();
        if (controlBar.isPlaying) {
            console.log(ev.distance)

            if (mouseControl.state.mapPitch >= 83) {
                mouseControl.setState('mapPitch', 82);
            } else if (mouseControl.state.mapPitch <= 0) {
                mouseControl.setState('mapPitch', 0);
            } else {
                mouseControl.setState('mapPitch', mouseControl.state.mapPitch - ev.distance / 250);
            }

        }
    })

    hammer.on('pandown', (ev) => {
        ev.preventDefault();
        if (controlBar.isPlaying) {
            console.log(ev.distance)
            console.log(mouseControl.state.mapPitch)
            if (mouseControl.state.mapPitch >= 83) {
                mouseControl.setState('mapPitch', 82);
            } else if (mouseControl.state.mapPitch <= 0) {
                mouseControl.setState('mapPitch', 0);
            } else {
                mouseControl.setState('mapPitch', mouseControl.state.mapPitch + ev.distance / 250);
            }

        }
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

    map.on('wheel', (ev) => {
        if (ev.originalEvent.ctrlKey) {
            mouseControl.setState('elevationFromPlane', mouseControl.state.elevationFromPlane += ev.originalEvent.deltaY / 10);
        } else {
            mouseControl.setState('distanceFromPlane', mouseControl.state.distanceFromPlane += ev.originalEvent.deltaY / 10);
        }
    })

    map.on('mousedown', (ev) => {
        mouseControl.isDragging = true;
    })

    map.on('mouseup', (ev) => {
        mouseControl.isDragging = false;
    })

    map.on('mousemove', (ev) => {

        if (mouseControl.isDragging) {
            const direction = ev.originalEvent.movementY > 0 ? 'up' : 'down';
            if (mouseControl.state.mapPitch >= 85 && direction === 'up') {
                mouseControl.setState('mapPitch', 85);
            } else if (mouseControl.state.mapPitch <= 0 && direction === 'down') {
                mouseControl.setState('mapPitch', 0);
            } else {
                mouseControl.setState('mapPitch', mouseControl.state.mapPitch + ev.originalEvent.movementY / 10);
            }
            mouseControl.setState('cameraAngle', mouseControl.state.cameraAngle - ev.originalEvent.movementX / 10);
        }
    })

    let keyFrame = 0;

    // worker.onmessage = (ev) => {

    //     if (!ev.data.type || !airplane) return;
    //     let { pointX, pointY, bearing, elevation, speed, timestamp, camPointX, camPointY, direction } = ev.data.data

     
    //     if (!mouseControl.state.freeView) {
    //         const cameraPoint = point([camPointX, camPointY]);

    //         camera.position = mapboxgl.MercatorCoordinate.fromLngLat(
    //             {
    //                 lng: cameraPoint.geometry.coordinates[0],
    //                 lat: cameraPoint.geometry.coordinates[1]
    //             },
    //             elevation + mouseControl.state.elevationFromPlane
    //         );

    //         camera.setPitchBearing(mouseControl.state.mapPitch, bearing + mouseControl.state.cameraAngle)

    //         map.setFreeCameraOptions(camera);

    //     }
    //     airplane.setCoords([pointX, pointY, elevation])

    //     airplane.setRotation({ x: 0, y: 0, z: 180 - bearing })

      
    //     if (keyFrame >= 60) {
    //         debugger;
    //         controlBar.setProgress(phase * 100);
    //         directionValueEl.innerHTML = direction;
    //         altitudeGauge.update(elevation * 3.28084);
    //         speedGauge.update(speed)
    //         keyFrame = 0;
    //         const interpolatedTimeStamp = timestamp + mouseControl.state.timeStampShiftMilis
    //         mapcontroller.setSkyAndLandColor(interpolatedTimeStamp, [pointX, pointY], elevation)

    //     } else {
    //         keyFrame += 1;
    //     }
    //     hasStats && stats.update();
    // }


    function animate(justOnce) {

        let start = 0;
       

        function frame(time) {

            if (!start) start = time;
            const delta = (time - start) * controlBar.speed
            timeElapsed += delta;
            phase = timeElapsed / duration;
            
            // worker.postMessage({ data: { phase, distanceFromPlane: mouseControl.state.distanceFromPlane }, method: "tick" });
           
            let [pointX,pointY,bearing, elevation, speed, timestamp, camPointX, camPointY] = lineIndex.interpolateValues(phase, mouseControl.state.distanceFromPlane)
            
            airplane.setCoords([pointX, pointY, elevation])

            airplane.setRotation({ x: 0, y: 0, z: 180 - bearing })

            if (!mouseControl.state.freeView) {
                const cameraPoint = point([camPointX, camPointY]);

                camera.position = mapboxgl.MercatorCoordinate.fromLngLat(
                    {
                        lng: cameraPoint.geometry.coordinates[0],
                        lat: cameraPoint.geometry.coordinates[1]
                    },
                    elevation + mouseControl.state.elevationFromPlane
                );
               
                camera.setPitchBearing(Math.ceil(mouseControl.state.mapPitch), bearing + mouseControl.state.cameraAngle)
                
                map.setFreeCameraOptions(camera);

            }





            hasStats && stats.update();

            
            justOnce && altitudeGauge.update(elevation) && speedGauge.update(speed);
            if (keyFrame >= 60) {
                controlBar.setProgress(phase * 100);
                directionValueEl.innerHTML = lineIndex.direction(bearing);
                altitudeGauge.update(elevation * 3.28084);
                speedGauge.update(speed)
                keyFrame = 0;
                const interpolatedTimeStamp = timestamp + mouseControl.state.timeStampShiftMilis
                mapcontroller.setSkyAndLandColor(interpolatedTimeStamp, [pointX, pointY], elevation)
                
            } else {
                keyFrame += 1;
            }

            if (!justOnce && !controlBar.isPlaying) return;


            if (phase >= 1) {
                document.querySelectorAll('.mdc-icon-button__icon').forEach(el => el.classList.toggle('mdc-icon-button__icon--on'));
                controlBar.togglePlay();
                return;
            };

            start = time;
            !justOnce && window.requestAnimationFrame(frame);
        }

        window.requestAnimationFrame(frame);
    }

})()