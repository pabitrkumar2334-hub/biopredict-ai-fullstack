import base64
import hashlib
import os
import pickle
import re
import tempfile
from datetime import datetime
from io import BytesIO
from pathlib import Path

import pandas as pd
from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from fpdf import FPDF
from pydantic import BaseModel

try:
    from PIL import Image, ImageFilter, ImageOps
except Exception:
    Image = None
    ImageFilter = None
    ImageOps = None

try:
    import pytesseract
except Exception:
    pytesseract = None

try:
    from pypdf import PdfReader
except Exception:
    try:
        from PyPDF2 import PdfReader
    except Exception:
        PdfReader = None


ROOT_DIR = Path(__file__).resolve().parents[1]
FRONTEND_DIR = ROOT_DIR / "frontend"
MODEL_DIR = Path(os.environ.get("BIOPREDICT_MODEL_DIR", ROOT_DIR / "saved_models"))
if not MODEL_DIR.exists():
    MODEL_DIR = ROOT_DIR.parent / "saved_models"


ORGAN_DATA = {
    "Diabetes": {
        "organ": "Pancreas",
        "summary": "Pancreas and metabolic screening using glucose, insulin, BMI, age, and family-history indicators.",
        "doctor": "Endocrinologist",
        "tests": "HbA1c, fasting glucose, fasting insulin, lipid profile",
        "signals": [
            "Type 2 diabetes screening",
            "Insulin resistance pattern",
            "High-glucose warning signs",
        ],
        "actions": [
            "Track fasting glucose and HbA1c regularly.",
            "Review diet, weight, sleep, and physical activity habits.",
            "Consult a doctor if glucose or BMI stays above range.",
        ],
    },
    "Heart": {
        "organ": "Heart",
        "summary": "Cardiac screening using blood pressure, cholesterol, chest-pain pattern, ECG, and exercise-response markers.",
        "doctor": "Cardiologist",
        "tests": "ECG, lipid profile, troponin if symptomatic, echocardiogram",
        "signals": [
            "Coronary artery disease screening",
            "Hypertension-linked cardiac strain",
            "Cholesterol and exercise-risk pattern",
        ],
        "actions": [
            "Monitor blood pressure and cholesterol trends.",
            "Seek urgent help for chest pain, breathlessness, or fainting.",
            "Discuss ECG and lipid follow-up with a physician.",
        ],
    },
    "Liver": {
        "organ": "Liver",
        "summary": "Liver screening using bilirubin, liver enzymes, albumin, protein balance, and age indicators.",
        "doctor": "Gastroenterologist / Hepatologist",
        "tests": "LFT, hepatitis panel, ultrasound abdomen, GGT",
        "signals": [
            "Fatty liver screening",
            "Liver inflammation marker pattern",
            "Bilirubin and protein-balance stress",
        ],
        "actions": [
            "Repeat LFT if enzymes or bilirubin remain high.",
            "Avoid alcohol and unnecessary liver-stressing medicines.",
            "Consider ultrasound and hepatitis screening if advised.",
        ],
    },
    "Kidney": {
        "organ": "Kidneys",
        "summary": "Kidney screening using creatinine, urea, electrolytes, urine markers, blood count, and blood-pressure signals.",
        "doctor": "Nephrologist",
        "tests": "KFT, urine routine, urine ACR, eGFR, renal ultrasound",
        "signals": [
            "Chronic kidney disease screening",
            "Filtration and waste-clearance pattern",
            "Electrolyte and urine-marker imbalance",
        ],
        "actions": [
            "Track creatinine, urea, eGFR, and urine protein.",
            "Control blood pressure and diabetes if present.",
            "Consult a doctor if swelling, anemia, or abnormal urine persists.",
        ],
    },
}


