# BioPredict AI Full Stack

This is the Streamlit-free migration path:

- `frontend/`: Antigravity static 3D website visuals.
- `backend/`: FastAPI backend that loads trained `.pkl` models, parses reports, predicts disease risk, and returns PDF reports.

## Model Folder

Put your trained models in:

```text
biopredict-fullstack/saved_models/
```

Expected files:

```text
diabetes_model.pkl
heart_model.pkl
liver_model.pkl
kidney_model.pkl
```

Each pickle should contain:

```python
{"model": trained_model, "features": feature_list}
```

## Run Backend + Frontend Together

```bash
cd biopredict-fullstack
pip install -r backend/requirements.txt
python -m uvicorn backend.main:app --reload --port 8000
```

Open:

```text
http://localhost:8000
```

API health check:

```text
http://localhost:8000/api/health
```

## Deploy To A Public URL

This app is ready for Docker deployment. Docker is used because image OCR needs the system package `tesseract-ocr`.

Recommended host: Render.

1. Create a new GitHub repo, for example `biopredict-ai-fullstack`.
2. Upload everything inside this `biopredict-fullstack/` folder to that repo.
3. Go to Render and choose **New +** -> **Blueprint**.
4. Connect your GitHub repo.
5. Render will read `render.yaml` and build the app using `Dockerfile`.
6. After deploy, Render gives you a public URL like:

```text
https://biopredict-ai-fullstack.onrender.com
```

Useful check after deployment:

```text
https://your-render-url.onrender.com/api/health
```
