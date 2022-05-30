
mod utils;

extern crate geo;
extern crate serde_json;
extern crate web_sys;
extern crate geo_types;


use geo::{Point, Line, GeometryCollection, LineString, line_locate_point::LineLocatePoint};
use log::{error, info, warn};

use wasm_bindgen::prelude::*;
use wasm_bindgen_console_logger::DEFAULT_LOGGER;
use geojson::{Feature, GeoJson, Value, FeatureCollection, quick_collection};
use std::{convert::{TryFrom, TryInto}};
use geo::algorithm::euclidean_distance::EuclideanDistance;
use geo::algorithm::line_interpolate_point::LineInterpolatePoint;
use geo::algorithm::haversine_length::HaversineLength;
use geo::algorithm::line_locate_point;
use interpolation::{lerp};

// When the `wee_alloc` feature is enabled, use `wee_alloc` as the global
// allocator.
#[cfg(feature = "wee_alloc")]
#[global_allocator]
static ALLOC: wee_alloc::WeeAlloc = wee_alloc::WeeAlloc::INIT;

#[wasm_bindgen]
extern {
    fn alert(s: &str);
}

#[wasm_bindgen]
extern "C" {
    // Use `js_namespace` here to bind `console.log(..)` instead of just
    // `log(..)`
    #[wasm_bindgen(js_namespace = console)]
    fn log(s: &str);

    // The `console.log` is quite polymorphic, so we can bind it with multiple
    // signatures. Note that we need to use `js_name` to ensure we always call
    // `log` in JS.
    #[wasm_bindgen(js_namespace = console, js_name = log)]
    fn log_u32(a: u32);

    #[wasm_bindgen(js_namespace = console, js_name = log)]
    fn log_f32(a: f32);

    // Multiple arguments too!
    #[wasm_bindgen(js_namespace = console, js_name = log)]
    fn log_many(a: &str, b: &str);
}



#[wasm_bindgen]
#[derive(Debug, Clone)]
struct LineIndex {
    flightLineCollection:Vec<LineString<f64>>, 
    flightLineFeatureCollection:FeatureCollection,
    flightLine:geo::LineString<f64>, 
    currentLineIndex:i32,
}

#[wasm_bindgen]
impl LineIndex {
    #[wasm_bindgen(constructor)]
    pub fn new(flightLineCollection:&JsValue, fligthLineValue:&JsValue) -> LineIndex{
        utils::set_panic_hook();

        let flightLineGeoJson:GeoJson = fligthLineValue.into_serde().unwrap();
        let flightLineGeom:geo_types::Geometry<f64> = flightLineGeoJson.try_into().unwrap();
        let mut flightLine;
        match flightLineGeom {
            geo::Geometry::LineString(l)=>{
                flightLine = l;
            }, 
            _ => todo!()
        }

        let json:GeoJson = flightLineCollection.into_serde().unwrap();
        let collection:GeometryCollection<f64>= quick_collection(&json).unwrap();
        
        let lines:Vec<LineString<f64>> = collection.into_iter().map(|f:geo::Geometry<f64>|{
           match f {
               geo::Geometry::LineString(l) => l,
               _ => todo!()
           }
        }).collect();

        return LineIndex { 
            flightLineCollection: lines, 
            flightLine, 
            currentLineIndex:0, 
            flightLineFeatureCollection:FeatureCollection::try_from(json).unwrap()
        }
    }

    pub fn get_index(&mut self,x:f64, y:f64) -> i32{
        let mut distance:f64 = 100000000000000.0; 
        let mut line_index:i32 = 0;
        let point = Point::new(x, y);
        self.flightLineCollection.iter().enumerate().for_each(|(index,line)|{
            let dist = line.euclidean_distance(&point);
            if(dist < distance){
                distance = dist;
                line_index = index as i32;
            }
        });
        self.currentLineIndex = line_index;
        return line_index;
    }

