/* Reusable UI Components using Design Tokens */

const { useMemo } = React;

// Button Component
function Button({ 
  children, 
  variant = 'primary', 
  size = 'md', 
  disabled = false, 
  onClick,
  type = 'button',
  className = '',
}) {
  const baseStyles = useMemo(() => ({
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.5rem',
    fontWeight: DESIGN_TOKENS.typography.fontWeight.medium,
    borderRadius: DESIGN_TOKENS.borderRadius.md,
    border: 'none',
    cursor: disabled ? 'not-allowed' : 'pointer',
    transition: DESIGN_TOKENS.transitions.base,
    fontFamily: DESIGN_TOKENS.typography.fontFamily.sans,
  }), []);

  const variantStyles = useMemo(() => ({
    primary: {
      backgroundColor: DESIGN_TOKENS.colors.primary,
      color: 'white',
      '&:hover': {
        backgroundColor: DESIGN_TOKENS.colors.primaryHover,
      },
    },
    secondary: {
      backgroundColor: DESIGN_TOKENS.colors.secondary,
      color: 'white',
      '&:hover': {
        backgroundColor: '#475569',
      },
    },
    outline: {
      backgroundColor: 'transparent',
      color: DESIGN_TOKENS.colors.primary,
      border: `1px solid ${DESIGN_TOKENS.colors.primary}`,
      '&:hover': {
        backgroundColor: DESIGN_TOKENS.colors.backgroundAlt,
      },
    },
    ghost: {
      backgroundColor: 'transparent',
      color: DESIGN_TOKENS.colors.text,
      '&:hover': {
        backgroundColor: DESIGN_TOKENS.colors.backgroundAlt,
      },
    },
  }), []);

  const sizeStyles = useMemo(() => ({
    sm: {
      padding: `${DESIGN_TOKENS.spacing[2]} ${DESIGN_TOKENS.spacing[3]}`,
      fontSize: DESIGN_TOKENS.typography.fontSize.sm,
    },
    md: {
      padding: `${DESIGN_TOKENS.spacing[3]} ${DESIGN_TOKENS.spacing[4]}`,
      fontSize: DESIGN_TOKENS.typography.fontSize.base,
    },
    lg: {
      padding: `${DESIGN_TOKENS.spacing[4]} ${DESIGN_TOKENS.spacing[6]}`,
      fontSize: DESIGN_TOKENS.typography.fontSize.lg,
    },
  }), []);

  const styles = {
    ...baseStyles,
    ...variantStyles[variant],
    ...sizeStyles[size],
    opacity: disabled ? 0.5 : 1,
  };

  return (
    <button
      type={type}
      style={styles}
      onClick={onClick}
      disabled={disabled}
      className={className}
    >
      {children}
    </button>
  );
}

// Card Component
function Card({ children, className = '', elevation = 'base', padding = 'md' }) {
  const elevationStyles = useMemo(() => ({
    none: 'none',
    sm: DESIGN_TOKENS.shadows.sm,
    base: DESIGN_TOKENS.shadows.base,
    md: DESIGN_TOKENS.shadows.md,
    lg: DESIGN_TOKENS.shadows.lg,
    xl: DESIGN_TOKENS.shadows.xl,
  }), []);

  const paddingStyles = useMemo(() => ({
    none: '0',
    sm: DESIGN_TOKENS.spacing[3],
    md: DESIGN_TOKENS.spacing[4],
    lg: DESIGN_TOKENS.spacing[6],
    xl: DESIGN_TOKENS.spacing[8],
  }), []);

  const styles = {
    backgroundColor: DESIGN_TOKENS.colors.background,
    borderRadius: DESIGN_TOKENS.borderRadius.lg,
    boxShadow: elevationStyles[elevation],
    padding: paddingStyles[padding],
    border: `1px solid ${DESIGN_TOKENS.colors.border}`,
  };

  return (
    <div style={styles} className={className}>
      {children}
    </div>
  );
}

