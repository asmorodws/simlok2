/**
 * Type definitions for Shared components
 */

import { ReactNode } from 'react';

// RoleGate Types
export interface RoleGateProps {
  allowedRoles: string[];
  children: ReactNode;
  fallback?: ReactNode;
}

// ErrorBoundary Types
export interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode | ((error: Error) => ReactNode);
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

// Generic Shared Props
export interface SharedProps {
  className?: string;
  children?: ReactNode;
}
