import React, { useState } from 'react';
import { UploadZone } from '../components/upload/UploadZone';
import { UploadQueue } from '../components/upload/UploadQueue';
import { UploadProgress } from '../components/upload/UploadProgress';
import { Button } from '../components/common/Button';
import { useUploadStore } from '../stores/uploadStore';

export const UploadDemo: React.FC = () => {
    const [showCompleted, setShowCompleted] = useState(false);
    const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
    const { tasks, statistics, setOptions, getOptions } = useUploadStore();

    const handleTaskAction = (taskId: string, action: string) => {
        console.log(`Task ${taskId} action: ${action}`);
        if (action === 'start' || action === 'retry') {
            setSelectedTaskId(taskId);
        }
    };

    const handleProgressUpdate = (progress: number, taskId?: string) => {
        console.log(`Progress update: ${progress}%${taskId ? ` for task ${taskId}` : ' overall'}`);
    };

    const handleMaxConcurrentChange = (value: number) => {
        setOptions({ maxConcurrentUploads: value });
    };

    return (
        <div className="min-h-screen bg-gray-50 py-8">
            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">
                        Upload Progress & Queue Management Demo
                    </h1>
                    <p className="text-gray-600">
                        Demonstration of real-time upload progress tracking and queue management features
                    </p>
                </div>

                {/* Configuration Panel */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
                    <h2 className="text-lg font-medium text-gray-900 mb-4">Upload Configuration</h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Max Concurrent Uploads
                            </label>
                            <select
                                value={getOptions().maxConcurrentUploads}
                                onChange={(e) => handleMaxConcurrentChange(Number(e.target.value))}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option value={1}>1</option>
                                <option value={2}>2</option>
                                <option value={3}>3</option>
                                <option value={5}>5</option>
                                <option value={10}>10</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Show Completed Tasks
                            </label>
                            <div className="flex items-center">
                                <input
                                    type="checkbox"
                                    checked={showCompleted}
                                    onChange={(e) => setShowCompleted(e.target.checked)}
                                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                />
                                <span className="ml-2 text-sm text-gray-700">
                                    Include completed tasks in queue
                                </span>
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Statistics
                            </label>
                            <div className="text-sm text-gray-600">
                                <div>Total: {statistics.totalFiles} files</div>
                                <div>Completed: {statistics.completedFiles}</div>
                                <div>Failed: {statistics.failedFiles}</div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Upload Zone */}
                    <div className="space-y-6">
                        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                            <h2 className="text-lg font-medium text-gray-900 mb-4">File Upload</h2>
                            <UploadZone
                                onFilesSelected={(files) => {
                                    console.log('Files selected:', files.length);
                                }}
                                className="h-48"
                            />
                        </div>

                        {/* Overall Progress */}
                        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                            <h2 className="text-lg font-medium text-gray-900 mb-4">Overall Progress</h2>
                            <UploadProgress
                                showDetails={true}
                                realTimeUpdates={true}
                                updateInterval={500}
                                onProgressUpdate={handleProgressUpdate}
                            />
                        </div>

                        {/* Individual Task Progress */}
                        {selectedTaskId && (
                            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                                <h2 className="text-lg font-medium text-gray-900 mb-4">
                                    Task Progress
                                </h2>
                                <UploadProgress
                                    taskId={selectedTaskId}
                                    showDetails={true}
                                    realTimeUpdates={true}
                                    updateInterval={250}
                                    onProgressUpdate={handleProgressUpdate}
                                />
                                <div className="mt-4">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => setSelectedTaskId(null)}
                                    >
                                        Clear Selection
                                    </Button>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Upload Queue */}
                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                        <h2 className="text-lg font-medium text-gray-900 mb-4">Upload Queue</h2>
                        <UploadQueue
                            showCompleted={showCompleted}
                            maxVisibleTasks={10}
                            autoRefresh={true}
                            refreshInterval={1000}
                            onTaskAction={handleTaskAction}
                        />
                    </div>
                </div>

                {/* Demo Actions */}
                <div className="mt-8 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <h2 className="text-lg font-medium text-gray-900 mb-4">Demo Actions</h2>
                    <div className="flex flex-wrap gap-3">
                        <Button
                            variant="outline"
                            onClick={() => {
                                // Add mock files for testing
                                const mockFiles = [
                                    new File(['test content 1'], 'test1.txt', { type: 'text/plain' }),
                                    new File(['test content 2'], 'test2.txt', { type: 'text/plain' }),
                                    new File(['test content 3'], 'test3.txt', { type: 'text/plain' }),
                                ];

                                const { addTasks } = useUploadStore.getState();
                                addTasks(mockFiles, 'demo/');
                            }}
                        >
                            Add Mock Files
                        </Button>

                        <Button
                            variant="outline"
                            onClick={() => {
                                // Add a large mock file for multipart upload demo
                                const largeContent = new Array(1024 * 1024).fill('x').join(''); // 1MB
                                const largeFile = new File([largeContent], 'large-file.txt', { type: 'text/plain' });

                                const { addTask } = useUploadStore.getState();
                                const taskId = addTask(largeFile, 'demo/large-file.txt');
                                setSelectedTaskId(taskId);
                            }}
                        >
                            Add Large File
                        </Button>

                        <Button
                            variant="outline"
                            onClick={() => {
                                // Simulate a failed upload for retry demo
                                const { addTask, updateTaskStatus } = useUploadStore.getState();
                                const taskId = addTask(
                                    new File(['failed content'], 'failed.txt', { type: 'text/plain' }),
                                    'demo/failed.txt'
                                );

                                setTimeout(() => {
                                    updateTaskStatus(taskId, 'failed', 'Simulated network error for demo');
                                }, 1000);
                            }}
                        >
                            Simulate Failed Upload
                        </Button>
                    </div>
                </div>

                {/* Feature Highlights */}
                <div className="mt-8 bg-blue-50 rounded-lg border border-blue-200 p-6">
                    <h2 className="text-lg font-medium text-blue-900 mb-4">
                        ✨ Enhanced Features Demonstrated
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-blue-800">
                        <div>
                            <h3 className="font-medium mb-2">Real-time Progress Display</h3>
                            <ul className="space-y-1 text-blue-700">
                                <li>• Live progress updates every 500ms</li>
                                <li>• Speed calculation and ETA</li>
                                <li>• Individual and overall progress tracking</li>
                                <li>• Visual progress bars with status colors</li>
                            </ul>
                        </div>
                        <div>
                            <h3 className="font-medium mb-2">Queue Management</h3>
                            <ul className="space-y-1 text-blue-700">
                                <li>• Pause/Resume individual uploads</li>
                                <li>• Cancel uploads with cleanup</li>
                                <li>• Retry failed uploads with backoff</li>
                                <li>• Concurrent upload limiting</li>
                            </ul>
                        </div>
                        <div>
                            <h3 className="font-medium mb-2">Error Handling</h3>
                            <ul className="space-y-1 text-blue-700">
                                <li>• Detailed error messages</li>
                                <li>• Automatic retry with exponential backoff</li>
                                <li>• Retry count tracking</li>
                                <li>• Graceful failure handling</li>
                            </ul>
                        </div>
                        <div>
                            <h3 className="font-medium mb-2">User Experience</h3>
                            <ul className="space-y-1 text-blue-700">
                                <li>• Responsive design</li>
                                <li>• Intuitive controls</li>
                                <li>• Status indicators</li>
                                <li>• Bulk operations support</li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default UploadDemo;