import logging
from fastapi import FastAPI, File, UploadFile, HTTPException, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import cv2
import mediapipe as mp
import numpy as np
import base64
from typing import List, Dict
import io
from PIL import Image

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Bad Posture Detection API")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize MediaPipe
mp_pose = mp.solutions.pose
mp_drawing = mp.solutions.drawing_utils
pose = mp_pose.Pose(static_image_mode=True, min_detection_confidence=0.3)

def calculate_angle(a, b, c):
    """Calculate angle between three points"""
    a = np.array(a)
    b = np.array(b)
    c = np.array(c)
    
    radians = np.arctan2(c[1] - b[1], c[0] - b[0]) - np.arctan2(a[1] - b[1], a[0] - b[0])
    angle = np.abs(radians * 180.0 / np.pi)
    
    if angle > 180.0:
        angle = 360 - angle
    
    return angle

def analyze_squat_posture(landmarks):
    """Analyze squat posture based on rules"""
    issues = []
    
    # Get key landmarks
    left_hip = [landmarks[mp_pose.PoseLandmark.LEFT_HIP.value].x,
                landmarks[mp_pose.PoseLandmark.LEFT_HIP.value].y]
    left_knee = [landmarks[mp_pose.PoseLandmark.LEFT_KNEE.value].x,
                 landmarks[mp_pose.PoseLandmark.LEFT_KNEE.value].y]
    left_ankle = [landmarks[mp_pose.PoseLandmark.LEFT_ANKLE.value].x,
                  landmarks[mp_pose.PoseLandmark.LEFT_ANKLE.value].y]
    
    right_hip = [landmarks[mp_pose.PoseLandmark.RIGHT_HIP.value].x,
                 landmarks[mp_pose.PoseLandmark.RIGHT_HIP.value].y]
    right_knee = [landmarks[mp_pose.PoseLandmark.RIGHT_KNEE.value].x,
                  landmarks[mp_pose.PoseLandmark.RIGHT_KNEE.value].y]
    right_ankle = [landmarks[mp_pose.PoseLandmark.RIGHT_ANKLE.value].x,
                   landmarks[mp_pose.PoseLandmark.RIGHT_ANKLE.value].y]
    
    left_shoulder = [landmarks[mp_pose.PoseLandmark.LEFT_SHOULDER.value].x,
                     landmarks[mp_pose.PoseLandmark.LEFT_SHOULDER.value].y]
    
    # Rule 1: Check if knee goes beyond toe
    if left_knee[0] > left_ankle[0]:
        issues.append("Left knee extends beyond toe")
    if right_knee[0] > right_ankle[0]:
        issues.append("Right knee extends beyond toe")
    
    # Rule 2: Check back angle
    back_angle = calculate_angle(left_hip, left_shoulder, [left_shoulder[0], left_shoulder[1] - 0.1])
    if back_angle < 150:
        issues.append(f"Back angle too forward: {back_angle:.1f}° (should be >150°)")
    
    # Rule 3: Check knee angle for squat depth
    left_knee_angle = calculate_angle(left_hip, left_knee, left_ankle)
    right_knee_angle = calculate_angle(right_hip, right_knee, right_ankle)
    
    if left_knee_angle > 100 or right_knee_angle > 100:
        issues.append("Squat not deep enough")
    
    return issues