FIELD_CONFIG = {
    "Diabetes": [
        {"key": "pregnancies", "label": "Pregnancies", "type": "number", "default": 1},
        {"key": "glucose", "label": "Glucose Level", "type": "number", "default": 120},
        {"key": "bp", "label": "Blood Pressure", "type": "number", "default": 70},
        {"key": "skin", "label": "Skin Thickness", "type": "number", "default": 20},
        {"key": "insulin", "label": "Insulin", "type": "number", "default": 80},
        {"key": "bmi", "label": "BMI", "type": "number", "default": 25.0},
        {"key": "dpf", "label": "Diabetes Pedigree Function", "type": "number", "default": 0.5},
        {"key": "age", "label": "Age", "type": "number", "default": 30},
    ],
    "Heart": [
        {"key": "age", "label": "Age", "type": "number", "default": 50},
        {"key": "sex", "label": "Sex", "type": "select", "default": 1, "options": [{"label": "Female", "value": 0}, {"label": "Male", "value": 1}]},
        {"key": "cp", "label": "Chest Pain Type", "type": "select", "default": 0, "options": [{"label": str(i), "value": i} for i in range(4)]},
        {"key": "trestbps", "label": "Resting Blood Pressure", "type": "number", "default": 120},
        {"key": "chol", "label": "Cholesterol", "type": "number", "default": 200},
        {"key": "fbs", "label": "Fasting Blood Sugar > 120", "type": "select", "default": 0, "options": [{"label": "No", "value": 0}, {"label": "Yes", "value": 1}]},
        {"key": "restecg", "label": "Resting ECG", "type": "select", "default": 0, "options": [{"label": str(i), "value": i} for i in range(3)]},
        {"key": "thalach", "label": "Max Heart Rate", "type": "number", "default": 150},
        {"key": "exang", "label": "Exercise Induced Angina", "type": "select", "default": 0, "options": [{"label": "No", "value": 0}, {"label": "Yes", "value": 1}]},
        {"key": "oldpeak", "label": "ST Depression", "type": "number", "default": 1.0},
        {"key": "slope", "label": "Slope of ST", "type": "select", "default": 0, "options": [{"label": str(i), "value": i} for i in range(3)]},
        {"key": "ca", "label": "Major Vessels", "type": "select", "default": 0, "options": [{"label": str(i), "value": i} for i in range(5)]},
        {"key": "thal", "label": "Thal", "type": "select", "default": 0, "options": [{"label": str(i), "value": i} for i in range(4)]},
    ],
    "Liver": [
        {"key": "age", "label": "Age", "type": "number", "default": 40},
        {"key": "gender", "label": "Gender", "type": "select", "default": 1, "options": [{"label": "Female", "value": 0}, {"label": "Male", "value": 1}]},
        {"key": "total_bili", "label": "Total Bilirubin", "type": "number", "default": 1.0},
        {"key": "direct_bili", "label": "Direct Bilirubin", "type": "number", "default": 0.3},
        {"key": "alk_phos", "label": "Alkaline Phosphatase", "type": "number", "default": 200},
        {"key": "alt", "label": "ALT / SGPT", "type": "number", "default": 30},
        {"key": "ast", "label": "AST / SGOT", "type": "number", "default": 30},
        {"key": "total_prot", "label": "Total Proteins", "type": "number", "default": 6.5},
        {"key": "albumin", "label": "Albumin", "type": "number", "default": 3.5},
        {"key": "ag_ratio", "label": "Albumin/Globulin Ratio", "type": "number", "default": 1.0},
    ],
    "Kidney": [
        {"key": "age", "label": "Age", "type": "number", "default": 40},
        {"key": "bp", "label": "Blood Pressure", "type": "number", "default": 80},
        {"key": "sg", "label": "Specific Gravity", "type": "number", "default": 1.020},
        {"key": "al", "label": "Albumin", "type": "number", "default": 0},
        {"key": "su", "label": "Sugar", "type": "number", "default": 0},
        {"key": "rbc", "label": "Red Blood Cells", "type": "select", "default": 1, "options": [{"label": "Abnormal", "value": 0}, {"label": "Normal", "value": 1}]},
        {"key": "pc", "label": "Pus Cells", "type": "select", "default": 1, "options": [{"label": "Abnormal", "value": 0}, {"label": "Normal", "value": 1}]},
        {"key": "pcc", "label": "Pus Cell Clumps", "type": "select", "default": 0, "options": [{"label": "Not Present", "value": 0}, {"label": "Present", "value": 1}]},
        {"key": "ba", "label": "Bacteria", "type": "select", "default": 0, "options": [{"label": "Not Present", "value": 0}, {"label": "Present", "value": 1}]},
        {"key": "bgr", "label": "Blood Glucose Random", "type": "number", "default": 120},
        {"key": "bu", "label": "Blood Urea", "type": "number", "default": 40},
        {"key": "sc", "label": "Serum Creatinine", "type": "number", "default": 1.2},
        {"key": "sod", "label": "Sodium", "type": "number", "default": 138},
        {"key": "pot", "label": "Potassium", "type": "number", "default": 4.5},
        {"key": "hemo", "label": "Hemoglobin", "type": "number", "default": 15.0},
        {"key": "pcv", "label": "Packed Cell Volume", "type": "number", "default": 44},
        {"key": "wc", "label": "White Blood Cell Count", "type": "number", "default": 8000},
        {"key": "rc", "label": "Red Blood Cell Count", "type": "number", "default": 5.0},
        {"key": "htn", "label": "Hypertension", "type": "select", "default": 0, "options": [{"label": "No", "value": 0}, {"label": "Yes", "value": 1}]},
        {"key": "dm", "label": "Diabetes Mellitus", "type": "select", "default": 0, "options": [{"label": "No", "value": 0}, {"label": "Yes", "value": 1}]},
        {"key": "cad", "label": "Coronary Artery Disease", "type": "select", "default": 0, "options": [{"label": "No", "value": 0}, {"label": "Yes", "value": 1}]},
        {"key": "appet", "label": "Appetite", "type": "select", "default": 1, "options": [{"label": "Poor", "value": 0}, {"label": "Good", "value": 1}]},
        {"key": "pe", "label": "Pedal Edema", "type": "select", "default": 0, "options": [{"label": "No", "value": 0}, {"label": "Yes", "value": 1}]},
        {"key": "ane", "label": "Anemia", "type": "select", "default": 0, "options": [{"label": "No", "value": 0}, {"label": "Yes", "value": 1}]},
    ],
}


