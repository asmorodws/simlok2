import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Input from '../Input';

// Test sederhana untuk debug
describe('Input Component Debug', () => {
  it('should allow basic typing', async () => {
    const user = userEvent.setup();
    const mockOnChange = jest.fn();
    
    render(
      <Input 
        data-testid="test-input" 
        onChange={mockOnChange} 
        validationMode="free"
      />
    );
    
    const input = screen.getByTestId('test-input') as HTMLInputElement;
    
    // Type some text
    await user.type(input, 'Hello');
    
    console.log('Input value:', input.value);
    console.log('OnChange calls:', mockOnChange.mock.calls);
  });
  
  it('should work with controlled component', () => {
    const mockOnChange = jest.fn();
    
    render(
      <Input 
        data-testid="test-input" 
        value="test"
        onChange={mockOnChange} 
        validationMode="free"
      />
    );
    
    const input = screen.getByTestId('test-input') as HTMLInputElement;
    console.log('Controlled input value:', input.value);
    
    // Simulate typing
    fireEvent.change(input, { target: { value: 'test123' } });
    
    console.log('OnChange called with:', mockOnChange.mock.calls);
  });
});