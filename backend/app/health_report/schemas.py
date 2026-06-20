from datetime import datetime

from pydantic import BaseModel


class PersonalDetails(BaseModel):
    fullName: str | None = None
    age: int | None = None
    dateOfBirth: str | None = None
    gender: str | None = None
    dietaryPreferences: list[str] | None = None


class PhysicalMetrics(BaseModel):
    height: float | None = None
    heightUnit: str | None = None
    weight: float | None = None
    weightUnit: str | None = None
    bmi: float | None = None


class MedicalConditions(BaseModel):
    diabetes: bool | None = None
    hypertension: bool | None = None
    highCholesterol: bool | None = None
    thyroidDisorder: bool | None = None
    heartDisease: bool | None = None
    kidneyDisease: bool | None = None
    otherConditions: list[str] | None = None


class Allergies(BaseModel):
    peanut: bool | None = None
    milk: bool | None = None
    gluten: bool | None = None
    soy: bool | None = None
    egg: bool | None = None
    treeNuts: bool | None = None
    shellfish: bool | None = None
    otherAllergies: list[str] | None = None


class BloodPressure(BaseModel):
    systolic: int | None = None
    diastolic: int | None = None


class BloodSugar(BaseModel):
    fastingBloodSugar: float | None = None
    fastingBloodSugarUnit: str | None = None
    hba1c: float | None = None
    hba1cUnit: str | None = None
    randomBloodSugar: float | None = None
    randomBloodSugarUnit: str | None = None


class LipidProfile(BaseModel):
    totalCholesterol: float | None = None
    totalCholesterolUnit: str | None = None
    ldl: float | None = None
    ldlUnit: str | None = None
    hdl: float | None = None
    hdlUnit: str | None = None
    triglycerides: float | None = None
    triglyceridesUnit: str | None = None


class ThyroidProfile(BaseModel):
    tsh: float | None = None
    tshUnit: str | None = None


class Metadata(BaseModel):
    reportDate: str | None = None
    laboratory: str | None = None
    uploadedAt: str | None = None


class Confidence(BaseModel):
    overall: str | None = None
    fields: dict[str, str] | None = None


class HealthDataExtraction(BaseModel):
    personalDetails: PersonalDetails | None = None
    physicalMetrics: PhysicalMetrics | None = None
    medicalConditions: MedicalConditions | None = None
    allergies: Allergies | None = None
    bloodPressure: BloodPressure | None = None
    bloodSugar: BloodSugar | None = None
    lipidProfile: LipidProfile | None = None
    thyroidProfile: ThyroidProfile | None = None
    metadata: Metadata | None = None
    confidence: Confidence | None = None


class HealthReportUploadResponse(BaseModel):
    id: int
    extractedData: HealthDataExtraction


class HealthReportSummary(BaseModel):
    id: int
    fileName: str
    reportDate: str | None = None
    laboratory: str | None = None
    createdAt: datetime