MODEL_PARAM_MAP = {
    "Diabetes": {
        "Pregnancies": "pregnancies",
        "Glucose": "glucose",
        "BloodPressure": "bp",
        "SkinThickness": "skin",
        "Insulin": "insulin",
        "BMI": "bmi",
        "DiabetesPedigreeFunction": "dpf",
        "Age": "age",
    },
    "Heart": {
        "age": "age",
        "sex": "sex",
        "cp": "cp",
        "trestbps": "trestbps",
        "chol": "chol",
        "fbs": "fbs",
        "restecg": "restecg",
        "thalach": "thalach",
        "exang": "exang",
        "oldpeak": "oldpeak",
        "slope": "slope",
        "ca": "ca",
        "thal": "thal",
    },
    "Liver": {
        "Age": "age",
        "Gender": "gender",
        "Total_Bilirubin": "total_bili",
        "Direct_Bilirubin": "direct_bili",
        "Alkaline_Phosphotase": "alk_phos",
        "Alamine_Aminotransferase": "alt",
        "Aspartate_Aminotransferase": "ast",
        "Total_Protiens": "total_prot",
        "Albumin": "albumin",
        "Albumin_and_Globulin_Ratio": "ag_ratio",
    },
    "Kidney": {
        "age": "age",
        "bp": "bp",
        "sg": "sg",
        "al": "al",
        "su": "su",
        "rbc": "rbc",
        "pc": "pc",
        "pcc": "pcc",
        "ba": "ba",
        "bgr": "bgr",
        "bu": "bu",
        "sc": "sc",
        "sod": "sod",
        "pot": "pot",
        "hemo": "hemo",
        "pcv": "pcv",
        "wc": "wc",
        "rc": "rc",
        "htn": "htn",
        "dm": "dm",
        "cad": "cad",
        "appet": "appet",
        "pe": "pe",
        "ane": "ane",
    },
}


