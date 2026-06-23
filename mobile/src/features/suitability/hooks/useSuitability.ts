import { useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { ProductInfo } from '@/features/products/services/product'
import { getAccessToken } from '@/lib/axios'
import { apiError, warn } from '@/lib/logger'
import { getItem } from '@/lib/storage'
import { evaluateContext, getPerServingNutrients, mergeLocalAndAgentResults } from '../evaluate'
import { useAliases, useConditionRules } from '../services/rules'
import type {
  StepperState,
  SuitabilityCheck,
  SuitabilityContext,
  SuitabilityResult,
  UserProfile,
} from '../types'
import { useUserProfile } from './useUserProfile'

interface UseSuitabilityReturn {
  result: SuitabilityResult | null
  isLoading: boolean
  error: Error | null
  stepper: StepperState | null
  isAgentLoading: boolean
  agentError: (Error & { status?: number }) | null
  agentUsed: boolean
  triggerMode: 'auto' | 'manual'
  startAgentEval?: () => Promise<void>
}

export function useSuitability(
  product: ProductInfo | null,
  profile?: UserProfile | null,
  callAgent = true,
): UseSuitabilityReturn {
  const { data: autoContext, isLoading: profileLoading } = useUserProfile()
  const queryClient = useQueryClient()

  const [triggerMode, setTriggerMode] = useState<'auto' | 'manual'>('auto')

  useEffect(() => {
    async function loadSetting() {
      try {
        const mode = await getItem<'auto' | 'manual'>('agent_trigger_mode')
        if (mode) {
          setTriggerMode(mode)
        }
      } catch (err) {
        warn('loadTriggerMode', err)
      }
    }
    loadSetting()
  }, [])

  const context: SuitabilityContext | null = profile
    ? { profile, members: null }
    : (autoContext ?? null)
  const conditionCodes = context?.profile.conditionCodes ?? []

  const { rules, isLoading: rulesLoading, errors } = useConditionRules(conditionCodes)
  const { data: aliases, isLoading: aliasesLoading } = useAliases()

  const localResult = useMemo<SuitabilityResult | null>(() => {
    if (!product || !context) return null
    return evaluateContext(product, context, rules, aliases ?? {})
  }, [product, context, rules, aliases])

  const [agentChecks, setAgentChecks] = useState<SuitabilityCheck[]>([])
  const [isAgentLoading, setIsAgentLoading] = useState(false)
  const [agentError, setAgentError] = useState<(Error & { status?: number }) | null>(null)
  const [stepper, setStepper] = useState<StepperState | null>(null)
  const [agentUsed, setAgentUsed] = useState(false)

  // ⚡ 1. CIRCUIT BREAKER MEMORY TRACKERS
  const completedRef = useRef<'api_limit' | 'success' | 'failed' | null>(null)
  const lastEvalKeyRef = useRef<string | null>(null)

  const profileKey = [
    context?.profile?.conditionCodes.join(','),
    context?.profile?.allergens.join(','),
    context?.profile?.medications?.join(','),
    context?.profile?.age,
    context?.profile?.budget,
  ].join('|')

  const currentEvalKey = product ? `${product.barcode}-${profileKey}` : null

  if (currentEvalKey && lastEvalKeyRef.current !== currentEvalKey) {
    lastEvalKeyRef.current = currentEvalKey
    completedRef.current = null
  }

  const cacheKey = useMemo(
    () => ['suitability-agent', product?.barcode, profileKey],
    [product?.barcode, profileKey],
  )

  // Refs to access the latest values inside callbacks without triggering loop-re-renders
  const productRef = useRef(product)
  const contextRef = useRef(context)
  const localResultRef = useRef(localResult)
  const abortControllerRef = useRef<AbortController | null>(null)

  useEffect(() => {
    productRef.current = product
    contextRef.current = context
    localResultRef.current = localResult
  })

  // ⚡ 2. MEMOIZED EXECUTION WRAPPER
  const startAgentEval = useCallback(async () => {
    const currentProduct = productRef.current
    const currentContext = contextRef.current
    const currentLocalResult = localResultRef.current

    if (!currentProduct || !currentContext || !currentLocalResult) return
    const nameLower = currentProduct.productName?.toLowerCase()
    if (nameLower?.includes('water') || nameLower?.includes('bisleri')) return

    setIsAgentLoading(true)
    setAgentError(null)
    setAgentUsed(true)

    const stepperState: StepperState = {
      basic_metrics: 'pass',
      basic_metrics_summary: 'Initializing guideline verification...',
      ingredient_analysis: 'running',
      ingredient_analysis_summary: 'Analyzing raw ingredients for derivatives...',
      medication_check: 'pending',
      medication_check_summary: 'Checking medication-nutrient interactions...',
    }
    setStepper({ ...stepperState })

    const perServingNutrients = getPerServingNutrients(currentProduct, currentContext.profile)
    const healthData = currentContext.profile.healthData

    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    const controller = new AbortController()
    abortControllerRef.current = controller

    try {
      const token = getAccessToken()
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      }
      if (token) {
        headers['Authorization'] = `Bearer ${token}`
      }

      // NOTE: Using the correct backend endpoint path `/v1/analysis/deep-evaluate`
      const response = await fetch('/v1/analysis/deep-evaluate', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          product: currentProduct,
          user_profile: currentContext.profile,
          per_serving_nutrients: perServingNutrients,
          health_data: healthData,
          local_evaluation_result: currentLocalResult,
        }),
        signal: controller.signal,
      })

      if (!response.ok) {
        let errorMessage = `Cloud AI analysis is temporarily unavailable (HTTP ${response.status})`
        try {
          const errorJson = await response.json()
          if (errorJson?.detail) errorMessage = errorJson.detail
          else if (errorJson?.message) errorMessage = errorJson.message
        } catch {}

        const errorObj = new Error(errorMessage) as any
        errorObj.status = response.status
        throw errorObj
      }

      const reader = response.body?.getReader()
      if (!reader) {
        throw new Error('Streaming response reader is not supported')
      }

      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { value, done } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''

        for (const line of lines) {
          const trimmed = line.trim()
          if (!trimmed) continue

          if (trimmed.startsWith('data: ')) {
            const dataStr = trimmed.slice(6).trim()
            if (!dataStr) continue

            let parsed: any = null
            try {
              parsed = JSON.parse(dataStr)
            } catch (e) {
              warn('parseSSEEvent', e)
              continue
            }

            if (!parsed) continue

            if (parsed.event === 'phase') {
              const { phase, status, summary } = parsed
              if (
                phase === 'basic_metrics' ||
                phase === 'ingredient_analysis' ||
                phase === 'medication_check'
              ) {
                const phaseKey = phase as
                  | 'basic_metrics'
                  | 'ingredient_analysis'
                  | 'medication_check'
                stepperState[phaseKey] = status
                if (phase === 'basic_metrics') {
                  stepperState.basic_metrics_summary = summary
                } else if (phase === 'ingredient_analysis') {
                  stepperState.ingredient_analysis_summary = summary
                } else if (phase === 'medication_check') {
                  stepperState.medication_check_summary = summary
                }
                setStepper({ ...stepperState })
              }
            } else if (parsed.event === 'result') {
              const checks = parsed.checks ?? []
              setAgentChecks(checks)

              // Cache both checks and final stepper state
              queryClient.setQueryData(cacheKey, { checks, stepper: stepperState })
              completedRef.current = 'success'
            } else if (parsed.event === 'error') {
              const innerError = new Error(
                parsed.detail || 'An error occurred during AI analysis',
              ) as any
              innerError.status = parsed.status || 500
              throw innerError
            }
          }
        }
      }
    } catch (err: any) {
      if (err.name === 'AbortError') return
      apiError('agentEval', err)

      const targetStatus = err.status || 500

      const errorObj = new Error(err.message || String(err)) as any
      errorObj.status = targetStatus
      setAgentError(errorObj)

      setStepper((prev) => {
        if (!prev) return prev
        const updated = { ...prev }
        const fallbackMsg =
          'Advanced AI verification is temporarily unavailable. Running on your baseline safety profile.'
        if (updated.ingredient_analysis === 'running') {
          updated.ingredient_analysis = 'fail'
          updated.ingredient_analysis_summary = fallbackMsg
        } else if (updated.medication_check === 'running') {
          updated.medication_check = 'fail'
          updated.medication_check_summary = fallbackMsg
        } else if (updated.basic_metrics === 'running') {
          updated.basic_metrics = 'fail'
          updated.basic_metrics_summary = fallbackMsg
        }
        return updated
      })

      if (targetStatus === 429 || targetStatus === 403) {
        completedRef.current = 'api_limit'
      } else {
        completedRef.current = 'failed'
      }
    } finally {
      setIsAgentLoading(false)
    }
  }, [cacheKey, queryClient])

  // ⚡ 3. DOCK CONTROL LIFECYCLE EFFECT
  useEffect(() => {
    const nameLower = product?.productName?.toLowerCase()
    if (
      !product ||
      !context ||
      !localResult ||
      nameLower?.includes('water') ||
      nameLower?.includes('bisleri')
    ) {
      setAgentChecks([])
      setIsAgentLoading(false)
      setAgentError(null)
      setStepper(null)
      setAgentUsed(false)
      return
    }

    const hasAllergenFail = localResult.checks.some(
      (c) => c.status === 'fail' && (c.type === 'allergen' || c.type === 'traces'),
    )

    // Check if we have a cached result first
    const cached = queryClient.getQueryData<any>(cacheKey)
    if (cached) {
      if (Array.isArray(cached)) {
        setAgentChecks(cached)
      } else if (cached && typeof cached === 'object') {
        setAgentChecks(cached.checks ?? [])
        if (cached.stepper) {
          setStepper(cached.stepper)
        }
      }
      setIsAgentLoading(false)
      setAgentError(null)
      setAgentUsed(true)
      completedRef.current = 'success'
      return
    }

    if (
      !callAgent ||
      hasAllergenFail ||
      completedRef.current === 'api_limit' ||
      completedRef.current === 'success'
    ) {
      if (hasAllergenFail || !callAgent) {
        setAgentChecks([])
        setIsAgentLoading(false)
        setAgentError(null)
        setStepper(null)
        setAgentUsed(false)
      }
      return
    }

    // ⚡ If manual trigger mode is enabled, wait for manual trigger!
    if (triggerMode === 'manual') {
      setIsAgentLoading(false)
      return
    }

    startAgentEval()

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [
    product?.barcode,
    profileKey,
    callAgent,
    localResult === null,
    startAgentEval,
    queryClient,
    cacheKey,
    triggerMode,
  ])

  const result = useMemo<SuitabilityResult | null>(() => {
    if (!localResult) return null
    if (agentChecks.length === 0) return localResult
    return mergeLocalAndAgentResults(localResult, agentChecks)
  }, [localResult, agentChecks])

  return {
    result,
    isLoading: profileLoading || rulesLoading || aliasesLoading,
    error: errors.length > 0 ? (errors[0] as Error) : null,
    stepper,
    isAgentLoading,
    agentError,
    agentUsed,
    triggerMode,
    startAgentEval:
      product?.productName?.toLowerCase().includes('water') ||
      product?.productName?.toLowerCase().includes('bisleri')
        ? undefined
        : startAgentEval,
  }
}
