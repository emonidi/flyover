import './style.css';
import 'mapbox-gl/dist/mapbox-gl.css';
import mapboxgl from 'mapbox-gl';
import { path } from './flight.json';
import { geoInterpolate } from 'd3-geo';
import { interpolateNumber } from 'd3-interpolate';
import { interpolate, along, lineString, featureEach, length, booleanEqual, booleanPointOnLine } from '@turf/turf';

if (import.meta.hot) {
    import.meta.hot.accept((newModule) => {
        console.log('updated: count is now ', newModule.count)
    })
}



const convertPathToGeoJson = (path) => {
    const geoJson = {
        "type": "FeatureCollection",
        "features": []
    }
    path.forEach(point => {
        geoJson.features.push({
            "type": "Feature",
            "geometry": {
                "type": "Point",
                "coordinates": [point[2], point[1]]
            },
            properties: {
                time: point[0],
                baro_altitude: point[3],
                true_track: point[4],
                on_ground: point[5],
            }
        })
    })
    return geoJson
}

const flight = convertPathToGeoJson(path);

const flightLine = lineString(flight.features.map(p => p.geometry.coordinates));


// enrichFlightPath()

mapboxgl.accessToken = 'pk.eyJ1IjoiZW1vbmlkaSIsImEiOiJjajdqd3pvOHYwaThqMzJxbjYyam1lanI4In0.V_4P8bJqzHxM2W9APpkf1w';
const map = new mapboxgl.Map({
    container: 'map',
   
    center: [...flight.features[1].geometry.coordinates],
  
    style: 'mapbox://styles/mapbox/satellite-v9',
    interactive: true
});

const camera = map.getFreeCameraOptions();



map.on('load', () => {

    map.addSource('mapbox-dem', {
    'type': 'raster-dem',
    'url': 'mapbox://mapbox.mapbox-terrain-dem-v1',
    'tileSize': 1024,
    'maxzoom': 14
    });
    map.setTerrain({ 'source': 'mapbox-dem', 'exaggeration': 1 });
    map.addLayer({
        'id': 'sky',
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
    
    
   

   
});

document.getElementById('map').addEventListener('click', ()=>{
    animate()
});

animate(true)

function animate(justOnce){
    let currentPoint = 0;
    let flightTime = flight.features[0].properties.time;
    let lineFlightTime = flight.features[0].properties.time;
    let start;
    let interpolateCoords;
    function frame(frameTime) {

        if (!start) start = frameTime;

        // interpolateCoords = geoInterpolate(
        //     [...flight.features[currentPoint].geometry.coordinates],
        //     [...flight.features[currentPoint + 1].geometry.coordinates]
        // );

        

        lineFlightTime = lineFlightTime + ((frameTime - start));

        const linePhase = ((lineFlightTime - flight.features[currentPoint].properties.time) / lineFlightTime)*500000;

        const line = lineString([flight.features[currentPoint].geometry.coordinates, flight.features[currentPoint + 1].geometry.coordinates]);
        const lineDistance = length(line, { units: 'meters' });
        const flightPoint = along(line, lineDistance*linePhase, { units: 'meters' });
        console.log(flightPoint);
        if (linePhase >= 1) {
            console.log(path[currentPoint],currentPoint)
            currentPoint = currentPoint + 1;
            console.log("currentPoint:" + currentPoint);
            lineFlightTime = flight.features[currentPoint].properties.time;
            requestAnimationFrame(frame);
            return;
        }
        // console.log(linePhase)
        // const interpolatedCoords = interpolateCoords(linePhase);
        // console.log(interpolatedCoords)
        
        camera.position = mapboxgl.MercatorCoordinate.fromLngLat(
            {
                lng: flightPoint.geometry.coordinates[0],
                lat: flightPoint.geometry.coordinates[1]
            },
            interpolateNumber(flight.features[currentPoint].properties.baro_altitude, flight.features[currentPoint + 1].properties.baro_altitude)(linePhase)
        );

      
        camera.setPitchBearing(80, interpolateNumber(flight.features[currentPoint].properties.true_track, flight.features[currentPoint + 1].properties.true_track)(linePhase));
        start = frameTime;
        !justOnce && requestAnimationFrame(frame);
        map.setFreeCameraOptions(camera);

    }

    requestAnimationFrame(frame)
}