REPORT_MARKERS = {
    "Diabetes": {
        "pregnancies": ["Pregnancies"],
        "glucose": ["Fasting Blood Sugar", "FBS", "Blood Sugar Fasting", "Glucose Fasting", "Plasma Glucose", "Blood Glucose", "Glucose Level", "Glucose"],
        "bp": ["Blood Pressure", "B.P.", "BP"],
        "skin": ["Skin Thickness", "Triceps Skin Fold"],
        "insulin": ["Insulin", "Fasting Insulin"],
        "bmi": ["BMI", "Body Mass Index"],
        "dpf": ["Diabetes Pedigree Function", "Pedigree Function"],
        "age": ["Age", "Patient Age"],
        "hba1c": ["HbA1c", "HBA1C", "Glycated Hemoglobin", "Glycosylated Hemoglobin"],
    },
    "Heart": {
        "age": ["Age", "Patient Age"],
        "trestbps": ["Resting Blood Pressure", "Blood Pressure", "B.P.", "BP"],
        "chol": ["Total Cholesterol", "Serum Cholesterol", "Cholesterol"],
        "thalach": ["Max Heart Rate", "Maximum Heart Rate", "Heart Rate", "Pulse Rate"],
        "oldpeak": ["ST Depression", "Oldpeak"],
        "fbs_value": ["Fasting Blood Sugar", "FBS", "Blood Sugar Fasting"],
    },
    "Liver": {
        "age": ["Age", "Patient Age"],
        "total_bili": ["Total Bilirubin", "Bilirubin Total", "Bilirubin - Total"],
        "direct_bili": ["Direct Bilirubin", "Conjugated Bilirubin", "Bilirubin Direct", "Bilirubin - Direct"],
        "alk_phos": ["Alkaline Phosphotase", "Alkaline Phosphatase", "Alk Phos", "ALP"],
        "alt": ["Alamine Aminotransferase", "Alanine Aminotransferase", "ALT", "SGPT"],
        "ast": ["Aspartate Aminotransferase", "AST", "SGOT"],
        "total_prot": ["Total Proteins", "Total Protein", "Protein Total"],
        "albumin": ["Serum Albumin", "Albumin"],
        "ag_ratio": ["Albumin Globulin Ratio", "A/G Ratio", "Albumin/Globulin Ratio", "AG Ratio"],
    },
    "Kidney": {
        "age": ["Age", "Patient Age"],
        "bp": ["Blood Pressure", "B.P.", "BP"],
        "sg": ["Specific Gravity", "Urine Specific Gravity"],
        "al": ["Urine Albumin", "Albumin (Urine)", "Albumin Urine"],
        "su": ["Urine Sugar", "Sugar (Urine)", "Sugar Urine"],
        "bgr": ["Blood Glucose Random", "Random Blood Sugar", "RBS", "Glucose Random"],
        "bu": ["Blood Urea Nitrogen", "Blood Urea", "Urea", "BUN"],
        "sc": ["Serum Creatinine", "Creatinine"],
        "sod": ["Serum Sodium", "Sodium", "Na+"],
        "pot": ["Serum Potassium", "Potassium", "K+"],
        "hemo": ["Hemoglobin", "Haemoglobin", "Hb"],
        "pcv": ["Packed Cell Volume", "PCV", "Hematocrit", "HCT"],
        "wc": ["White Blood Cell Count", "WBC Count", "WBC", "Total Leukocyte Count", "TLC"],
        "rc": ["Red Blood Cell Count", "RBC Count", "RBC"],
    },
}


NORMAL_RANGES = {
    "Glucose": (70, 100),
    "BloodPressure": (60, 80),
    "BMI": (18.5, 24.9),
    "Insulin": (16, 166),
    "SkinThickness": (10, 30),
    "Age": (0, 120),
    "age": (0, 120),
    "Pregnancies": (0, 10),
    "DiabetesPedigreeFunction": (0, 1),
    "chol": (125, 200),
    "trestbps": (90, 120),
    "thalach": (60, 100),
    "oldpeak": (0, 2),
    "Total_Bilirubin": (0.2, 1.2),
    "Direct_Bilirubin": (0, 0.3),
    "Alkaline_Phosphotase": (44, 147),
    "Alamine_Aminotransferase": (7, 56),
    "Aspartate_Aminotransferase": (10, 40),
    "Total_Protiens": (6, 8.3),
    "Albumin": (3.5, 5),
    "Albumin_and_Globulin_Ratio": (1, 2.5),
    "bp": (60, 80),
    "sg": (1.005, 1.030),
    "al": (0, 0),
    "su": (0, 0),
    "bgr": (70, 120),
    "bu": (7, 25),
    "sc": (0.6, 1.2),
    "sod": (135, 145),
    "pot": (3.5, 5),
    "hemo": (12, 17),
    "pcv": (36, 50),
    "wc": (4500, 11000),
    "rc": (4.5, 5.5),
}


class PredictionRequest(BaseModel):
    disease: str
    inputs: dict


models = {}
model_load_errors = {}


def get_float(value, default=0.0):
    try:
        if value is None or value == "":
            return default
        return float(value)
    except Exception:
        return default


def get_int(value, default=0):
    try:
        if value is None or value == "":
            return default
        return int(float(value))
    except Exception:
        return default


def load_models():
    models.clear()
    model_load_errors.clear()
    try:
        import sklearn.compose._column_transformer as column_transformer

        if not hasattr(column_transformer, "_RemainderColsList"):
            class _RemainderColsList(list):
                pass

            column_transformer._RemainderColsList = _RemainderColsList
    except Exception:
        pass

    for disease in ["diabetes", "heart", "liver", "kidney"]:
        path = MODEL_DIR / f"{disease}_model.pkl"
        name = disease.capitalize()
        if not path.exists():
            model_load_errors[name] = f"Missing model file: {path}"
            continue
        try:
            with open(path, "rb") as file:
                model_package = pickle.load(file)
            if not isinstance(model_package, dict) or "model" not in model_package or "features" not in model_package:
                raise ValueError("Model package must be a dictionary containing 'model' and 'features'.")
            repair_sklearn_model_compat(model_package["model"])
            models[name] = model_package
        except Exception as exc:
            model_load_errors[name] = f"{type(exc).__name__}: {exc}"


