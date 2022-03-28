import {MDCSlider} from '@material/slider';
// import {MDCRipple} from '@material/ripple';

export default class ControlBar {
    constructor(container){
        this.container = container;
        this.slider = new MDCSlider(container.querySelector('.mdc-slider'));
        this.isSLiding = false;
        this.isPlaying = false;

        this.slider.listen('MDCSlider:click',(ev)=>{
            console.log(ev)
        })
    }

    togglePlay(){
        this.isPlaying = !this.isPlaying;
    }

    setProgress(progress){
       !this.isSLiding && this.slider.setValue(progress);
    }

    setOnCliderChangeCallback(callback){
        this.slider.listen('MDCSlider:change',(ev)=>{
            callback(ev.detail.value)
        })
    }

    setOnPlayButtonClickCallback(callback){
        this.isPlaying = !this.isPlaying;
        callback();
    }
}
