import base64
import io

from PIL import Image

from app.config import IMAGE_MAX_EDGE


def decode_image(image_base64: str) -> Image.Image:
    raw = base64.b64decode(image_base64)
    img = Image.open(io.BytesIO(raw))
    return img.convert('RGB')


def resize_to_max_edge(img: Image.Image, max_edge: int = IMAGE_MAX_EDGE) -> Image.Image:
    if not max_edge or max_edge <= 0:
        return img
    w, h = img.size
    edge = max(w, h)
    if edge <= max_edge:
        return img
    scale = max_edge / float(edge)
    new_w = max(1, int(w * scale))
    new_h = max(1, int(h * scale))
    return img.resize((new_w, new_h), Image.BILINEAR)

