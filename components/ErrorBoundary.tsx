import React, { Component, ErrorInfo, ReactNode } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Button } from 'react-native-paper';
import { colors, radius } from '../theme';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.setState({
      error,
      errorInfo,
    });
  }

  handleReset = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render(): ReactNode {
    if (this.state?.hasError) {
      return (
        <View style={styles.container}>
          <ScrollView contentContainerStyle={styles.scrollContent}>
            <View style={styles.iconContainer}>
              <Text style={styles.icon}>⚠️</Text>
            </View>
            <Text style={styles.title}>Algo deu errado</Text>
            <Text style={styles.message}>
              Ocorreu um erro inesperado no aplicativo.
            </Text>

            {__DEV__ && this.state?.error ? (
              <View style={styles.errorContainer}>
                <Text style={styles.errorTitle}>Detalhes do erro:</Text>
                <Text style={styles.errorText}>
                  {this.state?.error?.toString?.() ?? 'Erro desconhecido'}
                </Text>
                {this.state?.errorInfo?.componentStack ? (
                  <Text style={styles.errorStack}>
                    {this.state.errorInfo.componentStack}
                  </Text>
                ) : null}
              </View>
            ) : null}

            <Button
              mode="contained"
              onPress={this.handleReset}
              style={styles.button}
              buttonColor={colors.primary}
              textColor={colors.white}
            >
              Tentar Novamente
            </Button>
          </ScrollView>
        </View>
      );
    }

    return this.props?.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  icon: {
    fontSize: 42,
  },
  iconContainer: {
    width: 86,
    height: 86,
    borderRadius: 28,
    backgroundColor: '#35161B',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  message: {
    fontSize: 16,
    color: colors.textMuted,
    marginBottom: 24,
    textAlign: 'center',
  },
  errorContainer: {
    backgroundColor: colors.surface,
    borderRadius: radius.medium,
    padding: 16,
    marginBottom: 24,
    width: '100%',
    maxWidth: 600,
  },
  errorTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.danger,
    marginBottom: 8,
  },
  errorText: {
    fontSize: 12,
    color: colors.text,
    fontFamily: 'monospace',
    marginBottom: 8,
  },
  errorStack: {
    fontSize: 10,
    color: colors.textDim,
    fontFamily: 'monospace',
  },
  button: {
    borderRadius: radius.medium,
    minWidth: 200,
  },
});

export default ErrorBoundary;
