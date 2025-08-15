import { useNavigate, useLocation } from 'react-router-dom'
import { useConfigStore } from '../stores/configStore'

export const useNavigation = () => {
    const navigate = useNavigate()
    const location = useLocation()
    const { getActiveConfig } = useConfigStore()

    const navigateToConfig = () => navigate('/')
    const navigateToFiles = () => navigate('/files')
    const navigateToUpload = () => navigate('/upload')
    const navigateToDownloads = () => navigate('/downloads')

    const canNavigateToProtectedRoute = () => {
        return !!getActiveConfig()
    }

    const navigateWithConfigCheck = (path: string) => {
        if (canNavigateToProtectedRoute()) {
            navigate(path)
        } else {
            // Redirect to config page if no active config
            navigate('/')
        }
    }

    const isCurrentPath = (path: string) => {
        return location.pathname === path
    }

    return {
        navigate,
        location,
        navigateToConfig,
        navigateToFiles,
        navigateToUpload,
        navigateToDownloads,
        navigateWithConfigCheck,
        canNavigateToProtectedRoute,
        isCurrentPath,
        currentPath: location.pathname
    }
}