use axum::{
    extract::ws::{Message, WebSocket, WebSocketUpgrade},
    response::IntoResponse,
    routing::get,
    Router,
};
use futures_util::{SinkExt, StreamExt};
use reqwest::multipart;
use std::net::SocketAddr;
use std::sync::Arc;
use tokio::fs::File;
use tokio::io::AsyncWriteExt;
use uuid::Uuid;

#[tokio::main]
async fn main() {
    tracing_subscriber::fmt::init();

    // CORS is configured to allow our frontend port
    let app = Router::new()
        .route("/stream", get(ws_handler))
        .layer(tower_http::cors::CorsLayer::permissive());

    let addr = SocketAddr::from(([0, 0, 0, 0], 8000));
    tracing::info!("Rust Audio Microservice listening on {}", addr);
    
    let listener = tokio::net::TcpListener::bind(addr).await.unwrap();
    axum::serve(listener, app).await.unwrap();
}

async fn ws_handler(ws: WebSocketUpgrade) -> impl IntoResponse {
    ws.on_upgrade(handle_socket)
}

async fn handle_socket(mut socket: WebSocket) {
    let http_client = Arc::new(reqwest::Client::new());
    tracing::info!("New WebSocket client connected");

    while let Some(msg) = socket.recv().await {
        let msg = if let Ok(msg) = msg { msg } else { return };

        match msg {
            Message::Binary(data) => {
                // We received an audio chunk (WebM)
                tracing::info!("Received audio chunk of {} bytes", data.len());
                
                let client = Arc::clone(&http_client);
                
                // Process each chunk concurrently so we don't block the socket
                // In a production app you'd probably pipe chunks, 
                // but for simplicity we assume each incoming binary message is a decodable audio file 
                // (e.g. from a fresh MediaRecorder instance)
                let process_task = async move {
                    let temp_id = Uuid::new_v4();
                    let file_path = format!("/tmp/transcribe_chunk_{}.webm", temp_id);
                    
                    // 1. Write the binary payload to a temp file
                    if let Ok(mut file) = File::create(&file_path).await {
                        let _ = file.write_all(&data).await;
                    }

                    // 2. Send the file to Python FastAPI via multipart
                    let file_contents = std::fs::read(&file_path).unwrap_or_default();
                    let part = multipart::Part::bytes(file_contents)
                        .file_name("audio.webm")
                        .mime_str("audio/webm")
                        .unwrap();
                    let form = multipart::Form::new().part("audio", part);
                    
                    match client
                        .post("http://127.0.0.1:8001/transcribe")
                        .multipart(form)
                        .send()
                        .await 
                    {
                        Ok(res) => {
                            if let Ok(json_res) = res.json::<serde_json::Value>().await {
                                if let Some(text) = json_res.get("text").and_then(|t| t.as_str()) {
                                    if !text.trim().is_empty() {
                                        tracing::info!("Transcript output: {}", text);
                                        // This task only gets the text; we must send it somehow.
                                        // Because we moved `socket` out, we can't do it here easily unless we use a channel.
                                        return Some(text.to_string());
                                    }
                                }
                            }
                        }
                        Err(e) => {
                            tracing::error!("Python service transcription failed: {:?}", e);
                        }
                    }
                    
                    // Cleanup
                    let _ = std::fs::remove_file(file_path);
                    None
                };
                
                // Await the task. To make it strictly streaming non-blocking, we would use an mpsc channel 
                // to send text back into the socket loop. For simplicity, we just await it right now.
                if let Some(text) = process_task.await {
                    if socket.send(Message::Text(text.into())).await.is_err() {
                        tracing::warn!("Failed to send transcription back to client; they may have disconnected");
                        break;
                    }
                }
            }
            Message::Close(_) => {
                tracing::info!("Client disconnected");
                break;
            }
            _ => {}
        }
    }
}
