/**
 * Component Library - Clean & Organized Structure
 * 
 * This is the main entry point for all components.
 * Components are organized by:
 * 
 * - ui/         → Primitive UI components (Button, Input, Card, etc.)
 * - layout/     → Page structure components (Sidebar, Header, RoleGate)
 * - templates/  → Page-level templates
 * - features/   → Feature-specific complex components
 * - shared/     → Utilities & types
 * 
 * @see docs/COMPONENT_REORGANIZATION_PLAN.md for detailed documentation
 */

// ============================================================================
// UI - Primitive Components
// ============================================================================
export * from './ui';

// ============================================================================
// LAYOUT - Page Structure
// ============================================================================
export * from './layout';

// ============================================================================
// TEMPLATES - Page Layouts
// ============================================================================
export * from './templates';

// ============================================================================
// FEATURES - Feature-specific Components
// ============================================================================
export * from './features';

// ============================================================================
// SHARED - Utilities & Types
// ============================================================================
export * from './shared';
