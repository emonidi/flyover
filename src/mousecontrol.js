export default class MouseControl{
    
    constructor(){
        this.state = {
            distanceFromPlane: -500,
            elevationFromPlane: 125,
            freeView: false,
            cameraAngle:0,
            mapPitch: 70,
            timestamShift:0,
        }
        this.isDragging = false;
    }

    setState(property,value){
        this.state = {...this.state,[property]:value}
    }
}