export default {
    speeds:[1, 2, 4, 8, 16, 32, 64, 128, 256],
    mapboxAccessToken:'pk.eyJ1IjoiZW1vbmlkaSIsImEiOiJjajdqd3pvOHYwaThqMzJxbjYyam1lanI4In0.V_4P8bJqzHxM2W9APpkf1w',
    isMobile: () => {
    if(/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)){
        // true for mobile device
       
        return true
       
      }else{
        // false for not mobile device
        return false
      }
}
}