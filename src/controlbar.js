import {MDCSlider} from '@material/slider';
import '@webcomponents/webcomponentsjs/webcomponents-loader'
import '@material/mwc-button';



export default class ControlBar {
    constructor(container, speeds){
        this.speeds = speeds;
        this.speed = speeds[0];
        this.container = container;
        this.slider = new MDCSlider(container.querySelector('.mdc-slider'));
        this.isSLiding = false;
        this.isPlaying = false;
        this.increaseButton = container.querySelector('#speed_up');
        this.increaseButton.addEventListener('click', this.onIncreaseButtonClick.bind(this));
        this.speedLabel = container.querySelector("#speed-label")
        this.playButton = container.querySelector('#play');
        
        this.setProgress(0)
    }

    togglePlay(){
        this.isPlaying = !this.isPlaying;
    }

    setProgress(progress){
       this.slider.setValue(progress);
    }

    onDecreaseButtonClick(){
        const {speeds,speed} = this;
        const speedIndex = speeds.indexOf(speed);
        if (speeds[speedIndex] === speeds[0]) {
            this.speed = speeds[speeds.length - 1];
        }else{
            this.speed = this.speeds[speedIndex - 1];
        }
        this.setSpeed(this.speed)
    }

    onIncreaseButtonClick(){
        const {speeds,speed} = this;
        const speedIndex = speeds.indexOf(speed);
        if (speeds[speedIndex] === speeds[speeds.length - 1]) {
            this.speed = speeds[0];
        }else{
            this.speed = this.speeds[speedIndex + 1];
        }
        this.setSpeed(this.speed)
    }

    setOnCliderChangeCallback(callback){
        
        this.slider.listen('MDCSlider:input',(ev)=>{
            callback(ev.detail.value)
        })
    }

    setOnPlayButtonClickCallback(callback){
        this.playButton.addEventListener('click',()=>{
          
            callback();
        });
      
    }


    setSpeed(speed){
        this.speedLabel.innerHTML = `${speed}X`;
    }
}
