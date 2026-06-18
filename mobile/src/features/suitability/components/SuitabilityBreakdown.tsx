import { ChevronDown, ChevronUp, CircleAlert, CircleX } from 'lucide-react'
import { useMemo, useState } from 'react'
import { StatusDot } from '@/components/StatusDot'
import { Button } from '@/components/ui/button'
import type { SuitabilityCheck, SuitabilityStatus } from '../types'

interface SuitabilityBreakdownProps {
  checks: SuitabilityCheck[]
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

export function SuitabilityBreakdown({ checks }: SuitabilityBreakdownProps) {
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
