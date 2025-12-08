import { TextField, TextFieldProps } from '@mui/material'
import { useTheme } from '@mui/material/styles'

export function DarkTextField(props: TextFieldProps) {
  const theme = useTheme()

  const darkLabelSx = {
    color: theme.palette.text.primary,
    fontWeight: 500,
    '&.MuiInputLabel-shrunk': { color: theme.palette.text.primary },
    '&.Mui-focused': { color: theme.palette.text.primary }
  }

  return (
    <TextField
      {...props}
      InputLabelProps={{
        ...props.InputLabelProps,
        sx: {
          ...darkLabelSx,
          ...props.InputLabelProps?.sx
        }
      }}
    />
  )
}