def repair_sklearn_model_compat(model):
    """Repair small sklearn version gaps in locally trained pickle models."""
    seen = set()

    def visit(obj):
        obj_id = id(obj)
        if obj_id in seen:
            return
        seen.add(obj_id)

        if obj.__class__.__name__ == "SimpleImputer" and not hasattr(obj, "_fill_dtype"):
            obj._fill_dtype = getattr(obj, "_fit_dtype", None)

        if isinstance(obj, dict):
            children = obj.values()
        elif isinstance(obj, (list, tuple, set)):
            children = obj
        else:
            children = getattr(obj, "__dict__", {}).values()

        for child in children:
            if isinstance(child, (str, bytes, int, float, bool, type(None))):
                continue
            visit(child)

    visit(model)


def clean_report_text(text):
    lines = []
    for line in (text or "").replace("\r", "\n").split("\n"):
        cleaned = re.sub(r"\s+", " ", line).strip()
        if cleaned:
            lines.append(cleaned)
    return "\n".join(lines)


def preprocess_report_image(image):
    image = ImageOps.exif_transpose(image)
    image = image.convert("L")
    width, height = image.size
    scale = max(1, int(1600 / max(1, width)))
    if scale > 1:
        image = image.resize((width * scale, height * scale))
    image = ImageOps.autocontrast(image)
    image = image.filter(ImageFilter.SHARPEN)
    return image


def extract_text_from_bytes(file_bytes, filename, content_type):
    report_id = hashlib.md5(file_bytes).hexdigest()[:10]
    name = (filename or "").lower()
    mime = (content_type or "").lower()

    if name.endswith(".pdf") or "pdf" in mime:
        if PdfReader is None:
            raise HTTPException(status_code=500, detail="PDF reading is unavailable. Install pypdf.")
        reader = PdfReader(BytesIO(file_bytes))
        text = " ".join(page.extract_text() or "" for page in reader.pages)
        return clean_report_text(text), report_id

    if name.endswith((".png", ".jpg", ".jpeg", ".webp", ".bmp", ".tiff", ".tif")) or mime.startswith("image/"):
        if Image is None or pytesseract is None:
            raise HTTPException(status_code=500, detail="Image OCR is unavailable. Install Pillow, pytesseract, and tesseract-ocr.")
        image = Image.open(BytesIO(file_bytes))
        processed = preprocess_report_image(image)
        text = pytesseract.image_to_string(processed, config="--psm 6")
        return clean_report_text(text), report_id

    raise HTTPException(status_code=400, detail="Unsupported file format. Upload PDF, PNG, JPG, WEBP, BMP, or TIFF.")


def numeric_candidates(line):
    return re.findall(r"(?<![A-Za-z])([0-9]+(?:\.[0-9]+)?)(?![A-Za-z])", line)


def line_has_label(line, label):
    escaped = re.escape(label)
    if label and label[0].isalnum() and label[-1].isalnum():
        return re.search(rf"(?<![A-Za-z]){escaped}(?![A-Za-z])", line, flags=re.IGNORECASE)
    return re.search(escaped, line, flags=re.IGNORECASE)


def looks_like_result_context(text):
    keywords = [
        "method",
        "calculated",
        "colorimetric",
        "enzymatic",
        "oxidase",
        "peroxidase",
        "impedance",
        "chromatography",
        "turbidimetric",
        "direct",
        "ifcc",
        "ise",
        "result",
        "value",
        "observed",
    ]
    lowered = text.lower()
    return any(keyword in lowered for keyword in keywords)


def looks_like_prose(line):
    lowered = line.lower()
    prose_words = ["patient", "recommended", "screening", "explanation", "reflects", "risk", "defined as"]
    return len(line) > 150 or any(word in lowered for word in prose_words)


def looks_like_range_only(line):
    numbers = numeric_candidates(line)
    has_range = re.search(r"[0-9]+(?:\.[0-9]+)?\s*[-–]\s*[0-9]+(?:\.[0-9]+)?", line)
    return bool(has_range and len(numbers) <= 2 and not looks_like_result_context(line))


