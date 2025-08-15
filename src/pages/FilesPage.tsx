import { MainContent } from '../components/layout'
import { FileBrowser } from '../components/files'
import { useConfigStore } from '../stores/configStore'

const FilesPage = () => {
  const { getActiveConfig } = useConfigStore()
  const activeConfig = getActiveConfig()

  const actions = (
    <div className="flex flex-col sm:flex-row gap-2">
      <button className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
        </svg>
        新建文件夹
      </button>
      <button className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
        刷新
      </button>
    </div>
  )

  return (
    <MainContent
      title="文件浏览"
      subtitle={`浏览和管理您的 S3 存储桶中的文件 ${activeConfig ? `(${activeConfig.name})` : ''}`}
      actions={actions}
    >
      <div className="bg-white rounded-lg shadow">
        <FileBrowser />
      </div>
    </MainContent>
  )
}

export default FilesPage