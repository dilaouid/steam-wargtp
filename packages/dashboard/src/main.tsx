import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import { RouterProvider } from '@tanstack/react-router'
import { AuthWrapper, QueryClientWrapper } from '@steamwgp/shared-ui'

import { BASE_URL, router, SAME_SITE } from '@core'
import { queryClient } from '@core/queryClient'

import './index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientWrapper queryClient={queryClient}>
      <AuthWrapper Loader={() => <p></p>} baseUrl={BASE_URL} sameSite={SAME_SITE}>
        <RouterProvider router={router} />
      </AuthWrapper>
    </QueryClientWrapper>
  </StrictMode>,
)