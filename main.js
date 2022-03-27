import './style.css';
import 'mapbox-gl/dist/mapbox-gl.css';
import mapboxgl from 'mapbox-gl';
import { path } from './flight.json';
import { geoInterpolate } from 'd3-geo';
import { interpolateNumber } from 'd3-interpolate';
import { interpolate, nearestPointOnLine, along, point, lineString, featureEach, length, booleanEqual, booleanPointOnLine, multiLineString, featureCollection, lineSlice } from '@turf/turf';

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
const flightLinesCollection = featureCollection(flight.features.map((p, index) => {
    if (index < flight.features.length - 1) {
        return lineString([p.geometry.coordinates, flight.features[index + 1].geometry.coordinates], {
            altitude: [p.properties.baro_altitude, flight.features[index + 1].properties.baro_altitude],
            bearing: [p.properties.true_track, flight.features[index + 1].properties.true_track],
        })
    }
}))

flightLinesCollection.features = flightLinesCollection.features.filter(p => p !== undefined);


// enrichFlightPath()

mapboxgl.accessToken = 'pk.eyJ1IjoiZW1vbmlkaSIsImEiOiJjajdqd3pvOHYwaThqMzJxbjYyam1lanI4In0.V_4P8bJqzHxM2W9APpkf1w';
const map = new mapboxgl.Map({
    container: 'map',

    center: [...flight.features[1].geometry.coordinates],

    style: 'mapbox://styles/mapbox/satellite-v9',
    // style: {
    //     'version': 8,
    //     'sources': {
    //         'raster-tiles': {
    //             'type': 'raster',
    //             'tiles': [
    //                 'https://api.maptiler.com/tiles/satellite-mediumres/{z}/{x}/{y}.jpg?key=e1RrPnLOPEw0LCkLeKYK',
    //             ],
    //             'tileSize': 256
    //         }
    //     },
    //     'layers': [
    //         {
    //             'id': 'simple-tiles',
    //             'type': 'raster',
    //             'source': 'raster-tiles',
    //             'minzoom': 0,
    //             'maxzoom': 22
    //         }
    //     ]
    // },
    interactive: true
});

const camera = map.getFreeCameraOptions();



map.on('load', () => {

    map.addSource('mapbox-dem', {
        'type': 'raster-dem',
        'url': 'mapbox://mapbox.mapbox-terrain-dem-v1',
        'tileSize': 256,
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

});

document.getElementById('map').addEventListener('click', () => {
    animate()
});

animate(true);
let div = document.createElement('div');
div.setAttribute('id', 'help');
document.body.appendChild(div);
function animate(justOnce) {

    let start = 0;
    const routeDistance = length(flightLine, { units: 'kilometers' });

    function frame(time) {
        if (!start) start = time;
        const phase = (time - start) / (20 * 60 * 1000);

        const alongRoute = along(
            flightLine,
            routeDistance * phase
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
        div.innerHTML = `
                    Segment index ${segmentLineIndex}
                    <pre>
                    ${JSON.stringify(flightLinesCollection.features[segmentLineIndex].properties, null, 4)}
                    </pre>
                    <br/>Segment length: ${segmentLength}
                    <br/>Segment phase:${segmentPhase}`;


        camera.position = mapboxgl.MercatorCoordinate.fromLngLat(
            {
                lng: alongRoute.geometry.coordinates[0],
                lat: alongRoute.geometry.coordinates[1]
            },
            interpolateNumber(
                flightLinesCollection.features[segmentLineIndex].properties.altitude[0],
                flightLinesCollection.features[segmentLineIndex].properties.altitude[1])(segmentPhase)
        );

        const bearing = interpolateNumber(
            flightLinesCollection.features[segmentLineIndex].properties.bearing[0],
            flightLinesCollection.features[segmentLineIndex].properties.bearing[1])(segmentPhase)
        camera.setPitchBearing(80, bearing)

        map.setFreeCameraOptions(camera);

        !justOnce && window.requestAnimationFrame(frame);
    }

    window.requestAnimationFrame(frame);
}