import { useAppSelector } from '../store/hooks'

export const DashboardPage = () => {
  const { user } = useAppSelector((state) => state.auth)

  return (
    <div className="space-y-6 text-left">
      <div>
        <h1 className="text-2xl sm:text-3xl font-semibold text-gray-900 dark:text-gray-100 tracking-tight">
          Dashboard
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          User, role, and permission administration workspace.
        </p>
      </div>

      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6 sm:p-8 shadow-xs">
        <div className="py-8 text-center sm:text-left">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Welcome{user?.name ? `, ${user.name}` : ''}
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 max-w-xl">
            You are signed in to the administration portal.
          </p>
        </div>
      </div>
    </div>
  )
}
