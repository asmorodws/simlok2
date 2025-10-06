import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Input from '../Input';

// Simple focused tests for Input component
describe('Input Component - Core Functionality', () => {
  it('renders input element', () => {
    render(<Input data-testid="test-input" />);
    expect(screen.getByTestId('test-input')).toBeInTheDocument();
  });

  it('shows error message when error prop is provided', () => {
    render(<Input error="Test error" data-testid="test-input" />);
    expect(screen.getByText('Test error')).toBeInTheDocument();
  });

  it('filters numbers correctly', () => {
    const mockOnChange = jest.fn();
    render(
      <Input 
        validationMode="numbers" 
        onChange={mockOnChange} 
        data-testid="test-input"
      />
    );
    
    const input = screen.getByTestId('test-input');
    fireEvent.change(input, { target: { value: 'abc123def456' } });
    
    // Should call onChange with filtered value
    expect(mockOnChange).toHaveBeenCalledWith(
      expect.objectContaining({
        target: expect.objectContaining({
          value: '123456'
        })
      })
    );
  });

  it('filters letters correctly', () => {
    const mockOnChange = jest.fn();
    render(
      <Input 
        validationMode="letters" 
        onChange={mockOnChange} 
        data-testid="test-input"
      />
    );
    
    const input = screen.getByTestId('test-input');
    fireEvent.change(input, { target: { value: 'John123!@#' } });
    
    // Should call onChange with filtered value (only letters)
    expect(mockOnChange).toHaveBeenCalledWith(
      expect.objectContaining({
        target: expect.objectContaining({
          value: 'John'
        })
      })
    );
  });

  it('filters email characters correctly', () => {
    const mockOnChange = jest.fn();
    render(
      <Input 
        validationMode="email" 
        onChange={mockOnChange} 
        data-testid="test-input"
      />
    );
    
    const input = screen.getByTestId('test-input');
    fireEvent.change(input, { target: { value: 'test!#$@domain.com' } });
    
    // Should call onChange with filtered value
    expect(mockOnChange).toHaveBeenCalledWith(
      expect.objectContaining({
        target: expect.objectContaining({
          value: 'test@domain.com'
        })
      })
    );
  });

  it('allows all characters in free mode', () => {
    const mockOnChange = jest.fn();
    render(
      <Input 
        validationMode="free" 
        onChange={mockOnChange} 
        data-testid="test-input"
      />
    );
    
    const input = screen.getByTestId('test-input');
    const testValue = 'Test123!@#';
    fireEvent.change(input, { target: { value: testValue } });
    
    // Should call onChange with unfiltered value
    expect(mockOnChange).toHaveBeenCalledWith(
      expect.objectContaining({
        target: expect.objectContaining({
          value: testValue
        })
      })
    );
  });

  it('works as controlled component', () => {
    const TestControlledComponent = () => {
      const [value, setValue] = React.useState('initial');
      return (
        <Input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          validationMode="numbers"
          data-testid="controlled-input"
        />
      );
    };

    render(<TestControlledComponent />);
    const input = screen.getByTestId('controlled-input');
    
    // Initial value should be filtered if needed
    expect(input).toHaveValue('');  // 'initial' gets filtered to empty for numbers mode
    
    // Change to a mixed value
    fireEvent.change(input, { target: { value: 'abc123' } });
    expect(input).toHaveValue('123');
  });
});