// Badge Component
function Badge({ children, variant = 'default', size = 'md' }) {
  const variantStyles = useMemo(() => ({
    default: {
      backgroundColor: DESIGN_TOKENS.colors.backgroundAlt,
      color: DESIGN_TOKENS.colors.text,
    },
    success: {
      backgroundColor: '#dcfce7',
      color: '#166534',
    },
    warning: {
      backgroundColor: '#fef3c7',
      color: '#92400e',
    },
    error: {
      backgroundColor: '#fee2e2',
      color: '#991b1b',
    },
    primary: {
      backgroundColor: '#dbeafe',
      color: '#1e40af',
    },
  }), []);

  const sizeStyles = useMemo(() => ({
    sm: {
      padding: `${DESIGN_TOKENS.spacing[1]} ${DESIGN_TOKENS.spacing[2]}`,
      fontSize: DESIGN_TOKENS.typography.fontSize.xs,
    },
    md: {
      padding: `${DESIGN_TOKENS.spacing[2]} ${DESIGN_TOKENS.spacing[3]}`,
      fontSize: DESIGN_TOKENS.typography.fontSize.sm,
    },
    lg: {
      padding: `${DESIGN_TOKENS.spacing[3]} ${DESIGN_TOKENS.spacing[4]}`,
      fontSize: DESIGN_TOKENS.typography.fontSize.base,
    },
  }), []);

  const styles = {
    ...variantStyles[variant],
    ...sizeStyles[size],
    borderRadius: DESIGN_TOKENS.borderRadius.full,
    fontWeight: DESIGN_TOKENS.typography.fontWeight.medium,
    display: 'inline-flex',
    alignItems: 'center',
  };

  return <span style={styles}>{children}</span>;
}

// Input Component
function Input({ 
  label, 
  placeholder, 
  value, 
  onChange, 
  type = 'text', 
  error,
  disabled = false,
}) {
  const inputStyles = useMemo(() => ({
    width: '100%',
    padding: `${DESIGN_TOKENS.spacing[3]} ${DESIGN_TOKENS.spacing[4]}`,
    fontSize: DESIGN_TOKENS.typography.fontSize.base,
    fontFamily: DESIGN_TOKENS.typography.fontFamily.sans,
    border: `1px solid ${error ? DESIGN_TOKENS.colors.error : DESIGN_TOKENS.colors.border}`,
    borderRadius: DESIGN_TOKENS.borderRadius.md,
    backgroundColor: DESIGN_TOKENS.colors.background,
    color: DESIGN_TOKENS.colors.text,
    transition: DESIGN_TOKENS.transitions.base,
    outline: 'none',
    '&:focus': {
      borderColor: DESIGN_TOKENS.colors.primary,
      boxShadow: `0 0 0 3px ${DESIGN_TOKENS.colors.primary}20`,
    },
    '&:disabled': {
      opacity: 0.5,
      cursor: 'not-allowed',
    },
  }), [error]);

  const labelStyles = useMemo(() => ({
    display: 'block',
    marginBottom: DESIGN_TOKENS.spacing[2],
    fontSize: DESIGN_TOKENS.typography.fontSize.sm,
    fontWeight: DESIGN_TOKENS.typography.fontWeight.medium,
    color: DESIGN_TOKENS.colors.text,
  }), []);

  const errorStyles = useMemo(() => ({
    marginTop: DESIGN_TOKENS.spacing[2],
    fontSize: DESIGN_TOKENS.typography.fontSize.xs,
    color: DESIGN_TOKENS.colors.error,
  }), []);

  return (
    <div>
      {label && <label style={labelStyles}>{label}</label>}
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        disabled={disabled}
        style={inputStyles}
      />
      {error && <div style={errorStyles}>{error}</div>}
    </div>
  );
}

// Export components
window.UIComponents = {
  Button,
  Card,
  Badge,
  Input,
};
