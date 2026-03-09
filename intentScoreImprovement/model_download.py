from sentence_transformers import SentenceTransformer,CrossEncoder
from pathlib import Path


DATA_PATH = Path("/home/roshan-yadav/Desktop/TheOneEye/Prospect Involved In Post Extractor/intentScoreImprovement/ProspectPostActivity.json")
CACHE_FOLDER = DATA_PATH.parent / "cache"


# model = SentenceTransformer("BAAI/bge-large-en-v1.5",cache_folder=CACHE_FOLDER.as_posix())
# model.save("./models/bge-large-en-v1.5")

# model = SentenceTransformer("BAAI/bge-small-en-v1.5",cache_folder=CACHE_FOLDER.as_posix())
# model.save("./models/bge-small-en-v1.5")

model = CrossEncoder("BAAI/bge-reranker-large",cache_folder=CACHE_FOLDER.as_posix())
model.save("./models/bge-reranker-large")