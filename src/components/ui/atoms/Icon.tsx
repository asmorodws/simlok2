/**
 * Enhanced Icon Component - Atom Level
 * 
 * This icon component provides a unified interface for all icon usage
 * across the SIMLOK2 application. It supports multiple icon libraries
 * and provides consistent sizing, coloring, and accessibility features.
 * 
 * Features:
 * - Support for Lucide React icons (primary)
 * - Consistent sizing system aligned with design tokens
 * - Semantic color variants
 * - Loading state animation
 * - Accessibility compliance (proper ARIA attributes)
 * - Type-safe icon name system
 */

import React from 'react';
import { cn } from '@/lib/utils';
import { 
  // Core Navigation Icons
  Home,
  Menu,
  X,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  ArrowLeft,
  ArrowRight,
  
  // Action Icons  
  Plus,
  Minus,
  Edit,
  Trash2,
  Save,
  Upload,
  Download,
  Search,
  Filter,
  RefreshCw,
  
  // Status Icons
  Check,
  AlertCircle,
  AlertTriangle,
  Info,
  XCircle,
  CheckCircle,
  Clock,
  
  // User & Access
  User,
  Users,
  Eye,
  EyeOff,
  Lock,
  Unlock,
  
  // File & Document
  File,
  FileText,
  Image,
  FileType,
  
  // Communication
  Mail,
  Phone,
  MessageSquare,
  
  // System
  Settings,
  HelpCircle,
  LogOut,
  
  // Business Specific
  QrCode,
  Camera,
  MapPin,
  Calendar,
  Building,
  Truck,
  
  // Loading
  Loader2
} from 'lucide-react';

// Icon name type for type safety
export type IconName = 
  // Core Navigation
  | 'home' | 'menu' | 'x' | 'chevron-left' | 'chevron-right' | 'chevron-up' | 'chevron-down'
  | 'arrow-left' | 'arrow-right'
  
  // Actions
  | 'plus' | 'minus' | 'edit' | 'trash' | 'save' | 'upload' | 'download' 
  | 'search' | 'filter' | 'refresh'
  
  // Status  
  | 'check' | 'alert-circle' | 'alert-triangle' | 'info' | 'x-circle' 
  | 'check-circle' | 'clock'
  
  // User & Access
  | 'user' | 'users' | 'eye' | 'eye-off' | 'lock' | 'unlock'
  
  // File & Document
  | 'file' | 'file-text' | 'image' | 'pdf'
  
  // Communication
  | 'mail' | 'phone' | 'message-square'
  
  // System
  | 'settings' | 'help-circle' | 'log-out'
  
  // Business Specific
  | 'qr-code' | 'camera' | 'map-pin' | 'calendar' | 'building' | 'truck'
  
  // Loading
  | 'loader';

// Icon mapping object
const iconMap: Record<IconName, React.ComponentType<any>> = {
  // Core Navigation
  'home': Home,
  'menu': Menu,
  'x': X,
  'chevron-left': ChevronLeft,
  'chevron-right': ChevronRight,
  'chevron-up': ChevronUp,
  'chevron-down': ChevronDown,
  'arrow-left': ArrowLeft,
  'arrow-right': ArrowRight,
  
  // Actions
  'plus': Plus,
  'minus': Minus,
  'edit': Edit,
  'trash': Trash2,
  'save': Save,
  'upload': Upload,
  'download': Download,
  'search': Search,
  'filter': Filter,
  'refresh': RefreshCw,
  
  // Status
  'check': Check,
  'alert-circle': AlertCircle,
  'alert-triangle': AlertTriangle,
  'info': Info,
  'x-circle': XCircle,
  'check-circle': CheckCircle,
  'clock': Clock,
  
  // User & Access
  'user': User,
  'users': Users,
  'eye': Eye,
  'eye-off': EyeOff,
  'lock': Lock,
  'unlock': Unlock,
  
  // File & Document
  'file': File,
  'file-text': FileText,
  'image': Image,
  'pdf': FileType,
  
  // Communication
  'mail': Mail,
  'phone': Phone,
  'message-square': MessageSquare,
  
  // System
  'settings': Settings,
  'help-circle': HelpCircle,
  'log-out': LogOut,
  
  // Business Specific
  'qr-code': QrCode,
  'camera': Camera,
  'map-pin': MapPin,
  'calendar': Calendar,
  'building': Building,
  'truck': Truck,
  
  // Loading
  'loader': Loader2
};

