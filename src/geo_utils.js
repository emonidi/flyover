import {bearing, lineString} from "@turf/turf";

export const convertPathToGeoJson = (path) => {

    const geoJson = {
        "type": "FeatureCollection",
        "features": []
    }

    path.features[0].geometry.coordinates.forEach((point, index) => {

        geoJson.features.push({
            "type": "Feature",
            "geometry": {
                "type": "Point",
                "coordinates": [point[0], point[1], point[2]]
            },
            properties: {
                time: Date.parse(path.features[0].properties.coordTimes[index])+(60*60*1000*4),
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

export const createFlightLinesCollection = (flight) => {
   return flight.features.map((p, index) => {
        if (index < flight.features.length - 1) {
            return lineString([p.geometry.coordinates, flight.features[index + 1].geometry.coordinates], {
                altitude: [p.properties.baro_altitude, flight.features[index + 1].properties.baro_altitude],
                bearing: [p.properties.true_track, flight.features[index + 1].properties.true_track],
                timestamp: [p.properties.time, flight.features[index + 1].properties.time]
            })
        }
    })
}