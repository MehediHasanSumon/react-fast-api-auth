export type UserRole =
  | 'Super Admin'
  | 'Admin'
  | 'Manager'
  | 'Editor'
  | 'Analyst'
  | 'Support'
  | 'Staff'

export type UserStatus = 'Active' | 'Inactive' | 'Suspended'

export type Department =
  | 'Engineering'
  | 'Operations'
  | 'Security'
  | 'Finance'
  | 'Product'
  | 'Support'
  | 'Legal'
  | 'Human Resources'
  | 'Administration'

export interface UserRecord {
  id: string
  name: string
  email: string
  role: string
  roles?: string[]
  department: Department
  status: UserStatus
  phoneNumber?: string
  isVerified?: boolean
  lastActive: string
  joinedDate: string
}

export interface UserFilterCriteria {
  role?: UserRole | 'ALL'
  department?: Department | 'ALL'
  status: UserStatus | 'ALL'
  isVerified: 'ALL' | 'VERIFIED' | 'UNVERIFIED'
  sortBy: 'newest' | 'oldest' | 'name-asc' | 'name-desc'
}

export const DEFAULT_FILTER_CRITERIA: UserFilterCriteria = {
  role: 'ALL',
  department: 'ALL',
  status: 'ALL',
  isVerified: 'ALL',
  sortBy: 'newest',
}

export const INITIAL_MOCK_USERS: UserRecord[] = [
  {
    id: 'USR-1001',
    name: 'Sarah Mitchell',
    email: 'sarah.mitchell@example.com',
    role: 'Manager',
    department: 'Engineering',
    status: 'Active',
    phoneNumber: '+1 (555) 234-5678',
    lastActive: '5 minutes ago',
    joinedDate: '2025-01-12',
  },
  {
    id: 'USR-1002',
    name: 'James Harrison',
    email: 'james.harrison@example.com',
    role: 'Admin',
    department: 'Administration',
    status: 'Active',
    phoneNumber: '+1 (555) 345-6789',
    lastActive: '12 minutes ago',
    joinedDate: '2024-11-04',
  },
  {
    id: 'USR-1003',
    name: 'Elena Rostova',
    email: 'elena.rostova@example.com',
    role: 'Staff',
    department: 'Operations',
    status: 'Active',
    phoneNumber: '+1 (555) 456-7890',
    lastActive: '1 hour ago',
    joinedDate: '2025-02-18',
  },
  {
    id: 'USR-1004',
    name: 'Marcus Vance',
    email: 'marcus.vance@example.com',
    role: 'Manager',
    department: 'Product',
    status: 'Inactive',
    phoneNumber: '+1 (555) 567-8901',
    lastActive: '3 days ago',
    joinedDate: '2024-08-20',
  },
  {
    id: 'USR-1005',
    name: 'Olivia Chen',
    email: 'olivia.chen@example.com',
    role: 'Editor',
    department: 'Finance',
    status: 'Active',
    phoneNumber: '+1 (555) 678-9012',
    lastActive: '2 hours ago',
    joinedDate: '2025-03-01',
  },
  {
    id: 'USR-1006',
    name: 'David Kim',
    email: 'david.kim@example.com',
    role: 'Analyst',
    department: 'Security',
    status: 'Active',
    phoneNumber: '+1 (555) 789-0123',
    lastActive: '45 minutes ago',
    joinedDate: '2025-01-29',
  },
  {
    id: 'USR-1007',
    name: 'Amina Al-Mansoor',
    email: 'amina.mansoor@example.com',
    role: 'Manager',
    department: 'Human Resources',
    status: 'Active',
    phoneNumber: '+1 (555) 890-1234',
    lastActive: 'Just now',
    joinedDate: '2024-10-15',
  },
  {
    id: 'USR-1008',
    name: 'Robert Kelly',
    email: 'robert.kelly@example.com',
    role: 'Staff',
    department: 'Operations',
    status: 'Suspended',
    phoneNumber: '+1 (555) 901-2345',
    lastActive: '2 weeks ago',
    joinedDate: '2024-05-19',
  },
  {
    id: 'USR-1009',
    name: 'Grace Hopper',
    email: 'grace.hopper@example.com',
    role: 'Staff',
    department: 'Engineering',
    status: 'Active',
    phoneNumber: '+1 (555) 112-2334',
    lastActive: '20 minutes ago',
    joinedDate: '2025-04-10',
  },
  {
    id: 'USR-1010',
    name: 'Liam Neeson',
    email: 'liam.neeson@example.com',
    role: 'Manager',
    department: 'Operations',
    status: 'Active',
    phoneNumber: '+1 (555) 223-3445',
    lastActive: '4 hours ago',
    joinedDate: '2024-09-08',
  },
  {
    id: 'USR-1011',
    name: 'Chloe Bennett',
    email: 'chloe.bennett@example.com',
    role: 'Admin',
    department: 'Administration',
    status: 'Active',
    phoneNumber: '+1 (555) 334-4556',
    lastActive: '10 minutes ago',
    joinedDate: '2024-07-22',
  },
  {
    id: 'USR-1012',
    name: 'Daniel Craig',
    email: 'daniel.craig@example.com',
    role: 'Editor',
    department: 'Support',
    status: 'Inactive',
    phoneNumber: '+1 (555) 445-5667',
    lastActive: '1 month ago',
    joinedDate: '2024-03-14',
  },
  {
    id: 'USR-1013',
    name: 'Sophia Patel',
    email: 'sophia.patel@example.com',
    role: 'Staff',
    department: 'Engineering',
    status: 'Active',
    phoneNumber: '+1 (555) 556-6778',
    lastActive: '35 minutes ago',
    joinedDate: '2025-02-05',
  },
  {
    id: 'USR-1014',
    name: 'Benjamin Franklin',
    email: 'benjamin.franklin@example.com',
    role: 'Editor',
    department: 'Finance',
    status: 'Active',
    phoneNumber: '+1 (555) 667-7889',
    lastActive: '3 hours ago',
    joinedDate: '2025-01-02',
  },
  {
    id: 'USR-1015',
    name: 'Emma Watson',
    email: 'emma.watson@example.com',
    role: 'Staff',
    department: 'Operations',
    status: 'Active',
    phoneNumber: '+1 (555) 778-8990',
    lastActive: '15 minutes ago',
    joinedDate: '2025-05-11',
  },
]