export interface IconProps {
  /** Icon name from the predefined set */
  name: IconName;
  
  /** Size of the icon using design token scale */
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  
  /** Color variant with semantic meaning */
  variant?: 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'muted';
  
  /** Whether the icon should animate (for loading states) */
  animate?: boolean;
  
  /** Custom className for additional styling */
  className?: string;
  
  /** Accessibility label (required for standalone icons) */
  'aria-label'?: string;
  
  /** Whether icon is decorative only (hides from screen readers) */
  decorative?: boolean;
}

/**
 * Icon component following Atomic Design principles
 */
export const Icon: React.FC<IconProps> = ({
  name,
  size = 'md',
  variant = 'default',
  animate = false,
  className,
  'aria-label': ariaLabel,
  decorative = false,
  ...props
}) => {
  
  // Get the icon component
  const IconComponent = iconMap[name];
  
  if (!IconComponent) {
    console.warn(`Icon "${name}" not found in icon map`);
    return null;
  }

  // Size styles using design tokens
  const sizeStyles = {
    xs: 'w-3 h-3',    // 12px
    sm: 'w-4 h-4',    // 16px  
    md: 'w-5 h-5',    // 20px
    lg: 'w-6 h-6',    // 24px
    xl: 'w-8 h-8',    // 32px
    '2xl': 'w-10 h-10' // 40px
  };

  // Color variant styles
  const variantStyles = {
    default: 'text-gray-600',
    primary: 'text-blue-600',
    secondary: 'text-gray-500',
    success: 'text-green-600',
    warning: 'text-yellow-600',
    error: 'text-red-600',
    muted: 'text-gray-400'
  };

  // Animation styles  
  const animationStyles = {
    loader: 'animate-spin',
    default: animate ? 'animate-pulse' : ''
  };

  // Determine animation class
  const getAnimationClass = () => {
    if (name === 'loader') return animationStyles.loader;
    return animationStyles.default;
  };

  // Combine all styles
  const iconStyles = cn(
    sizeStyles[size],
    variantStyles[variant],
    getAnimationClass(),
    'flex-shrink-0', // Prevent icon from shrinking in flex containers
    className
  );

  // Accessibility props
  const accessibilityProps = {
    'aria-hidden': decorative ? 'true' : undefined,
    'aria-label': !decorative ? ariaLabel : undefined,
    role: !decorative && !ariaLabel ? 'img' : undefined
  };

  return (
    <IconComponent
      className={iconStyles}
      {...accessibilityProps}
      {...props}
    />
  );
};

/**
 * Convenience wrapper for commonly used icon patterns
 */

// Loading icon with consistent styling
export const LoadingIcon: React.FC<Omit<IconProps, 'name' | 'animate'>> = (props) => (
  <Icon name="loader" animate {...props} />
);

// Status icons with semantic variants
export const StatusIcon: React.FC<{
  status: 'success' | 'warning' | 'error' | 'info';
} & Omit<IconProps, 'name' | 'variant'>> = ({ status, ...props }) => {
  const iconMap = {
    success: 'check-circle' as const,
    warning: 'alert-triangle' as const, 
    error: 'x-circle' as const,
    info: 'info' as const
  };
  
  const variantMap = {
    success: 'success' as const,
    warning: 'warning' as const,
    error: 'error' as const, 
    info: 'primary' as const
  };

  return (
    <Icon 
      name={iconMap[status]} 
      variant={variantMap[status]}
      {...props} 
    />
  );
};

// Navigation icons
export const NavIcon: React.FC<{
  direction: 'left' | 'right' | 'up' | 'down';
} & Omit<IconProps, 'name'>> = ({ direction, ...props }) => {
  const iconMap = {
    left: 'chevron-left' as const,
    right: 'chevron-right' as const,
    up: 'chevron-up' as const,
    down: 'chevron-down' as const
  };

  return <Icon name={iconMap[direction]} {...props} />;
};

export default Icon;