import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Input from '../form/Input';

describe('Debug Input Component', () => {
  it('should debug number filtering', async () => {
    const mockOnChange = jest.fn();
    const user = userEvent.setup();
    
    render(
      <Input
        validationMode="numbers"
        value=""
        onChange={mockOnChange}
        data-testid="test-input"
      />
    );
    
    const input = screen.getByTestId('test-input');
    
    // Type mixed characters
    await user.type(input, 'abc123def');
    
    console.log('Input value after typing:', input.value);
    console.log('onChange calls:', mockOnChange.mock.calls);
    
    expect(input.value).toBe('123');
  });

  it('should debug controlled component', async () => {
    const mockOnChange = jest.fn();
    let currentValue = '';
    
    const TestComponent = () => (
      <Input
        validationMode="numbers"
        value={currentValue}
        onChange={(e) => {
          currentValue = e.target.value;
          mockOnChange(e);
        }}
        data-testid="controlled-input"
      />
    );
    
    const { rerender } = render(<TestComponent />);
    
    const input = screen.getByTestId('controlled-input');
    
    // Simulate typing
    fireEvent.change(input, { target: { value: 'abc123def' } });
    
    // Rerender with new value
    rerender(<TestComponent />);
    
    console.log('Controlled input value:', input.value);
    console.log('Current value state:', currentValue);
    
    expect(input.value).toBe('123');
  });
});