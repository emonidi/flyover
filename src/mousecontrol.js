export default class MouseControl{
    
    constructor(){
        this.state = {
            distanceFromPlane: -500,
            elevationFromPlane: 125,
            freeView: false,
            cameraAngle:0,
            mapPitch: 85,
            timestamShift:0,
            timeStampShiftMilis:0
        }
        this.isDragging = false;
    }

    setState(property,value){
        this.state = {...this.state,[property]:value}
        if(property === 'timestamShift'){
            this.state.timeStampShiftMilis = value * 1000 * 60 * 60
        }
    }
}