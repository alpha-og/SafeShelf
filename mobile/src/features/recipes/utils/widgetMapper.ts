export type WidgetType = 'singleSelect' | 'multiSelect' | 'textInput' | 'numberInput' | 'booleanToggle'

export interface WidgetConfig {
  widget: WidgetType
  enum?: string[]
  minimum?: number
  maximum?: number
  maxLength?: number
}

export function inferWidget(schema: Record<string, unknown> | undefined | null): WidgetConfig {
  if (!schema) return { widget: 'textInput' }
  const type = schema.type as string | undefined
  const enumValues = schema.enum as string[] | undefined
  const items = schema.items as Record<string, unknown> | undefined

  if (type === 'array' && items?.type === 'string' && enumValues) {
    return { widget: 'multiSelect', enum: enumValues }
  }
  if (enumValues && (type === 'string' || !type)) {
    return { widget: 'singleSelect', enum: enumValues }
  }
  if (type === 'boolean') {
    return { widget: 'booleanToggle' }
  }
  if (type === 'integer' || type === 'number') {
    return {
      widget: 'numberInput',
      minimum: schema.minimum as number | undefined,
      maximum: schema.maximum as number | undefined,
    }
  }

  return {
    widget: 'textInput',
    maxLength: schema.maxLength as number | undefined,
  }
}
