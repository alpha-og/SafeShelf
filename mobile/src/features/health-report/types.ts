export interface PersonalDetails {
  fullName?: string | null
  age?: number | null
  dateOfBirth?: string | null
  gender?: string | null
  dietaryPreferences?: string[] | null
}

export interface PhysicalMetrics {
  height?: number | null
  heightUnit?: string | null
  weight?: number | null
  weightUnit?: string | null
  bmi?: number | null
}

export interface MedicalConditions {
  diabetes?: boolean | null
  hypertension?: boolean | null
  highCholesterol?: boolean | null
  thyroidDisorder?: boolean | null
  heartDisease?: boolean | null
  kidneyDisease?: boolean | null
  /** Every condition listed in the report verbatim, including ones that also
   *  map to the booleans above. Free-text so nothing is dropped. */
  otherConditions?: string[] | null
}

export interface Allergies {
  peanut?: boolean | null
  milk?: boolean | null
  gluten?: boolean | null
  soy?: boolean | null
  egg?: boolean | null
  treeNuts?: boolean | null
  shellfish?: boolean | null
  otherAllergies?: string[] | null
}

export interface BloodPressure {
  systolic?: number | null
  diastolic?: number | null
}

export interface BloodSugar {
  fastingBloodSugar?: number | null
  fastingBloodSugarUnit?: string | null
  hba1c?: number | null
  hba1cUnit?: string | null
  randomBloodSugar?: number | null
  randomBloodSugarUnit?: string | null
}

export interface LipidProfile {
  totalCholesterol?: number | null
  totalCholesterolUnit?: string | null
  ldl?: number | null
  ldlUnit?: string | null
  hdl?: number | null
  hdlUnit?: string | null
  triglycerides?: number | null
  triglyceridesUnit?: string | null
}

export interface ThyroidProfile {
  tsh?: number | null
  tshUnit?: string | null
}

export interface HealthMetadata {
  reportDate?: string | null
  laboratory?: string | null
  uploadedAt?: string | null
}

export interface Confidence {
  overall?: string | null
  fields?: Record<string, string> | null
}

export interface HealthData {
  personalDetails?: PersonalDetails | null
  physicalMetrics?: PhysicalMetrics | null
  medicalConditions?: MedicalConditions | null
  allergies?: Allergies | null
  bloodPressure?: BloodPressure | null
  bloodSugar?: BloodSugar | null
  lipidProfile?: LipidProfile | null
  thyroidProfile?: ThyroidProfile | null
  metadata?: HealthMetadata | null
  confidence?: Confidence | null
}

export interface HealthReportUploadResponse {
  id: number
  extractedData: HealthData
}

export interface HealthReportSummary {
  id: number
  fileName: string
  reportDate: string | null
  laboratory: string | null
  createdAt: string
}

export type ReviewState =
  | { phase: 'idle' }
  | { phase: 'uploading'; progress: number }
  | { phase: 'processing' }
  | { phase: 'review'; data: HealthData; reportId: number }
  | { phase: 'error'; message: string }
