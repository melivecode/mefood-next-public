import { FormControl, InputLabel, Select, SelectProps, FormControlProps } from '@mui/material'
import { useTheme } from '@mui/material/styles'
import { ReactNode } from 'react'

interface DarkSelectProps extends Omit<SelectProps, 'label'> {
  label: string
  children: ReactNode
  formControlProps?: FormControlProps
}

export function DarkSelect({ label, children, formControlProps, ...selectProps }: DarkSelectProps) {
  const theme = useTheme()

  const darkLabelSx = {
    color: theme.palette.text.primary,
    fontWeight: 500,
    '&.MuiInputLabel-shrunk': { color: theme.palette.text.primary },
    '&.Mui-focused': { color: theme.palette.text.primary }
  }

  const darkSelectSx = {
    '& .MuiSelect-select': {
      color: theme.palette.text.primary
    },
    ...selectProps.sx
  }

  return (
    <FormControl {...formControlProps}>
      <InputLabel sx={darkLabelSx}>
        {label}
      </InputLabel>
      <Select
        {...selectProps}
        label={label}
        sx={darkSelectSx}
      >
        {children}
      </Select>
    </FormControl>
  )
}