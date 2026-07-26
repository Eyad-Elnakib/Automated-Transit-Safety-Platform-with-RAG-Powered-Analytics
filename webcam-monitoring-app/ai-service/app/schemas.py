from typing import List, Optional, Literal
from pydantic import BaseModel


class Box(BaseModel):
    label: str
    confidence: float
    xyxy: List[float]


class SmokingPrediction(BaseModel):
    detected: bool
    label: Optional[str]  # 'cigarettes' | 'vape' | None
    confidence: float
    boxes: List[Box]


class DrowsinessPrediction(BaseModel):
    detected: bool  # True only when drowsy is detected
    label: Literal['awake', 'drowsy']
    confidence: float
    boxes: List[Box]


class BeltPrediction(BaseModel):
    detected: bool  # True = belt worn; False = no belt detected (danger)
    label: Optional[str]  # 'belt' | 'no_belt' | None
    confidence: float
    boxes: List[Box]


class CellphonePrediction(BaseModel):
    detected: bool  # True = driver is holding cellphone (danger)
    label: Optional[str]  # 'cellphone' | 'no_cellphone' | None
    confidence: float
    boxes: List[Box]


class SteeringPrediction(BaseModel):
    detected: bool  # True = hands on wheel (safe); False = hands off (danger)
    label: Optional[str]  # 'hands_on_wheel' | 'hands_off_wheel'
    confidence: float


class PredictRequest(BaseModel):
    imageBase64: str
    imageMime: str = 'image/jpeg'
    width: Optional[int] = None
    height: Optional[int] = None


class PredictResponse(BaseModel):
    success: bool
    smoking: SmokingPrediction
    drowsiness: DrowsinessPrediction
    belt: BeltPrediction
    cellphone: CellphonePrediction
    steering: SteeringPrediction

