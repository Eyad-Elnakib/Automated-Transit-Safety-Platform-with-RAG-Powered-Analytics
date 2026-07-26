from typing import List, Dict, Any, Optional

from ultralytics.engine.results import Results

from app.config import CONF_THRES, DROWSINESS_CONF_THRES, DEVICE, SMOKING_IMGSZ, DROWSINESS_IMGSZ, BELT_IMGSZ, CELLPHONE_IMGSZ, STEERING_IMGSZ
from app.inference.model_loader import registry


def _run_model(model, image, imgsz: int) -> Results:
    predict_kwargs = {
        'source': image,
        'conf': CONF_THRES,
        'imgsz': imgsz,
        'verbose': False
    }
    if DEVICE:
        predict_kwargs['device'] = DEVICE
    results = model.predict(**predict_kwargs)
    return results[0] if results else None


def _boxes_to_payload(result: Results, label_map: Dict[int, str]) -> List[Dict[str, Any]]:
    boxes_out = []
    if result is None or result.boxes is None:
        return boxes_out

    boxes = result.boxes
    cls = boxes.cls
    conf = boxes.conf
    xyxy = boxes.xyxy

    # Convert tensors to python lists (results count is usually small).
    cls_list = cls.tolist() if hasattr(cls, 'tolist') else list(cls)
    conf_list = conf.tolist() if hasattr(conf, 'tolist') else list(conf)
    xyxy_list = xyxy.tolist() if hasattr(xyxy, 'tolist') else list(xyxy)

    for i in range(len(cls_list)):
        class_id = int(cls_list[i])
        label = label_map.get(class_id)
        if not label:
            continue
        confidence = float(conf_list[i])
        x1, y1, x2, y2 = map(float, xyxy_list[i])
        boxes_out.append(
            {
                'label': label,
                'confidence': confidence,
                'xyxy': [x1, y1, x2, y2]
            }
        )
    return boxes_out


def predict_smoking(image) -> Dict[str, Any]:
    if not registry.loaded or registry.smoking_model is None:
        raise RuntimeError('Smoking model not loaded')

    result = _run_model(registry.smoking_model, image, SMOKING_IMGSZ)
    boxes = _boxes_to_payload(result, registry.smoking_label_map)

    if not boxes:
        return {'detected': False, 'label': None, 'confidence': 0.0, 'boxes': []}

    top = max(boxes, key=lambda b: b['confidence'])
    return {
        'detected': True,
        'label': top['label'],
        'confidence': float(top['confidence']),
        'boxes': boxes
    }


def predict_drowsiness(image) -> Dict[str, Any]:
    if not registry.loaded or registry.drowsiness_model is None:
        raise RuntimeError('Drowsiness model not loaded')

    # Use lower threshold so subtle drowsiness signals are not filtered out.
    predict_kwargs = {
        'source': image,
        'conf': DROWSINESS_CONF_THRES,
        'imgsz': DROWSINESS_IMGSZ,
        'verbose': False
    }
    if DEVICE:
        predict_kwargs['device'] = DEVICE
    results = registry.drowsiness_model.predict(**predict_kwargs)
    result = results[0] if results else None
    boxes = _boxes_to_payload(result, registry.drowsiness_label_map)

    if not boxes:
        return {'detected': False, 'label': 'awake', 'confidence': 0.0, 'boxes': []}

    # Prioritise any drowsy box over awake — a drowsy signal must not be masked
    # by a higher-confidence awake box detected in the same frame.
    drowsy_boxes = [b for b in boxes if b['label'] == 'drowsy']
    if drowsy_boxes:
        top = max(drowsy_boxes, key=lambda b: b['confidence'])
        return {
            'detected': True,
            'label': 'drowsy',
            'confidence': float(top['confidence']),
            'boxes': boxes
        }

    top = max(boxes, key=lambda b: b['confidence'])
    return {
        'detected': False,
        'label': top['label'],
        'confidence': float(top['confidence']),
        'boxes': boxes
    }


def predict_belt(image) -> Dict[str, Any]:
    """detected=True means belt IS worn; detected=False means no belt detected (danger)."""
    if not registry.loaded or registry.belt_model is None:
        raise RuntimeError('Belt model not loaded')

    result = _run_model(registry.belt_model, image, BELT_IMGSZ)
    boxes = _boxes_to_payload(result, registry.belt_label_map)

    if not boxes:
        # Nothing detected above threshold — assume no belt (safer default)
        return {'detected': False, 'label': 'no_belt', 'confidence': 0.0, 'boxes': []}

    top = max(boxes, key=lambda b: b['confidence'])
    return {
        'detected': top['label'] == 'belt',
        'label': top['label'],
        'confidence': float(top['confidence']),
        'boxes': boxes
    }


def predict_cellphone(image) -> Dict[str, Any]:
    """detected=True means driver IS holding a cellphone (danger)."""
    if not registry.loaded or registry.cellphone_model is None:
        raise RuntimeError('Cellphone model not loaded')

    result = _run_model(registry.cellphone_model, image, CELLPHONE_IMGSZ)
    boxes = _boxes_to_payload(result, registry.cellphone_label_map)

    if not boxes:
        return {'detected': False, 'label': None, 'confidence': 0.0, 'boxes': []}

    top = max(boxes, key=lambda b: b['confidence'])
    return {
        'detected': top['label'] == 'cellphone',
        'label': top['label'],
        'confidence': float(top['confidence']),
        'boxes': boxes
    }


def predict_steering(image) -> Dict[str, Any]:
    """
    Classification model (no bounding boxes).
    detected=True means hands ARE on the wheel (safe).
    detected=False means hands are OFF the wheel (danger).
    """
    if not registry.loaded or registry.steering_model is None:
        raise RuntimeError('Steering model not loaded')

    result = _run_model(registry.steering_model, image, STEERING_IMGSZ)

    # Classification models return result.probs instead of result.boxes
    if result is None or result.probs is None:
        return {'detected': False, 'label': 'hands_off_wheel', 'confidence': 0.0}

    probs = result.probs
    top_class_id = int(probs.top1)
    top_conf = float(probs.top1conf)
    label = registry.steering_label_map.get(top_class_id, 'hands_off_wheel')

    return {
        'detected': label == 'hands_on_wheel',
        'label': label,
        'confidence': top_conf,
    }