def choose_best_number(line, label):
    after_label = re.split(re.escape(label), line, maxsplit=1, flags=re.IGNORECASE)
    search_area = after_label[1] if len(after_label) > 1 else line
    explicit = re.search(r"(?:result|value|observed|reading)\s*[:\-]?\s*([0-9]+(?:\.[0-9]+)?)", search_area, flags=re.IGNORECASE)
    if explicit:
        return explicit.group(1)
    numbers = numeric_candidates(search_area) or numeric_candidates(line)
    return numbers[-1] if numbers else None


def find_marker_detail(text, labels):
    lines = text.splitlines() if "\n" in text else [text]
    for label in labels:
        for index, line in enumerate(lines):
            if not line_has_label(line, label):
                continue
            for result_line in lines[index : min(len(lines), index + 6)]:
                if line_has_label(result_line, label) and looks_like_result_context(result_line):
                    numbers = numeric_candidates(result_line)
                    if numbers:
                        return {"value": numbers[-1], "label": label, "source": result_line[:160], "confidence": "High"}
            if (looks_like_result_context(line) or not looks_like_prose(line)) and not looks_like_range_only(line):
                value = choose_best_number(line, label)
                if value is not None:
                    return {"value": value, "label": label, "source": line[:160], "confidence": "Medium"}
    return None


def find_age(text):
    patterns = [
        r"\b(?:male|female|m|f)\s*/\s*([0-9]{1,3})\s*(?:years|yrs|yr|y)?\b",
        r"\b([0-9]{1,3})\s*(?:years|yrs|yr|y)\s*[-/]\s*(?:male|female|m|f)\b",
        r"(?:age|patient age)\s*[:\-]?\s*([0-9]{1,3})\s*(?:years|yrs|yr|y)?",
        r"(?:age\s*/\s*sex|age\s*/\s*gender)\s*[:\-]?\s*([0-9]{1,3})",
    ]
    for pattern in patterns:
        match = re.search(pattern, text, flags=re.IGNORECASE)
        if match:
            return match.group(1)
    return None


def find_gender_label(text):
    patterns = [
        r"\b(male|female|m|f)\s*/\s*[0-9]{1,3}\s*(?:years|yrs|yr|y)?\b",
        r"\b[0-9]{1,3}\s*(?:years|yrs|yr|y)\s*[-/]\s*(male|female|m|f)\b",
        r"(?:gender|sex)\s*[:\-]?\s*(male|female|m|f)\b",
        r"(?:age\s*/\s*sex|age\s*/\s*gender)\s*[:\-]?\s*[0-9]{1,3}\s*/?\s*(male|female|m|f)\b",
    ]
    for pattern in patterns:
        match = re.search(pattern, text, flags=re.IGNORECASE)
        if match:
            value = match.group(1).lower()
            return "Male" if value in ["male", "m"] else "Female"
    return None


def parse_report_details(text, disease):
    values = {}
    age = find_age(text)
    if age is not None:
        values["age"] = {"value": age, "label": "Age/Sex", "source": "Patient information header", "confidence": "High"}

    gender_label = find_gender_label(text)
    if gender_label is not None:
        values["gender_label"] = {"value": gender_label, "label": "Sex/Gender", "source": "Patient information header", "confidence": "High"}
        values["gender_binary"] = {"value": 1 if gender_label == "Male" else 0, "label": "Sex/Gender", "source": "Patient information header", "confidence": "High"}

    for field, labels in REPORT_MARKERS[disease].items():
        if field == "age" and "age" in values:
            continue
        detail = find_marker_detail(text, labels)
        if detail is not None:
            values[field] = detail

    if disease == "Heart" and "fbs_value" in values:
        values["fbs"] = {
            "value": 1 if get_float(values["fbs_value"]["value"]) > 120 else 0,
            "label": "Derived from FBS",
            "source": f"FBS value {values['fbs_value']['value']}",
            "confidence": values["fbs_value"]["confidence"],
        }
    return values


def build_model_inputs(disease, raw_inputs):
    field_defaults = {field["key"]: field["default"] for field in FIELD_CONFIG[disease]}
    merged = {**field_defaults, **(raw_inputs or {})}
    values = {}
    for model_param, frontend_key in MODEL_PARAM_MAP[disease].items():
        default = field_defaults.get(frontend_key, 0)
        if isinstance(default, int):
            values[model_param] = get_int(merged.get(frontend_key), default)
        else:
            values[model_param] = get_float(merged.get(frontend_key), default)
    return values


