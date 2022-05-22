import { bearing, lineString, bezierSpline } from "@turf/turf";
import { CurveInterpolator } from "curve-interpolator";
export function degToCompass(num) {
    var val = Math.floor((num / 22.5) + 0.5);
    var arr = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];
    return arr[(val % 16)];
}
// export const convertPathToGeoJson = (path) => {

//     const geoJson = {
//         "type": "FeatureCollection",
//         "features": []
//     }

//     path.features[0].geometry.coordinates.forEach((point, index) => {

//         geoJson.features.push({
//             "type": "Feature",
//             "geometry": {
//                 "type": "Point",
//                 "coordinates": [point[0], point[1], point[2]]
//             },
//             properties: {
//                 time: Date.parse(path.features[0].properties.coordTimes[index]),
//                 baro_altitude: point[2],
//                 true_track: bearing(
//                     [point[0], point[1]],
//                     [
//                         path.features[0].geometry.coordinates[index + 1] ? path.features[0].geometry.coordinates[index + 1][0] : point[0],
//                         path.features[0].geometry.coordinates[index + 1] ? path.features[0].geometry.coordinates[index + 1][1] : point[1]
//                     ]

//                 )
//             }
//         })
//     })
//     return geoJson
// }

export const convertPathToGeoJson = (path) => {
    const interpolator = new CurveInterpolator(path.features[0].geometry.coordinates,{tension:0.2})
    const interpolated =  interpolator.getPoints(5000)
    const geoJson = {
        "type": "FeatureCollection",
        "features": []
    }
   
    interpolated.forEach((point, index, array) => {
        
        geoJson.features.push({
            "type": "Feature",
            "geometry": {
                "type": "Point",
                "coordinates": [point[0], point[1], point[2]]
            },
            properties: {
                time: point[5] * 1000,
                baro_altitude: point[2],
                true_track: bearing(
                    [point[0], point[1]],
                    [
                        interpolated[index + 1] ? interpolated[index + 1][0] : point[0],
                        interpolated[index + 1] ? interpolated[index + 1][1] : point[1]
                    ], 
                    {final:true}

                ),
                speed: point[4]
            }
        })
    })
    
    return geoJson
}

export const createFlightLinesCollection = (flight) => {
    const ret =  flight.features.map((p, index) => {
        if (index < flight.features.length - 1) {
            return lineString([p.geometry.coordinates, flight.features[index + 1].geometry.coordinates], {
                altitude: [p.properties.baro_altitude, flight.features[index + 1].properties.baro_altitude],
                bearing: [p.properties.true_track, flight.features[index + 1].properties.true_track],
                timestamp: [p.properties.time, flight.features[index + 1].properties.time], 
                speed:[p.properties.speed, flight.features[index + 1].properties.speed]
            })
        }
    })
    
    return ret
}