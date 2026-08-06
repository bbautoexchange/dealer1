import { useState } from 'react'

export type RetroSelectOption = { value: string; label: string }

type Props = {
  value: string
  options: RetroSelectOption[]
  onChange: (value: string) => void
  ariaLabel: string
}

export default function RetroSelect({ value, options, onChange, ariaLabel }: Props) {
  const [open, setOpen] = useState(false)
  const selected = options.find((option) => option.value === value)?.label ?? value

  return <div className="retro-select" onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false) }}>
    <button className="retro-select-toggle" type="button" aria-haspopup="listbox" aria-expanded={open} onClick={() => setOpen((current) => !current)} onKeyDown={(event) => { if (event.key === 'Escape') setOpen(false) }}>{selected}</button>
    {open && <div className="retro-select-options" role="listbox" aria-label={ariaLabel}>{options.map((option) => <button type="button" key={option.value} role="option" aria-selected={option.value === value} className={option.value === value ? 'selected' : ''} onClick={() => { onChange(option.value); setOpen(false) }}>{option.label}</button>)}</div>}
  </div>
}
