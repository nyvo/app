/**
 * Auth route constants — enforces context isolation between teacher and student systems.
 * All auth pages import from this map instead of hardcoding route strings.
 */
export const AUTH_ROUTES = {
  teacher: {
    login: '/login',
    signup: '/signup',
    forgotPassword: '/forgot-password',
    resetPassword: '/reset-password',
    confirmEmail: '/confirm-email',
    dashboard: '/teacher',
  },
  student: {
    login: '/student/login',
    signup: '/student/register',
    forgotPassword: '/student/forgot-password',
    resetPassword: '/student/reset-password',
    confirmEmail: '/student/confirm-email',
    dashboard: '/student/dashboard',
  },
} as const

export type AuthContext = 'teacher' | 'student'
