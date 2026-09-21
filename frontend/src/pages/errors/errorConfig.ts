import type { LucideIcon } from 'lucide-react'
import {
  AlertCircle,
  ShieldAlert,
  Lock,
  FileQuestion,
  Ban,
  Clock,
  FileWarning,
  RefreshCw,
  AlertTriangle,
  Timer,
  ServerCrash,
  Network,
  Wrench,
  Hourglass,
} from 'lucide-react'

export type ErrorStatusCode =
  | 400
  | 401
  | 403
  | 404
  | 405
  | 408
  | 409
  | 419
  | 422
  | 429
  | 500
  | 502
  | 503
  | 504

export interface ErrorPageDetails {
  statusCode: ErrorStatusCode
  title: string
  subtitle: string
  description: string
  icon: LucideIcon
  type: 'client' | 'server'
  canRetry?: boolean
}

export const ERROR_DETAILS: Record<ErrorStatusCode, ErrorPageDetails> = {
  400: {
    statusCode: 400,
    title: 'Bad Request',
    subtitle: 'Invalid Request Format',
    description:
      'The server could not understand the request due to invalid syntax or parameters. Please verify your data and try again.',
    icon: AlertCircle,
    type: 'client',
    canRetry: true,
  },
  401: {
    statusCode: 401,
    title: 'Unauthenticated',
    subtitle: 'Authentication Required',
    description:
      'You are not authenticated to view this page. Please sign in with valid credentials to access this resource.',
    icon: ShieldAlert,
    type: 'client',
  },
  403: {
    statusCode: 403,
    title: 'Forbidden',
    subtitle: 'Access Denied',
    description:
      'You do not have permission to access this resource. Please contact your system administrator if you believe this is an error.',
    icon: Lock,
    type: 'client',
  },
  404: {
    statusCode: 404,
    title: 'Page Not Found',
    subtitle: 'Resource Missing',
    description:
      'The requested page or medical record could not be found. It may have been moved, renamed, or temporarily unavailable.',
    icon: FileQuestion,
    type: 'client',
  },
  405: {
    statusCode: 405,
    title: 'Method Not Allowed',
    subtitle: 'Unsupported Action',
    description:
      'The HTTP method used for this request is not allowed for the requested resource. Please navigate back to safety.',
    icon: Ban,
    type: 'client',
  },
  408: {
    statusCode: 408,
    title: 'Request Timeout',
    subtitle: 'Connection Timed Out',
    description:
      'The server took too long waiting for the request to complete. Please check your network connection and retry.',
    icon: Clock,
    type: 'client',
    canRetry: true,
  },
  409: {
    statusCode: 409,
    title: 'Conflict',
    subtitle: 'Resource Conflict',
    description:
      'A conflict occurred while processing the request, such as a duplicated entry or conflicting record change. Please review your submission.',
    icon: FileWarning,
    type: 'client',
    canRetry: true,
  },
  419: {
    statusCode: 419,
    title: 'Page Expired',
    subtitle: 'Session Expired',
    description:
      'Your secure session or security verification has expired. Please refresh the page to obtain a new session and try again.',
    icon: RefreshCw,
    type: 'client',
    canRetry: true,
  },
  422: {
    statusCode: 422,
    title: 'Validation Error',
    subtitle: 'Unprocessable Entity',
    description:
      'The submitted form contains semantic validation errors. Please review the input fields and correct any highlighted issues.',
    icon: AlertTriangle,
    type: 'client',
    canRetry: true,
  },
  429: {
    statusCode: 429,
    title: 'Too Many Requests',
    subtitle: 'Rate Limit Exceeded',
    description:
      'Too many requests have been received in a short time period. Rate limiting is active to protect the system. Please wait a moment.',
    icon: Timer,
    type: 'client',
    canRetry: true,
  },
  500: {
    statusCode: 500,
    title: 'Internal Server Error',
    subtitle: 'Unexpected Server Problem',
    description:
      'The server encountered an unexpected condition that prevented it from fulfilling your request. Technical administrators have been alerted.',
    icon: ServerCrash,
    type: 'server',
    canRetry: true,
  },
  502: {
    statusCode: 502,
    title: 'Bad Gateway',
    subtitle: 'Invalid Upstream Response',
    description:
      'The gateway server received an invalid response from an upstream service or database. Please try again shortly.',
    icon: Network,
    type: 'server',
    canRetry: true,
  },
  503: {
    statusCode: 503,
    title: 'Service Unavailable',
    subtitle: 'Temporary Outage',
    description:
      'The service is temporarily unavailable due to routine maintenance or system capacity. Normal operations will resume shortly.',
    icon: Wrench,
    type: 'server',
    canRetry: true,
  },
  504: {
    statusCode: 504,
    title: 'Gateway Timeout',
    subtitle: 'Upstream Timeout',
    description:
      'The gateway did not receive a timely response from an upstream server. Please refresh or try again in a few moments.',
    icon: Hourglass,
    type: 'server',
    canRetry: true,
  },
}
