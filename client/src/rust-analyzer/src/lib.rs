use wasm_bindgen::prelude::*;
use serde::{Deserialize, Serialize};

#[derive(Deserialize)]
pub struct Blendshape {
    pub categoryName: String,
    pub score: f32,
}

#[derive(Serialize)]
pub struct EngagementResult {
    pub score: i32,
    pub emotion: String,
}

#[wasm_bindgen]
pub struct EngagementEngine {
    current_score: f32,
}

#[wasm_bindgen]
impl EngagementEngine {
    #[wasm_bindgen(constructor)]
    pub fn new() -> Self {
        EngagementEngine {
            current_score: 75.0,
        }
    }

    pub fn calculate_engagement(&mut self, shapes: JsValue) -> JsValue {
        let shapes: Vec<Blendshape> = serde_wasm_bindgen::from_value(shapes).unwrap_or_default();
        
        let get_score = |name: &str| {
            shapes.iter()
                .find(|s| s.categoryName == name)
                .map(|s| s.score)
                .unwrap_or(0.0)
        };

        // Advanced AI Logic using Rust's performance
        let eye_blink = (get_score("eyeBlinkLeft") + get_score("eyeBlinkRight")) / 2.0;
        let look_away = (get_score("eyeLookOutLeft") + get_score("eyeLookInRight") + 
                         get_score("eyeLookInLeft") + get_score("eyeLookOutRight") + 
                         get_score("eyeLookUpLeft") + get_score("eyeLookUpRight")) / 6.0;
        let head_tilt = get_score("eyeLookDownLeft") + get_score("eyeLookDownRight");

        let mut target_score: f32 = 80.0;

        if eye_blink > 0.45 {
            target_score = 15.0; // Drowsy or sleeping
        } else if look_away > 0.4 {
            target_score = 35.0; // Looking elsewhere
        } else if head_tilt > 0.7 {
            target_score = 55.0; // Distracted/looking down
        } else {
            target_score = 92.0; // Focused
        }

        // Apply Rust-powered smoothing (Exponential Moving Average)
        self.current_score = (self.current_score * 0.85) + (target_score * 0.15);
        
        let rounded_score = self.current_score.round() as i32;
        let emotion = if !shapes.is_empty() {
            if rounded_score >= 80 { "focused".to_string() }
            else if rounded_score >= 60 { "neutral".to_string() }
            else if rounded_score >= 40 { "bored".to_string() }
            else { "distracted".to_string() }
        } else {
            "distracted".to_string()
        };

        let result = EngagementResult {
            score: rounded_score,
            emotion,
        };

        serde_wasm_bindgen::to_value(&result).unwrap()
    }
}
