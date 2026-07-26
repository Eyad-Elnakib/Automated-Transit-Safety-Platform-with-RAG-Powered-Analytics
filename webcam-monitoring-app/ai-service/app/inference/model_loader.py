from ultralytics import YOLO

from app.config import SMOKING_MODEL_PATH, DROWSINESS_MODEL_PATH, BELT_MODEL_PATH, CELLPHONE_MODEL_PATH, STEERING_MODEL_PATH
from app.inference.label_mapper import (
    build_smoking_label_map,
    build_drowsiness_label_map,
    build_belt_label_map,
    build_cellphone_label_map,
    build_steering_label_map,
)


def _extract_names(yolo_model) -> dict:
    # Ultralytics typically exposes `model.names` or `names` as a dict: {class_id: class_name}.
    names = getattr(yolo_model, 'names', None)
    if isinstance(names, dict):
        return {int(k): v for k, v in names.items()}
    model_obj = getattr(yolo_model, 'model', None)
    if model_obj is not None and hasattr(model_obj, 'names'):
        names2 = getattr(model_obj, 'names', None)
        if isinstance(names2, dict):
            return {int(k): v for k, v in names2.items()}
    return {}


class ModelRegistry:
    def __init__(self):
        self.smoking_model = None
        self.drowsiness_model = None
        self.belt_model = None
        self.cellphone_model = None
        self.steering_model = None
        self.smoking_label_map = {}
        self.drowsiness_label_map = {}
        self.belt_label_map = {}
        self.cellphone_label_map = {}
        self.steering_label_map = {}
        self.loaded = False

    def load(self):
        self.smoking_model = YOLO(SMOKING_MODEL_PATH)
        self.drowsiness_model = YOLO(DROWSINESS_MODEL_PATH)
        self.belt_model = YOLO(BELT_MODEL_PATH)
        self.cellphone_model = YOLO(CELLPHONE_MODEL_PATH)
        self.steering_model = YOLO(STEERING_MODEL_PATH)

        smoking_names = _extract_names(self.smoking_model)
        drowsiness_names = _extract_names(self.drowsiness_model)
        belt_names = _extract_names(self.belt_model)
        cellphone_names = _extract_names(self.cellphone_model)
        steering_names = _extract_names(self.steering_model)

        self.smoking_label_map = build_smoking_label_map(smoking_names)
        self.drowsiness_label_map = build_drowsiness_label_map(drowsiness_names)
        self.belt_label_map = build_belt_label_map(belt_names)
        self.cellphone_label_map = build_cellphone_label_map(cellphone_names)
        self.steering_label_map = build_steering_label_map(steering_names)

        # Minimal visibility so class mapping issues show up in logs.
        print('[ai-service] smoking model class names:', smoking_names)
        print('[ai-service] drowsiness model class names:', drowsiness_names)
        print('[ai-service] belt model class names:', belt_names)
        print('[ai-service] cellphone model class names:', cellphone_names)
        print('[ai-service] steering model class names:', steering_names)
        print('[ai-service] smoking label map:', self.smoking_label_map)
        print('[ai-service] drowsiness label map:', self.drowsiness_label_map)
        print('[ai-service] belt label map:', self.belt_label_map)
        print('[ai-service] cellphone label map:', self.cellphone_label_map)
        print('[ai-service] steering label map:', self.steering_label_map)

        self.loaded = True


registry = ModelRegistry()