def predict_disease(disease, input_values):
    if disease not in models:
        detail = model_load_errors.get(disease, f"{disease} model is not available.")
        raise HTTPException(status_code=503, detail=detail)

    info = models[disease]
    model = info["model"]
    features = info["features"]
    input_df = pd.DataFrame([input_values])[features]
    probability = model.predict_proba(input_df)[0]
    risk_percent = round(float(probability[1]) * 100, 2)

    if risk_percent >= 70:
        return "HIGH RISK", risk_percent, "Please consult a physician immediately.", "red"
    if risk_percent >= 40:
        return "MODERATE RISK", risk_percent, "Monitor your health and consult a doctor soon.", "orange"
    return "LOW RISK", risk_percent, "You appear healthy. Maintain a good lifestyle!", "green"


def build_analysis_rows(input_values):
    rows = []
    for param, value in input_values.items():
        if not isinstance(value, (int, float)) or param not in NORMAL_RANGES:
            continue
        low, high = NORMAL_RANGES[param]
        if value < low:
            status = "Below Normal"
        elif value > high:
            status = "Above Normal"
        else:
            status = "Normal"
        rows.append({"parameter": param, "value": value, "normalRange": f"{low} - {high}", "status": status})
    return rows


def build_chart_data(input_values):
    labels, values, normal_high, colors = [], [], [], []
    for param, value in input_values.items():
        if isinstance(value, (int, float)) and param in NORMAL_RANGES:
            low, high = NORMAL_RANGES[param]
            labels.append(param)
            values.append(value)
            normal_high.append(high)
            colors.append("#ff5a67" if value < low or value > high else "#27e7c2")
    return {"labels": labels, "values": values, "normalHigh": normal_high, "colors": colors}


def build_projection(risk_percent):
    return {
        "oneYear": round(min(99.0, risk_percent * 1.08 + 2), 2),
        "fiveYear": round(min(99.0, risk_percent * 1.22 + 6), 2),
        "tenYear": round(min(99.0, risk_percent * 1.38 + 10), 2),
    }


def generate_pdf_bytes(disease, input_values, risk_level, risk_percent, advice, rows):
    pdf = FPDF()
    pdf.add_page()
    data = ORGAN_DATA[disease]

    if risk_level == "HIGH RISK":
        r, g, b = 231, 76, 60
    elif risk_level == "MODERATE RISK":
        r, g, b = 243, 156, 18
    else:
        r, g, b = 39, 174, 96

    pdf.set_fill_color(5, 12, 24)
    pdf.rect(0, 0, 210, 42, "F")
    pdf.set_fill_color(39, 231, 194)
    pdf.rect(0, 40, 210, 2, "F")
    pdf.set_font("Helvetica", "B", 22)
    pdf.set_text_color(255, 255, 255)
    pdf.cell(0, 13, "", ln=True)
    pdf.cell(0, 13, "  BioPredict AI", ln=True)
    pdf.set_font("Helvetica", "", 11)
    pdf.set_text_color(190, 210, 230)
    pdf.cell(0, 7, "  Organ-level AI screening report", ln=True)

    pdf.set_font("Helvetica", "", 10)
    pdf.set_text_color(100, 100, 100)
    pdf.cell(0, 8, f"Generated: {datetime.now().strftime('%d %B %Y, %I:%M %p')}", ln=True)
    pdf.ln(3)

    pdf.set_font("Helvetica", "B", 16)
    pdf.set_text_color(5, 12, 24)
    pdf.cell(0, 9, f"{data['organ']} Risk Assessment", ln=True)
    pdf.set_font("Helvetica", "", 10)
    pdf.set_text_color(90, 100, 115)
    pdf.multi_cell(0, 6, data["summary"])
    pdf.ln(2)

    pdf.set_fill_color(r, g, b)
    pdf.set_text_color(255, 255, 255)
    pdf.set_font("Helvetica", "B", 13)
    pdf.cell(92, 14, f" Risk Level: {risk_level}", border=0, fill=True)
    pdf.cell(48, 14, f" Score: {risk_percent:.2f}%", border=0, fill=True, ln=True)
    pdf.ln(5)

    pdf.set_font("Helvetica", "B", 12)
    pdf.set_text_color(5, 12, 24)
    pdf.cell(0, 8, "Clinical Guidance", ln=True)
    pdf.set_font("Helvetica", "", 10)
    pdf.set_text_color(70, 82, 96)
    pdf.multi_cell(0, 6, advice)
    pdf.multi_cell(0, 6, f"Suggested specialist: {data['doctor']}. Useful follow-up tests: {data['tests']}.")
    pdf.ln(3)

    pdf.set_font("Helvetica", "B", 11)
    pdf.set_text_color(255, 255, 255)
    pdf.set_fill_color(5, 12, 24)
    pdf.cell(58, 9, "Parameter", border=1, fill=True)
    pdf.cell(38, 9, "Your Value", border=1, fill=True)
    pdf.cell(46, 9, "Normal Range", border=1, fill=True)
    pdf.cell(48, 9, "Status", border=1, fill=True, ln=True)

    pdf.set_font("Helvetica", "", 10)
    for row in rows:
        pdf.set_text_color(70, 82, 96)
        pdf.cell(58, 8, str(row["parameter"]), border=1)
        pdf.cell(38, 8, str(round(row["value"], 2)), border=1)
        pdf.cell(46, 8, str(row["normalRange"]), border=1)
        pdf.cell(48, 8, str(row["status"]), border=1, ln=True)

    pdf.ln(5)
    pdf.set_font("Helvetica", "B", 12)
    pdf.set_text_color(5, 12, 24)
    pdf.cell(0, 8, "Recommended Next Steps", ln=True)
    pdf.set_font("Helvetica", "", 10)
    pdf.set_text_color(70, 82, 96)
    for action in data["actions"]:
        pdf.multi_cell(0, 6, f"- {action}")

    pdf.ln(4)
    pdf.set_font("Helvetica", "I", 9)
    pdf.set_text_color(150, 150, 150)
    pdf.multi_cell(0, 6, "DISCLAIMER: This is an AI screening report only and is not a medical diagnosis. Always consult a qualified physician.")

    tmp = tempfile.NamedTemporaryFile(delete=False, suffix=".pdf")
    tmp_path = Path(tmp.name)
    tmp.close()
    pdf.output(str(tmp_path))
    pdf_bytes = tmp_path.read_bytes()
    tmp_path.unlink(missing_ok=True)
    return pdf_bytes