    pub fn lineInterpolate(&self,phase:f64) -> Vec<f64>{
       let point:Point<f64> = self.flightLine.line_interpolate_point(phase).unwrap();
       return vec![point.x(),point.y()]
    }

    pub fn interpolateValues(&self, x:f64, y:f64)-> Vec<f64>{
        
        let currentSegment = self.flightLineFeatureCollection.features.get(self.currentLineIndex as usize).unwrap();
        
        let line:&LineString<f64> = self.flightLineCollection.get(self.currentLineIndex as usize).unwrap();
        
        let point = Point::new(x, y);
        let phase = line.line_locate_point(&point).unwrap();
        // let currentPointLineLength = segmentLength 
        
        // let phase =  segmentLength * currentPointLine ;
        
        let bearing:Vec<f64> = serde_json::from_value(currentSegment.property("bearing").unwrap().to_owned()).unwrap();
        let interpolatedBearing = lerp(&bearing[0],&bearing[1],&phase);
        let altitude:Vec<f64> = serde_json::from_value(currentSegment.property("altitude").unwrap().to_owned()).unwrap();
        let interpolatedElevation = lerp(&altitude[0],&altitude[1],&phase);
        let speed: Vec<f64> = serde_json::from_value(currentSegment.property("speed").unwrap().to_owned()).unwrap();
        let interpolatedSpeed: f64 = lerp(&speed[0],&speed[1],&phase);
        let timestamp: Vec<f64> = serde_json::from_value(currentSegment.property("timestamp").unwrap().to_owned()).unwrap();
        let interpolatedTimestamp: f64 = lerp(&timestamp[0],&timestamp[1],&phase);
        return vec![interpolatedBearing,interpolatedElevation, interpolatedSpeed, interpolatedTimestamp];
    }

    pub fn direction(&self, bearing:f64) -> String{
        let mut angle = bearing % 360.0;
        if angle < 0.0 {
            angle += 360.0
        }
        let arr = vec!["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];
        let val = (angle/25.0)+0.5;
        let floored = val.floor();
        let index = floored % 16.0;

        return arr.get(index as usize).unwrap().to_string();
    }
}

#[wasm_bindgen]
pub fn start() {
    log::set_logger(&DEFAULT_LOGGER).unwrap();
    log::set_max_level(log::LevelFilter::Info);

    error!("Error message");
    warn!("Warning message");
    info!("Informational message");
}


#[wasm_bindgen]
pub fn greet(a:&str) {
    alert(&format!("Hello,{}",a));   
}

#[wasm_bindgen]
pub fn get_current_segment_index(along:&JsValue, path:&JsValue) -> usize{
   
    utils::set_panic_hook();

    let along_geojson: GeoJson = along.into_serde().unwrap();
    let along_feature: Feature = Feature::try_from(along_geojson).unwrap();
    let along_point:geo_types::Geometry<f64> = along_feature.try_into().unwrap();
    let point = Point::try_from(along_point).unwrap();
    
    let geojson: GeoJson = path.into_serde().unwrap();
    let features: FeatureCollection = FeatureCollection::try_from(geojson).unwrap();
    let mut distance:f64 = 100000000000000.0; 
    let mut line_index:usize = 0;
    features.features.iter().enumerate().for_each(|(index,feature)|{
        match &feature.geometry.as_ref().unwrap().value {
            Value::Point(_) => todo!(),
            Value::MultiPoint(_) => todo!(),
            Value::LineString(l) => {
               let coords = l.clone();
               let line: Line<f64> = Line::new(
                  Point::new(coords[0][0], coords[0][1]),
                  Point::new(coords[1][0], coords[1][1])
               );
               let dist = line.euclidean_distance(&point);
               if(dist < distance){
                   distance = dist;
                   line_index = index;
               }
              
            },
            Value::MultiLineString(_) => todo!(),
            Value::Polygon(_) => todo!(),
            Value::MultiPolygon(_) => todo!(),
            Value::GeometryCollection(_) => todo!(),
        };
       
      
        
        
    });
    
    return  line_index;
}
