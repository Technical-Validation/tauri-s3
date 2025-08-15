import { MainContent } from '../components/layout'
import { UploadZone, UploadQueue } from '../components/upload'
import { useConfigStore } from '../stores/configStore'
import { useUploadStore } from '../stores/uploadStore'

const UploadPage = () => {
  const { getActiveConfig } = useConfigStore()
  const { clearCompleted, tasks } = useUploadStore()
  const activeConfig = getActiveConfig()

  const completedTasks = tasks.filter(task => task.status === 'completed')

  const actions = (
    <div className="flex flex-col sm:flex-row gap-2">
      {completedTasks.length > 0 && (
        <button
          onClick={clearCompleted}
          className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
          清除已完成
        </button>
      )}
      <button className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
        上传设置
      </button>
    </div>
  )

  return (
    <MainContent
      title="文件上传"
      subtitle={`将文件上传到您的 S3 存储桶 ${activeConfig ? `(${activeConfig.name})` : ''}`}
      actions={actions}
    >
      <div className="space-y-6">
        {/* Upload Zone */}
        <div className="bg-white rounded-lg shadow">
          <UploadZone />
        </div>

        {/* Upload Queue */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">
              上传队列
            </h3>
          </div>
          <UploadQueue />
        </div>
      </div>
    </MainContent>
  )
}

export default UploadPage