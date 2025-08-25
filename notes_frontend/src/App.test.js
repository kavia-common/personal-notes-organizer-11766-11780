import { render, screen } from '@testing-library/react';
import App from './App';

test('renders app header brand name', () => {
  render(<App />);
  expect(screen.getByText(/Personal Notes Organizer/i)).toBeInTheDocument();
});
