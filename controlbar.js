import {MDCSlider} from '@material/slider';
import '@webcomponents/webcomponentsjs/webcomponents-loader'
import '@material/mwc-button';
// import {MDCRipple} from '@material/ripple';


export default class ControlBar {
    constructor(container){
        this.container = container;
        this.slider = new MDCSlider(container.querySelector('.mdc-slider'));
        this.isSLiding = false;
        this.isPlaying = false
        this.increaseButton = container.querySelector('#speed_up');
        this.decreaseButton = container.querySelector('#speed_down');
        this.speedLabel = container.querySelector("#speed-label")
    }

    togglePlay(){
        this.isPlaying = !this.isPlaying;
    }

    setProgress(progress){
       this.slider.setValue(progress);
    }



    setOnCliderChangeCallback(callback){
        this.slider.listen('MDCSlider:input',(ev)=>{
            callback(ev.detail.value)
        })
    }

    setOnPlayButtonClickCallback(callback){
        this.isPlaying = !this.isPlaying;
        callback();
    }

    setOnSpeedIncreaseCallback(callback){
        this.increaseButton.addEventListener('click', callback);
    }

    setOnSpeedDecreaseCallback(callback){
        this.decreaseButton.addEventListener('click', callback);
    }

    setSpeed(speed){
        this.speedLabel.innerHTML = `${speed}X`;
    }
}
