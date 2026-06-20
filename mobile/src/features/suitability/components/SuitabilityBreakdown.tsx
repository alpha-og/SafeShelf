import {
  ChevronDown,
  ChevronUp,
  CircleAlert,
  CircleX,
  CheckCircle2,
  Loader2,
  Circle,
  AlertTriangle,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import { StatusDot } from '@/components/StatusDot'
import { Button } from '@/components/ui/button'
import type { SuitabilityCheck, SuitabilityStatus, StepperState, StepperPhase } from '../types'

interface SuitabilityBreakdownProps {
  checks: SuitabilityCheck[]
  isAgentLoading?: boolean
  stepper?: StepperState | null
  agentError?: Error | null
  agentUsed?: boolean
}

interface GroupInfo {
  name: string
  status: SuitabilityStatus
  checks: SuitabilityCheck[]
}

const GROUP_ORDER = ['Allergens', 'Dietary preferences']

function groupSort(a: GroupInfo, b: GroupInfo): number {
  const aIdx = GROUP_ORDER.indexOf(a.name)
  const bIdx = GROUP_ORDER.indexOf(b.name)
  if (aIdx !== -1 && bIdx !== -1) return aIdx - bIdx
  if (aIdx !== -1) return -1
  if (bIdx !== -1) return 1
  return a.name.localeCompare(b.name)
}

function ChecksList({ checks }: { checks: SuitabilityCheck[] }) {
  const groups = useMemo(() => {
    const map = new Map<string, SuitabilityCheck[]>()
    for (const check of checks) {
      const key = check.group ?? 'Other'
      if (!map.has(key)) map.set(key, [])
      map.get(key)?.push(check)
    }

    const result: GroupInfo[] = []
    for (const [name, groupChecks] of map) {
      const status: SuitabilityStatus = groupChecks.some((c) => c.status === 'fail')
        ? 'fail'
        : groupChecks.some((c) => c.status === 'warn')
          ? 'warn'
          : 'pass'
      result.push({ name, status, checks: groupChecks })
    }

    result.sort(groupSort)
    return result
  }, [checks])

  const [openGroups, setOpenGroups] = useState<Set<string>>(() => {
    const initial = new Set<string>()
    for (const group of groups) {
      if (group.status !== 'pass') initial.add(group.name)
    }
    return initial
  })

  const toggleGroup = (name: string) => {
    setOpenGroups((prev) => {
      const next = new Set(prev)
      if (next.has(name)) next.delete(name)
      else next.add(name)
      return next
    })
  }

  if (!checks.length) return null

  return (
    <div className="space-y-0.5">
      {groups.map((group) => {
        const hasIssues = group.status !== 'pass'

        if (!hasIssues) {
          return (
            <div key={group.name} className="flex items-center gap-2 px-2 py-1">
              <StatusDot status={group.status} />
              <span className="text-sm font-medium text-foreground">{group.name}</span>
            </div>
          )
        }

        const isOpen = hasIssues && openGroups.has(group.name)

        return (
          <div key={group.name}>
            <Button
              variant="ghost"
              onClick={() => toggleGroup(group.name)}
              className="w-full flex items-center justify-between gap-2 h-auto py-1.5 px-2 text-foreground hover:text-foreground hover:scale-[1.01]"
            >
              <span className="flex items-center gap-2">
                <StatusDot status={group.status} />
                <span className="text-sm font-medium text-foreground">{group.name}</span>
              </span>
              {isOpen ? (
                <ChevronUp className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              ) : (
                <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              )}
            </Button>
            {isOpen && (
              <div className="ml-4 pl-3 border-l-2 border-border space-y-1.5 pb-1.5">
                {group.checks
                  .filter((c) => c.status !== 'pass')
                  .map((check) => (
                    <div
                      key={`${check.type}:${check.label}`}
                      className="flex items-start gap-2 text-sm py-0.5"
                    >
                      {check.status === 'fail' ? (
                        <CircleX className="h-3.5 w-3.5 mt-0.5 shrink-0 text-[#B46A72]" />
                      ) : (
                        <CircleAlert className="h-3.5 w-3.5 mt-0.5 shrink-0 text-[#F7C8D3]" />
                      )}
                      <div className="min-w-0">
                        <p className="font-medium text-foreground leading-tight">{check.label}</p>
                        <p className="text-muted-foreground text-xs mt-0.5">{check.detail}</p>
                        {check.owners && check.owners.length > 0 && (
                          <div className="flex flex-wrap items-center gap-1 mt-1.5">
                            <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                              Affects
                            </span>
                            {check.owners.map((owner) => (
                              <span
                                key={owner}
                                className="inline-flex items-center rounded-full bg-muted/60 px-2 py-0.5 text-[11px] font-medium text-foreground"
                              >
                                {owner}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

export function SuitabilityBreakdown({
  checks,
  isAgentLoading = false,
  stepper = null,
  agentError = null,
  agentUsed = false,
}: SuitabilityBreakdownProps) {
  const localChecks = useMemo(() => checks.filter((c) => c.type !== 'agent_insight'), [checks])
  const agentChecks = useMemo(() => checks.filter((c) => c.type === 'agent_insight'), [checks])

  const renderStepIcon = (phase: StepperPhase) => {
    if (phase === 'pass') {
      return <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
    }
    if (phase === 'fail') {
      return <CircleX className="h-4 w-4 text-rose-500 shrink-0 mt-0.5" />
    }
    if (phase === 'warn') {
      return <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
    }
    if (phase === 'running') {
      return <Loader2 className="h-4 w-4 text-primary animate-spin shrink-0 mt-0.5" />
    }
    return <Circle className="h-4 w-4 text-muted-foreground/40 shrink-0 mt-0.5" />
  }

  return (
    <div className="space-y-4">
      {/* 1. Local Rules Verification Card */}
      {localChecks.length > 0 && (
        <div className="border border-border rounded-xl p-4 bg-card shadow-xs space-y-3">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            On-Device Analysis
          </h3>
          <ChecksList checks={localChecks} />
        </div>
      )}

      {/* 2. AI Deep Analysis Card */}
      {(isAgentLoading || agentError || agentChecks.length > 0 || agentUsed) && (
        <div className="border border-border rounded-xl p-4 bg-card shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              AI Clinical Nutrition Insights
            </h3>
            {isAgentLoading && (
              <span className="text-[10px] bg-primary/10 text-primary font-medium px-2 py-0.5 rounded-full animate-pulse">
                AI Agent Active
              </span>
            )}
          </div>

          {/* Stepper with descriptive summaries */}
          {stepper && (
            <div className="bg-muted/40 rounded-lg p-3 space-y-3 border border-border/50">
              <div className="flex items-start gap-3 text-xs">
                {renderStepIcon(stepper.basic_metrics)}
                <div className="min-w-0">
                  <p className={`font-semibold ${stepper.basic_metrics === 'pass' ? 'text-foreground' : 'text-muted-foreground'}`}>
                    Nutrient Verification
                  </p>
                  <p className="text-muted-foreground text-[11px] mt-0.5 leading-normal">
                    {stepper.basic_metrics_summary || 'Verifying personalized rules (sodium, sugars, fats)...'}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3 text-xs">
                {renderStepIcon(stepper.ingredient_analysis)}
                <div className="min-w-0">
                  <p className={`font-semibold ${stepper.ingredient_analysis === 'pass' ? 'text-foreground' : 'text-muted-foreground'}`}>
                    Raw Ingredient Evaluation
                  </p>
                  <p className="text-muted-foreground text-[11px] mt-0.5 leading-normal">
                    {stepper.ingredient_analysis_summary || 'Analyzing raw ingredient text for derivatives...'}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3 text-xs">
                {renderStepIcon(stepper.medication_check)}
                <div className="min-w-0">
                  <p className={`font-semibold ${stepper.medication_check === 'pass' ? 'text-foreground' : 'text-muted-foreground'}`}>
                    Medication Interaction Check
                  </p>
                  <p className="text-muted-foreground text-[11px] mt-0.5 leading-normal">
                    {stepper.medication_check_summary || 'Checking medication-food interactions...'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Error Fallback Box */}
          {agentError && (
            <div className="flex items-start gap-3 bg-amber-500/10 border border-amber-500/25 rounded-lg p-3.5">
              <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <h4 className="text-sm font-semibold text-amber-500 leading-none">
                  AI Insights Temporarily Unavailable
                </h4>
                <p className="text-xs text-muted-foreground leading-normal">
                  Local mathematical safety checks remain fully active.
                </p>
              </div>
            </div>
          )}

          {/* Agent checks results */}
          {!isAgentLoading && !agentError && agentChecks.length > 0 && (
            <ChecksList checks={agentChecks} />
          )}

          {/* Agent finished but no warnings (passed all deep checks) */}
          {!isAgentLoading && !agentError && agentUsed && agentChecks.length === 0 && (
            <div className="flex items-center gap-2 px-2 py-1">
              <StatusDot status="pass" />
              <span className="text-sm font-medium text-foreground">
                All deep clinical nutrition guidelines met
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
