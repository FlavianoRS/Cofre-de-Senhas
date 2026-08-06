import React from 'react';
import { Provider as PaperProvider } from 'react-native-paper';
import { AuthProvider } from './contexts/AuthContext';
import { PasswordProvider } from './contexts/PasswordContext';
import AppNavigator from './navigation/AppNavigator';
import ErrorBoundary from './components/ErrorBoundary';
import { appTheme } from './theme';

const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <PaperProvider theme={appTheme}>
        <AuthProvider>
          <PasswordProvider>
            <AppNavigator />
          </PasswordProvider>
        </AuthProvider>
      </PaperProvider>
    </ErrorBoundary>
  );
};

export default App;