def analyze_sitting_posture(landmarks):
    """Analyze sitting posture based on rules"""
    issues = []
    
    # Get key landmarks
    nose = [landmarks[mp_pose.PoseLandmark.NOSE.value].x,
            landmarks[mp_pose.PoseLandmark.NOSE.value].y]
    left_shoulder = [landmarks[mp_pose.PoseLandmark.LEFT_SHOULDER.value].x,
                     landmarks[mp_pose.PoseLandmark.LEFT_SHOULDER.value].y]
    right_shoulder = [landmarks[mp_pose.PoseLandmark.RIGHT_SHOULDER.value].x,
                      landmarks[mp_pose.PoseLandmark.RIGHT_SHOULDER.value].y]
    left_hip = [landmarks[mp_pose.PoseLandmark.LEFT_HIP.value].x,
                landmarks[mp_pose.PoseLandmark.LEFT_HIP.value].y]
    
    # Rule 1: Check neck angle
    neck_angle = calculate_angle(left_shoulder, nose, [nose[0], nose[1] - 0.1])
    if neck_angle > 30:
        issues.append(f"Forward head posture: {neck_angle:.1f}° (should be <30°)")
    
    # Rule 2: Check back straightness
    shoulder_center = [(left_shoulder[0] + right_shoulder[0])/2, 
                       (left_shoulder[1] + right_shoulder[1])/2]
    back_angle = calculate_angle(left_hip, shoulder_center, [shoulder_center[0], shoulder_center[1] - 0.1])
    
    if back_angle < 160:
        issues.append(f"Slouching detected: {back_angle:.1f}° (should be >160°)")
    
    # Rule 3: Check shoulder alignment
    shoulder_diff = abs(left_shoulder[1] - right_shoulder[1])
    if shoulder_diff > 0.05:
        issues.append("Uneven shoulder alignment")
    
    return issues

@app.get("/")
async def root():
    return {"message": "Bad Posture Detection API is running!"}

@app.post("/analyze-frame")
async def analyze_frame(file: UploadFile = File(...), posture_type: str = Form("squat")):
    """Analyze a single frame for posture issues"""
    logger.info(f"Received request for posture_type: {posture_type}, filename: {file.filename}")
    
    try:
        # Validate file type
        valid_image_types = ["image/jpeg", "image/png", "image/webp"]
        valid_video_types = ["video/mp4", "video/webm"]
        if file.content_type not in valid_image_types + valid_video_types:
            logger.error(f"Invalid file type: {file.content_type}")
            raise HTTPException(status_code=400, detail="Unsupported file type. Use JPEG, PNG, WebP, MP4, or WebM")
        
        # Read file
        contents = await file.read()
        
        # Handle image or video
        if file.content_type in valid_image_types:
            nparr = np.frombuffer(contents, np.uint8)
            image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            if image is None:
                logger.error("Failed to decode image")
                raise HTTPException(status_code=400, detail="Invalid image file")
        else:
            # For video, extract first frame (optional, for future use)
            temp_file = io.BytesIO(contents)
            cap = cv2.VideoCapture(temp_file)
            ret, image = cap.read()
            cap.release()
            if not ret:
                logger.error("Failed to extract video frame")
                raise HTTPException(status_code=400, detail="Invalid video file")
        
        # Convert BGR to RGB
        image_rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
        
        # Process with MediaPipe
        results = pose.process(image_rgb)
        
        if not results.pose_landmarks:
            logger.warning("No pose detected in image")
            return JSONResponse(content={"error": "No pose detected. Ensure a person is visible."}, status_code=400)
        
        # Analyze posture
        if posture_type.lower() not in ["squat", "sitting"]:
            logger.error(f"Invalid posture type: {posture_type}")
            raise HTTPException(status_code=400, detail="Invalid posture type. Use 'squat' or 'sitting'")
        
        issues = (
            analyze_squat_posture(results.pose_landmarks.landmark)
            if posture_type.lower() == "squat"
            else analyze_sitting_posture(results.pose_landmarks.landmark)
        )
        
        # Draw landmarks
        annotated_image = image.copy()
        mp_drawing.draw_landmarks(
            annotated_image, results.pose_landmarks, mp_pose.POSE_CONNECTIONS)
        
        # Convert to base64
        _, buffer = cv2.imencode('.jpg', annotated_image)
        img_base64 = base64.b64encode(buffer).decode('utf-8')
        
        logger.info("Analysis completed successfully")
        return {
            "issues": issues,
            "has_bad_posture": len(issues) > 0,
            "annotated_image": f"data:image/jpeg;base64,{img_base64}",
            "posture_type": posture_type.lower()
        }
        
    except Exception as e:
        logger.error(f"Error processing request: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Server error: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000,reload=True)