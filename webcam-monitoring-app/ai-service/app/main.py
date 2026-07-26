from concurrent.futures import ThreadPoolExecutor, as_completed
from fastapi import FastAPI, HTTPException

from app.inference.model_loader import registry
from app.inference.predictor import predict_smoking, predict_drowsiness, predict_belt, predict_cellphone, predict_steering
from app.schemas import PredictRequest, PredictResponse
from app.utils.image_utils import decode_image, resize_to_max_edge


app = FastAPI(title='YOLO Inference Service')

# 5 workers — one per model, so all run in parallel on separate CPU cores.
_executor = ThreadPoolExecutor(max_workers=5)


@app.on_event('startup')
def _startup():
    registry.load()


@app.get('/health')
def health():
    return {
        'ok': True,
        'loaded': registry.loaded,
        'smoking_label_map': registry.smoking_label_map,
        'drowsiness_label_map': registry.drowsiness_label_map,
        'belt_label_map': registry.belt_label_map,
        'cellphone_label_map': registry.cellphone_label_map,
        'steering_label_map': registry.steering_label_map,
    }


@app.post('/predict', response_model=PredictResponse)
def predict(req: PredictRequest):
    if not registry.loaded:
        raise HTTPException(status_code=503, detail='Models not loaded yet')

    try:
        image = decode_image(req.imageBase64)
        image = resize_to_max_edge(image)

        # Run all 4 models in parallel — total latency = slowest model, not sum of all.
        tasks = {
            'smoking':    _executor.submit(predict_smoking,   image),
            'drowsiness': _executor.submit(predict_drowsiness, image),
            'belt':       _executor.submit(predict_belt,       image),
            'cellphone':  _executor.submit(predict_cellphone,  image),
            'steering':   _executor.submit(predict_steering,   image),
        }
        results = {name: future.result() for name, future in tasks.items()}

        return PredictResponse(
            success=True,
            smoking=results['smoking'],
            drowsiness=results['drowsiness'],
            belt=results['belt'],
            cellphone=results['cellphone'],
            steering=results['steering'],
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

