import init, { LineIndex } from 'wasm';

(async () => {
    const wasm = await init()

    let lineIndex;

    self.addEventListener("message", (e) => {

        switch (e.data.method) {
            case "init":
                const { flightLinesCollection, flightLine, epsylon } = e.data.data;
                lineIndex = new LineIndex(flightLinesCollection, flightLine, epsylon);
                self.postMessage(lineIndex)
                break;
            case "tick":

                let { phase, distanceFromPlane } = e.data.data;
                let [pointX, pointY, bearing, elevation, speed, timestamp, camPointX, camPointY] = lineIndex.interpolateValues(phase, distanceFromPlane)
                let direction = lineIndex.direction(bearing);
                self.postMessage({ type: "tick", data: { pointX, pointY, bearing, elevation, speed, timestamp, camPointX, camPointY, direction } })

            default:

        }
    })
})()