import { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useConfigStore } from '../../stores/configStore'

interface ProtectedRouteProps {
    children: ReactNode
    redirectTo?: string
}

const ProtectedRoute = ({ children, redirectTo = '/' }: ProtectedRouteProps) => {
    const { getActiveConfig } = useConfigStore()
    const activeConfig = getActiveConfig()

    if (!activeConfig) {
        return <Navigate to={redirectTo} replace />
    }

    return <>{children}</>
}

export default ProtectedRoute