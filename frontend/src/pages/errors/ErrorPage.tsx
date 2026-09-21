import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, RefreshCw, Home, HelpCircle } from 'lucide-react'
import { ERROR_DETAILS, type ErrorStatusCode } from './errorConfig'

interface ErrorPageProps {
  code?: ErrorStatusCode
}

export const ErrorPage = ({ code }: ErrorPageProps) => {
  const params = useParams<{ code?: string }>()
  const navigate = useNavigate()

  // Determine status code from prop, params, or default to 404
  const parsedCode = Number(code || params.code) as ErrorStatusCode
  const details = ERROR_DETAILS[parsedCode] || ERROR_DETAILS[404]

  const IconComponent = details.icon
  const isServerError = details.type === 'server'

  const handleRetry = () => {
    window.location.reload()
  }

  const handleGoBack = () => {
    if (window.history.length > 2) {
      navigate(-1)
    } else {
      navigate('/')
    }
  }

  return (
    <div className="w-full max-w-xl mx-auto py-6 text-center">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 p-8 sm:p-12 relative overflow-hidden transition-colors">
        {/* Subtle Watermark Status Code */}
        <div className="absolute top-2 right-4 text-7xl sm:text-8xl font-black tracking-tighter text-gray-100/80 dark:text-gray-800/40 font-mono select-none pointer-events-none">
          {details.statusCode}
        </div>

        {/* Status Icon */}
        <div className="relative z-10 mb-6">
          <div
            className={`w-16 h-16 mx-auto rounded-2xl flex items-center justify-center shadow-xs border ${
              isServerError
                ? 'bg-red-50 dark:bg-red-950/60 text-red-600 dark:text-red-400 border-red-200/80 dark:border-red-900/50 shadow-red-500/10'
                : 'bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border-blue-200/80 dark:border-blue-900/50 shadow-blue-500/10'
            }`}
          >
            <IconComponent className="w-8 h-8 stroke-[1.75]" />
          </div>
        </div>

        {/* Clean Headings - No badges attached */}
        <div className="relative z-10 mb-6">
          <h1 className="text-2xl sm:text-3xl font-semibold text-gray-900 dark:text-gray-100 tracking-tight">
            {details.title}
          </h1>
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mt-1">
            {details.subtitle}
          </p>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400 leading-relaxed max-w-md mx-auto">
            {details.description}
          </p>
        </div>

        {/* Helpful Tips Box */}
        <div className="relative z-10 mb-8 p-4 rounded-xl bg-gray-50 dark:bg-gray-800/70 border border-gray-200/80 dark:border-gray-800 text-left flex items-start gap-3 text-xs text-gray-600 dark:text-gray-400">
          <HelpCircle className="w-4 h-4 text-gray-400 dark:text-gray-500 shrink-0 mt-0.5" />
          <div>
            <span className="font-medium text-gray-800 dark:text-gray-200">Troubleshooting Suggestion: </span>
            {isServerError
              ? 'This is a server-side state. The clinical network engineers have been notified. Please wait a few moments before retrying.'
              : 'Please check the URL path or verify your account session permissions before re-submitting.'}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="relative z-10 flex flex-col sm:flex-row items-center justify-center gap-3">
          {details.canRetry && (
            <button
              type="button"
              onClick={handleRetry}
              className="w-full sm:w-auto h-10 px-4 rounded-lg bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 active:bg-gray-100 dark:active:bg-gray-600 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-200 text-sm font-medium transition duration-150 ease-in-out cursor-pointer inline-flex items-center justify-center gap-2 shadow-xs"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Try Again</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleGoBack}
            className="w-full sm:w-auto h-10 px-4 rounded-lg bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 active:bg-gray-100 dark:active:bg-gray-600 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-200 text-sm font-medium transition duration-150 ease-in-out cursor-pointer inline-flex items-center justify-center gap-2 shadow-xs"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Go Back</span>
          </button>

          <Link
            to="/"
            className="w-full sm:w-auto h-10 px-5 rounded-lg bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-sm font-medium transition duration-150 ease-in-out cursor-pointer inline-flex items-center justify-center gap-2 shadow-xs"
          >
            <Home className="w-4 h-4" />
            <span>Return to Home</span>
          </Link>
        </div>
      </div>
    </div>
  )
}
