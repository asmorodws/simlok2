import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Input from '../Input';

describe('Input Component', () => {
  const mockOnChange = jest.fn();

  beforeEach(() => {
    mockOnChange.mockClear();
  });

  describe('Basic Functionality', () => {
    it('renders input with default props', () => {
      render(<Input data-testid="test-input" />);
      const input = screen.getByTestId('test-input');
      expect(input).toBeInTheDocument();
      expect(input).toHaveClass('w-full', 'px-3', 'py-2', 'border-gray-300');
    });

    it('renders input with custom className', () => {
      render(<Input data-testid="test-input" className="custom-class" />);
      const input = screen.getByTestId('test-input');
      expect(input).toHaveClass('custom-class');
    });

    it('displays error message when error prop is provided', () => {
      const errorMessage = 'This field is required';
      render(<Input error={errorMessage} data-testid="test-input" />);
      
      expect(screen.getByText(errorMessage)).toBeInTheDocument();
      const input = screen.getByTestId('test-input');
      expect(input).toHaveClass('border-red-500');
    });

    it('applies error styling when error is present', () => {
      render(<Input error="Error message" data-testid="test-input" />);
      const input = screen.getByTestId('test-input');
      expect(input).toHaveClass('border-red-500', 'focus:ring-red-500', 'focus:border-red-500');
    });
  });

  describe('Validation Mode: Free (Default)', () => {
    it('allows typing normal text in free mode', async () => {
      const user = userEvent.setup();
      render(
        <Input 
          validationMode="free" 
          onChange={mockOnChange} 
          data-testid="test-input"
        />
      );
      
      const input = screen.getByTestId('test-input');
      await user.type(input, 'Test123');
      
      expect(input).toHaveValue('Test123');
    });

    it('handles controlled component with initial value', () => {
      render(
        <Input 
          validationMode="free" 
          value="initial value"
          onChange={mockOnChange} 
          data-testid="test-input"
        />
      );
      
      const input = screen.getByTestId('test-input');
      expect(input).toHaveValue('initial value');
    });
  });

  describe('Validation Mode: Numbers', () => {
    it('only allows numeric characters', async () => {
      const user = userEvent.setup();
      render(
        <Input 
          validationMode="numbers" 
          onChange={mockOnChange} 
          data-testid="test-input"
        />
      );
      
      const input = screen.getByTestId('test-input');
      await user.type(input, 'abc123def456');
      
      expect(input).toHaveValue('123456');
    });

    it('filters out non-numeric characters in controlled mode', () => {
      const TestComponent = () => {
        const [value, setValue] = React.useState('');
        return (
          <Input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            validationMode="numbers"
            data-testid="test-input"
          />
        );
      };

      render(<TestComponent />);
      const input = screen.getByTestId('test-input');
      
      fireEvent.change(input, { target: { value: 'abc123xyz' } });
      expect(input).toHaveValue('123');
    });

    it('handles paste events correctly', () => {
      render(
        <Input 
          validationMode="numbers" 
          onChange={mockOnChange} 
          data-testid="test-input"
        />
      );
      
      const input = screen.getByTestId('test-input');
      
      // Simulate paste event
      fireEvent.change(input, { target: { value: 'abc123xyz789' } });
      
      expect(input).toHaveValue('123789');
    });
  });

  describe('Validation Mode: Letters', () => {
    it('allows letters and allowed special characters', async () => {
      const user = userEvent.setup();
      render(
        <Input 
          validationMode="letters" 
          onChange={mockOnChange} 
          data-testid="test-input"
        />
      );
      
      const input = screen.getByTestId('test-input');
      await user.type(input, 'John Doe');
      
      expect(input).toHaveValue('John Doe');
    });

    it('filters out numbers and unwanted special characters', () => {
      render(
        <Input 
          validationMode="letters" 
          onChange={mockOnChange} 
          data-testid="test-input"
        />
      );
      
      const input = screen.getByTestId('test-input');
      fireEvent.change(input, { target: { value: 'John123!@#Smith' } });
      
      expect(input).toHaveValue('JohnSmith');
    });
  });

  describe('Validation Mode: Email', () => {
    it('allows valid email characters', async () => {
      const user = userEvent.setup();
      render(
        <Input 
          validationMode="email" 
          onChange={mockOnChange} 
          data-testid="test-input"
        />
      );
      
      const input = screen.getByTestId('test-input');
      await user.type(input, 'user@example.com');
      
      expect(input).toHaveValue('user@example.com');
    });

    it('filters out invalid email characters', () => {
      render(
        <Input 
          validationMode="email" 
          onChange={mockOnChange} 
          data-testid="test-input"
        />
      );
      
      const input = screen.getByTestId('test-input');
      fireEvent.change(input, { target: { value: 'user@domain!#$%.com' } });
      
      expect(input).toHaveValue('user@domain.com');
    });
  });

  describe('onChange Behavior', () => {
    it('calls onChange with filtered value when typing', async () => {
      const user = userEvent.setup();
      render(
        <Input 
          validationMode="numbers" 
          onChange={mockOnChange} 
          data-testid="test-input"
        />
      );
      
      const input = screen.getByTestId('test-input');
      await user.type(input, '1');
      
      expect(mockOnChange).toHaveBeenCalledWith(
        expect.objectContaining({
          target: expect.objectContaining({
            value: '1'
          })
        })
      );
    });

    it('does not call onChange when no onChange prop provided', () => {
      render(<Input validationMode="numbers" data-testid="test-input" />);
      const input = screen.getByTestId('test-input');
      
      fireEvent.change(input, { target: { value: 'abc123' } });
      
      expect(mockOnChange).not.toHaveBeenCalled();
    });
  });

  describe('Controlled vs Uncontrolled', () => {
    it('works as controlled component', () => {
      const TestComponent = () => {
        const [value, setValue] = React.useState('');
        return (
          <Input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            validationMode="numbers"
            data-testid="test-input"
          />
        );
      };

      render(<TestComponent />);
      const input = screen.getByTestId('test-input');
      
      fireEvent.change(input, { target: { value: 'abc123' } });
      expect(input).toHaveValue('123');
    });

    it('works as uncontrolled component', () => {
      render(
        <Input 
          validationMode="numbers" 
          data-testid="test-input"
        />
      );
      
      const input = screen.getByTestId('test-input');
      fireEvent.change(input, { target: { value: 'abc123' } });
      
      expect(input).toHaveValue('123');
    });
  });

  describe('Edge Cases', () => {
    it('handles undefined value gracefully', () => {
      render(
        <Input 
          value={undefined} 
          onChange={mockOnChange} 
          data-testid="test-input"
        />
      );
      
      const input = screen.getByTestId('test-input');
      expect(input).toHaveValue('');
    });

    it('handles empty string value', () => {
      render(
        <Input 
          value="" 
          onChange={mockOnChange} 
          data-testid="test-input"
        />
      );
      
      const input = screen.getByTestId('test-input');
      expect(input).toHaveValue('');
    });

    it('handles empty string filtering correctly', () => {
      render(
        <Input 
          validationMode="numbers" 
          onChange={mockOnChange} 
          data-testid="test-input"
        />
      );
      
      const input = screen.getByTestId('test-input');
      fireEvent.change(input, { target: { value: '' } });
      
      expect(input).toHaveValue('');
    });
  });

  describe('Accessibility', () => {
    it('supports ARIA attributes', () => {
      render(
        <Input 
          aria-label="Test input"
          aria-describedby="helper-text"
          data-testid="test-input"
        />
      );
      
      const input = screen.getByTestId('test-input');
      expect(input).toHaveAttribute('aria-label', 'Test input');
      expect(input).toHaveAttribute('aria-describedby', 'helper-text');
    });

    it('associates error message with input', () => {
      render(
        <Input 
          error="Error message"
          data-testid="test-input"
        />
      );
      
      const input = screen.getByTestId('test-input');
      const errorElement = screen.getByText('Error message');
      
      expect(input).toBeInTheDocument();
      expect(errorElement).toBeInTheDocument();
      expect(errorElement).toHaveClass('text-red-600');
    });
  });
});