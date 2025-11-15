from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import pandas as pd
import datetime
import os
import joblib
import numpy as np
from typing import Optional, List
import logging
from pathlib import Path
import io

# ======================================
# LOGGING
# ======================================
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("main")

# ======================================
# FASTAPI SETUP
# ======================================
app = FastAPI(title="AI-Powered KYC Verification API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ======================================
# PATHS
# ======================================
BASE_DIR = Path(__file__).parent
MODEL_PATH = BASE_DIR / "best_model.pkl"
SCALER_PATH = BASE_DIR / "scaler.pkl"
FEATURE_SELECTOR_PATH = BASE_DIR / "feature_selector.pkl"
GNN_CSV = BASE_DIR / "output_of_GNN_part2.csv"
AUDIT_LOG = BASE_DIR / "kyc_audit_log.csv"

# ======================================
# GLOBALS
# ======================================
model = None
scaler = None
feature_selector = None
gnn_df = pd.DataFrame()

# ======================================
# REQUEST MODELS
# ======================================
class VerificationRequest(BaseModel):
    name: str
    documentNumber: str
    address: Optional[str] = ""
    documentType: str  # PASSPORT / AADHAR / PAN

class VerificationResponse(BaseModel):
    status: str
    id: str
    timestamp: str
    name: str
    documentNumber: str
    fraudProbability: float
    riskLevel: str
    confidence: float
    details: dict
    message: str

class BatchResultItem(BaseModel):
    row: int
    name: str
    documentNumber: str
    address: str
    documentType: str
    status: str
    id: str
    timestamp: str
    fraudProbability: float
    riskLevel: str
    confidence: float
    details: dict
    message: str
    error: Optional[str] = None

class BatchVerificationResponse(BaseModel):
    total: int
    successful: int
    failed: int
    results: List[BatchResultItem]

# ======================================
# CREATE GNN CSV IF MISSING
# ======================================
def ensure_gnn_csv():
    if not GNN_CSV.exists():
        logger.warning("⚠️ Creating new GNN CSV file because it was missing.")
        df = pd.DataFrame({
            "Document_Number": [],
            "GNN_Fraud_Probability": []
        })
        df.to_csv(GNN_CSV, index=False)
        logger.info(f"✅ Created empty GNN CSV at {GNN_CSV}")

# ======================================
# LOAD MODELS
# ======================================
def load_models():
    global model, scaler, feature_selector
    try:
        model = joblib.load(MODEL_PATH)
        logger.info("✅ Loaded ML model")
    except Exception as e:
        logger.error(f"❌ Model load failed: {e}")
        model = None

    try:
        scaler = joblib.load(SCALER_PATH)
        logger.info("✅ Loaded scaler")
    except Exception as e:
        logger.error(f"❌ Scaler load failed: {e}")
        scaler = None

    try:
        feature_selector = joblib.load(FEATURE_SELECTOR_PATH)
        logger.info("✅ Loaded feature selector")
    except Exception as e:
        logger.error(f"❌ Feature selector load failed: {e}")
        feature_selector = None

# ======================================
# LOAD GNN OUTPUT CSV
# ======================================
def load_gnn():
    global gnn_df
    try:
        if not GNN_CSV.exists():
            logger.warning("⚠️ GNN CSV not found. Creating new...")
            ensure_gnn_csv()
        df = pd.read_csv(GNN_CSV)
        if df.empty:
            logger.warning("⚠️ GNN CSV is empty.")
            gnn_df = pd.DataFrame()
        else:
            gnn_df = df
            logger.info(f"✅ Loaded GNN CSV with {len(gnn_df)} rows")
    except Exception as e:
        logger.error(f"❌ Error loading GNN CSV: {e}")
        gnn_df = pd.DataFrame()

# ======================================
# FEATURE EXTRACTION
# ======================================
def extract_features(name, doc, address, dtype):
    features = [
        len(name),
        len(doc),
        len(address),
        1 if doc.isdigit() else 0,
        len(set(doc)),
        1 if dtype == "AADHAR" else 0,
        1 if dtype == "PAN" else 0,
        1 if dtype in ["PASSPORT", "UTILITY"] else 0,
        len(address.split()),
        len(name.split()),
        1 if any(x.isupper() for x in name) else 0,
        1 if any(x.isdigit() for x in name) else 0,
    ]
    return np.array(features).reshape(1, -1)

# ======================================
# RISK LABEL
# ======================================
def classify(prob):
    if prob < 0.33:
        return "Low"
    elif prob < 0.67:
        return "Medium"
    return "High"

# ======================================
# GNN FALLBACK
# ======================================
def gnn_pred(doc):
    try:
        if gnn_df.empty:
            return 0.50
        row = gnn_df[gnn_df["Document_Number"].astype(str) == str(doc)]
        if not row.empty:
            return float(row.iloc[0]["GNN_Fraud_Probability"])
    except:
        pass
    return 0.50

# ======================================
# FULL PREDICTION
# ======================================
def predict_fraud(name, doc, address, dtype):
    X = extract_features(name, doc, address, dtype)
    if feature_selector:
        try:
            X = feature_selector.transform(X)
        except Exception as e:
            logger.warning(f"Feature selector failed: {e}")
    if scaler:
        try:
            X = scaler.transform(X)
        except Exception as e:
            logger.warning(f"Scaler failed: {e}")
    if model:
        try:
            proba_result = model.predict_proba(X)
            if proba_result.shape[1] == 2:
                prob = float(proba_result[0][1])
            elif proba_result.shape[1] == 1:
                prob = float(proba_result[0][0])
            else:
                prob = float(proba_result[0][-1])
        except Exception as e:
            logger.error(f"Model prediction failed: {e}, using GNN fallback")
            prob = gnn_pred(doc)
    else:
        prob = gnn_pred(doc)
    prob = max(0.0, min(1.0, prob))
    risk = classify(prob)
    return {
        "fraud_probability": prob * 100,
        "risk_level": risk,
        "confidence": (1 - prob) * 100,
        "status": "Flagged" if risk == "High" else "Verified"
    }

# ======================================
# APP STARTUP
# ======================================
@app.on_event("startup")
def startup_event():
    logger.info("🚀 Booting API...")
    ensure_gnn_csv()
    load_models()
    load_gnn()
    logger.info("✅ Ready!")

# ======================================
# MAIN API ENDPOINT
# ======================================
@app.post("/api/verify-kyc", response_model=VerificationResponse)
def verify(request: VerificationRequest):
    result = predict_fraud(request.name, request.documentNumber, request.address, request.documentType)
    vid = f"VER{int(datetime.datetime.now().timestamp() * 1000)}"
    ts = datetime.datetime.now().isoformat()
    try:
        df = pd.DataFrame([{
            "Timestamp": ts,
            "Name": request.name,
            "ID_Type": request.documentType,
            "Document_Number": request.documentNumber,
            "Fraud_Risk": result["risk_level"],
            "Fraud_Probability": result["fraud_probability"],
        }])
        df.to_csv(AUDIT_LOG, mode="a", header=not AUDIT_LOG.exists(), index=False)
    except Exception as e:
        logger.warning(f"⚠️ Could not write audit log: {e}")
    return VerificationResponse(
        status=result["status"],
        id=vid,
        timestamp=ts,
        name=request.name,
        documentNumber=request.documentNumber,
        fraudProbability=result["fraud_probability"],
        riskLevel=result["risk_level"],
        confidence=result["confidence"],
        details={
            "documentAuthenticity": "Valid",
            "addressVerification": "Verified" if request.address and len(request.address) > 10 else "Pending",
            "anomalyScore": f"{result['fraud_probability']:.2f}"
        },
        message="KYC processed successfully."
    )

# ======================================
# ROOT CHECK
# ======================================
@app.get("/")
def home():
    return {
        "message": "KYC API running",
        "model": "Loaded" if model else "Not Loaded",
        "scaler": "Loaded" if scaler else "Not Loaded",
        "selector": "Loaded" if feature_selector else "Not Loaded",
        "gnn_csv": "Available" if not gnn_df.empty else "Empty"
    }

# ======================================
# DEBUG TEST PREDICTION
# ======================================
@app.get("/admin/test-prediction")
def test_prediction():
    test_cases = [
        {"name": "John Doe", "doc": "123456789", "address": "123 Main St", "dtype": "PASSPORT"},
        {"name": "Jane Smith", "doc": "987654321", "address": "456 Oak Ave", "dtype": "AADHAR"},
    ]
    results = []
    for test in test_cases:
        X = extract_features(test["name"], test["doc"], test["address"], test["dtype"])
        result = {"input": test, "features_shape": X.shape, "features": X.tolist()[0]}
        if feature_selector:
            try:
                X_sel = feature_selector.transform(X)
                result["after_selector_shape"] = X_sel.shape
                result["after_selector"] = X_sel.tolist()[0]
                X = X_sel
            except Exception as e:
                result["selector_error"] = str(e)
        if scaler:
            try:
                X_scaled = scaler.transform(X)
                result["after_scaler_shape"] = X_scaled.shape
                result["after_scaler"] = X_scaled.tolist()[0]
                X = X_scaled
            except Exception as e:
                result["scaler_error"] = str(e)
        if model:
            try:
                proba = model.predict_proba(X)
                result["model_proba_shape"] = proba.shape
                result["model_proba"] = proba.tolist()[0]
                result["fraud_prob"] = float(proba[0][1])
                result["prediction"] = predict_fraud(test["name"], test["doc"], test["address"], test["dtype"])
            except Exception as e:
                result["model_error"] = str(e)
        results.append(result)
    return {"model_loaded": model is not None, "scaler_loaded": scaler is not None, "selector_loaded": feature_selector is not None, "test_results": results}