app = FastAPI(title="BioPredict AI API")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def startup_event():
    load_models()


@app.get("/api/health")
def health():
    return {
        "status": "ok",
        "modelDir": str(MODEL_DIR),
        "loadedModels": sorted(models.keys()),
        "modelErrors": model_load_errors,
    }


@app.post("/api/reload-models")
def reload_model_endpoint():
    load_models()
    return {
        "status": "reloaded",
        "loadedModels": sorted(models.keys()),
        "modelErrors": model_load_errors,
    }


@app.get("/api/config")
def config():
    return {"organs": ORGAN_DATA, "fields": FIELD_CONFIG, "modelErrors": model_load_errors}


@app.post("/api/extract-report")
async def extract_report(disease: str = Form(...), file: UploadFile = File(...)):
    if disease not in ORGAN_DATA:
        raise HTTPException(status_code=400, detail="Unknown disease module.")
    file_bytes = await file.read()
    text, report_id = extract_text_from_bytes(file_bytes, file.filename, file.content_type)
    details = parse_report_details(text, disease)
    values = {field: detail["value"] for field, detail in details.items()}
    return {
        "reportId": report_id,
        "textPreview": text[:2500],
        "values": values,
        "details": details,
    }


@app.post("/api/predict")
def predict(request: PredictionRequest):
    disease = request.disease
    if disease not in ORGAN_DATA:
        raise HTTPException(status_code=400, detail="Unknown disease module.")

    input_values = build_model_inputs(disease, request.inputs)
    risk_level, risk_percent, advice, color = predict_disease(disease, input_values)
    rows = build_analysis_rows(input_values)
    pdf_bytes = generate_pdf_bytes(disease, input_values, risk_level, risk_percent, advice, rows)
    return {
        "disease": disease,
        "organ": ORGAN_DATA[disease]["organ"],
        "riskLevel": risk_level,
        "riskPercent": risk_percent,
        "advice": advice,
        "color": color,
        "inputs": input_values,
        "analysisRows": rows,
        "chart": build_chart_data(input_values),
        "projection": build_projection(risk_percent),
        "signals": ORGAN_DATA[disease]["signals"],
        "actions": ORGAN_DATA[disease]["actions"],
        "doctor": ORGAN_DATA[disease]["doctor"],
        "tests": ORGAN_DATA[disease]["tests"],
        "pdfBase64": base64.b64encode(pdf_bytes).decode("ascii"),
        "pdfFilename": f"BioPredict_{disease}_Report.pdf",
    }


if FRONTEND_DIR.exists():
    app.mount("/", StaticFiles(directory=FRONTEND_DIR, html=True), name="frontend")
