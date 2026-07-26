import os
from dotenv import load_dotenv

load_dotenv()

PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))

SMOKING_MODEL_PATH = os.getenv(
    'SMOKING_MODEL_PATH',
    os.getenv('AI_SMOKING_MODEL_PATH', './models/bestsmokeyolov8n.pt')
)
DROWSINESS_MODEL_PATH = os.getenv(
    'DROWSINESS_MODEL_PATH',
    os.getenv('AI_DROWSINESS_MODEL_PATH', './models/bestyolov8drowsymodel.pt')
)
BELT_MODEL_PATH = os.getenv(
    'BELT_MODEL_PATH',
    os.getenv('AI_BELT_MODEL_PATH', './models/bestbelt.pt')
)
CELLPHONE_MODEL_PATH = os.getenv(
    'CELLPHONE_MODEL_PATH',
    os.getenv('AI_CELLPHONE_MODEL_PATH', './models/bestcellphone.pt')
)
STEERING_MODEL_PATH = os.getenv(
    'STEERING_MODEL_PATH',
    os.getenv('AI_STEERING_MODEL_PATH', './models/bestClass_v2.pt')
)

CONF_THRES = float(os.getenv('AI_CONF_THRES', '0.25'))
# Drowsiness uses a lower threshold — subtle eye closure starts at low confidence.
DROWSINESS_CONF_THRES = float(os.getenv('AI_DROWSINESS_CONF_THRES', '0.15'))

# Per-model inference sizes matching their training resolution.
SMOKING_IMGSZ   = int(os.getenv('AI_SMOKING_IMGSZ',   '640'))
DROWSINESS_IMGSZ = int(os.getenv('AI_DROWSINESS_IMGSZ', '640'))
BELT_IMGSZ      = int(os.getenv('AI_BELT_IMGSZ',      '512'))
CELLPHONE_IMGSZ = int(os.getenv('AI_CELLPHONE_IMGSZ', '640'))
STEERING_IMGSZ  = int(os.getenv('AI_STEERING_IMGSZ',  '224'))  # classification models use smaller inputs

# Cap incoming frames before they hit the models (prevents 4K frames wasting memory).
IMAGE_MAX_EDGE = int(os.getenv('AI_IMAGE_MAX_EDGE', '1280'))

DEVICE = os.getenv('AI_DEVICE', '').strip()  # '' = Ultralytics auto

