'use client'

import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Button, Container, Typography, Box } from "@mui/material"
import { Navbar } from '@/lib/components/Navbar'

export default function UnauthorizedPage() {
  const { data: session } = useSession()
  const router = useRouter()

  const handleGoBack = () => {
    // Since this is a single-tenant restaurant app, redirect to restaurant dashboard
    if (session?.user) {
      router.push("/restaurant")
    } else {
      router.push("/")
    }
  }

  return (
    <>
      <Navbar title="Unauthorized" color="error" />
      <Container maxWidth="sm" sx={{ mt: 8, textAlign: "center" }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h1" component="h1" sx={{ fontSize: "6rem", fontWeight: "bold", color: "error.main" }}>
          403
        </Typography>
        <Typography variant="h4" component="h2" gutterBottom>
          Access Denied
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
          You don&apos;t have permission to access this resource. Please contact your administrator if you believe this is an error.
        </Typography>
        <Button variant="contained" onClick={handleGoBack} size="large">
          Go Back to Dashboard
        </Button>
      </Box>
    </Container>
    </>
  )
}