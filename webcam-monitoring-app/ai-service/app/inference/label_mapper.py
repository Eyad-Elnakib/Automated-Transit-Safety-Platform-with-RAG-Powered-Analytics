def _normalize_name(name: str) -> str:
    return (name or '').strip().lower().replace('-', ' ').replace('_', ' ')


def build_smoking_label_map(names_by_id: dict) -> dict:
    """
    Returns mapping: class_id -> one of {'cigarettes', 'vape'} based on the model's native `names`.
    """
    label_map = {}
    for class_id, raw_name in (names_by_id or {}).items():
        n = _normalize_name(str(raw_name))
        if 'vape' in n:
            label_map[int(class_id)] = 'vape'
        elif 'cig' in n:
            label_map[int(class_id)] = 'cigarettes'

    return label_map


def build_drowsiness_label_map(names_by_id: dict) -> dict:
    """
    Returns mapping: class_id -> one of {'awake', 'drowsy'} based on the model's native `names`.
    """
    label_map = {}
    for class_id, raw_name in (names_by_id or {}).items():
        n = _normalize_name(str(raw_name))
        if 'drows' in n:
            label_map[int(class_id)] = 'drowsy'
        elif 'awake' in n:
            label_map[int(class_id)] = 'awake'
    return label_map


def build_belt_label_map(names_by_id: dict) -> dict:
    """
    Returns mapping: class_id -> one of {'belt', 'no_belt'} based on the model's native `names`.
    """
    label_map = {}
    for class_id, raw_name in (names_by_id or {}).items():
        n = _normalize_name(str(raw_name))
        # Treat any class containing 'no' or 'without' as not wearing belt
        if 'no' in n.split() or 'without' in n or 'off' in n:
            label_map[int(class_id)] = 'no_belt'
        elif 'belt' in n or 'seatbelt' in n or 'seat belt' in n:
            label_map[int(class_id)] = 'belt'
    return label_map


def build_cellphone_label_map(names_by_id: dict) -> dict:
    """
    Returns mapping: class_id -> one of {'cellphone', 'no_cellphone'} based on the model's native `names`.
    """
    label_map = {}
    for class_id, raw_name in (names_by_id or {}).items():
        n = _normalize_name(str(raw_name))
        if 'phone' in n or 'mobile' in n or 'cell' in n:
            label_map[int(class_id)] = 'cellphone'
        else:
            label_map[int(class_id)] = 'no_cellphone'
    return label_map


def build_steering_label_map(names_by_id: dict) -> dict:
    """
    Returns mapping: class_id -> one of {'hands_on_wheel', 'hands_off_wheel'}
    based on the YOLOv8 classification model's native `names`.
    """
    label_map = {}
    for class_id, raw_name in (names_by_id or {}).items():
        n = _normalize_name(str(raw_name))
        if 'off' in n.split() or 'no' in n.split():
            label_map[int(class_id)] = 'hands_off_wheel'
        else:
            label_map[int(class_id)] = 'hands_on_wheel'
    return label_map

