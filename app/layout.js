import { AuthProvider } from '@/contexts/AuthContext';
import './globals.css';

export const metadata = {
  title: 'Admin Panel',
  description: 'Car Dealership Admin Panel',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
