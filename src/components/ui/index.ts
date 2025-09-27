/**
 * UI Components Index - Atomic Design System
 * 
 * This is the main entry point for the SIMLOK2 design system components.
 * It provides a unified interface for importing components following the
 * Atomic Design methodology (Atoms → Molecules → Organisms).
 * 
 * Usage:
 * import { Button, Card, Form } from '@/components/ui';
 * 
 * Architecture:
 * - Atoms: Basic building blocks (Button, Input, Icon)
 * - Molecules: Composed components (FormGroup, Card)  
 * - Organisms: Complex patterns (Form, LoginForm)
 */

// Re-export all atoms
export * from './atoms';

// Re-export all molecules  
export * from './molecules';

// Re-export all organisms
export * from './organisms';