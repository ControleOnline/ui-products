import {Platform} from 'react-native';

export const nestedBackdropStyle = (palette, compact) => ({
  flex: 1,
  justifyContent: compact ? 'flex-start' : 'center',
  alignItems: 'center',
  backgroundColor: compact ? palette.modal : 'rgba(10, 24, 34, 0.72)',
  padding: compact ? 0 : 24,
});

export const nestedPanelStyle = (palette, compact) => ({
  width: '100%',
  maxWidth: compact ? undefined : 720,
  height: compact ? '100%' : undefined,
  maxHeight: compact ? undefined : '88%',
  backgroundColor: palette.modal,
  borderRadius: compact ? 0 : 22,
  borderWidth: compact ? 0 : 1,
  borderColor: palette.border,
  overflow: 'hidden',
  ...Platform.select({
    web: compact ? {} : {boxShadow: '0 22px 55px rgba(0, 0, 0, 0.28)'},
    default: compact ? {} : {elevation: 18},
  }),
});

export const nestedHeaderStyle = palette => ({
  flexDirection: 'row',
  alignItems: 'center',
  gap: 12,
  paddingHorizontal: 18,
  paddingVertical: 16,
  borderBottomWidth: 1,
  borderBottomColor: palette.border,
});

export const nestedBackButtonStyle = palette => ({
  width: 44,
  height: 44,
  borderRadius: 22,
  alignItems: 'center',
  justifyContent: 'center',
  borderWidth: 1,
  borderColor: palette.border,
  backgroundColor: palette.panel,
});

export const nestedHeaderCopyStyle = {flex: 1};

export const nestedEyebrowStyle = palette => ({
  color: palette.primary,
  fontSize: 12,
  fontWeight: '700',
  textTransform: 'uppercase',
});

export const nestedTitleStyle = palette => ({
  color: palette.text,
  fontSize: 20,
  lineHeight: 25,
  fontWeight: '800',
});

export const nestedScrollContentStyle = {
  padding: 16,
  gap: 14,
};

export const nestedGroupStyle = (palette, invalid) => ({
  borderWidth: 1,
  borderColor: invalid ? palette.danger : palette.border,
  borderRadius: 16,
  overflow: 'hidden',
  backgroundColor: palette.panel,
});

export const nestedGroupHeaderStyle = palette => ({
  paddingHorizontal: 14,
  paddingVertical: 12,
  borderBottomWidth: 1,
  borderBottomColor: palette.border,
});

export const nestedGroupTitleStyle = palette => ({
  color: palette.text,
  fontSize: 16,
  fontWeight: '800',
});

export const nestedGroupMetaStyle = (palette, invalid) => ({
  marginTop: 3,
  color: invalid ? palette.danger : palette.muted,
  fontSize: 12,
  fontWeight: invalid ? '700' : '500',
});

export const nestedOptionStyle = (palette, selected, disabled) => ({
  minHeight: 64,
  flexDirection: 'row',
  alignItems: 'center',
  gap: 12,
  paddingHorizontal: 14,
  paddingVertical: 10,
  borderTopWidth: 1,
  borderTopColor: palette.border,
  backgroundColor: selected ? palette.primarySoft : palette.modal,
  opacity: disabled ? 0.5 : 1,
});

export const nestedControlStyle = (palette, selected) => ({
  width: 25,
  height: 25,
  borderRadius: 13,
  borderWidth: 2,
  borderColor: selected ? palette.primary : palette.muted,
  alignItems: 'center',
  justifyContent: 'center',
});

export const nestedControlInnerStyle = palette => ({
  width: 11,
  height: 11,
  borderRadius: 6,
  backgroundColor: palette.primary,
});

export const nestedOptionCopyStyle = {flex: 1};

export const nestedOptionNameStyle = palette => ({
  color: palette.text,
  fontSize: 15,
  fontWeight: '700',
});

export const nestedOptionMetaStyle = (palette, invalid) => ({
  marginTop: 2,
  color: invalid ? palette.danger : palette.muted,
  fontSize: 12,
  fontWeight: invalid ? '700' : '500',
});

export const nestedOptionPriceStyle = palette => ({
  color: palette.text,
  fontSize: 13,
  fontWeight: '700',
});

export const nestedEditButtonStyle = palette => ({
  minWidth: 44,
  minHeight: 40,
  paddingHorizontal: 10,
  borderRadius: 12,
  alignItems: 'center',
  justifyContent: 'center',
  backgroundColor: palette.primarySoft,
});

export const nestedFooterStyle = palette => ({
  flexDirection: 'row',
  gap: 12,
  padding: 16,
  borderTopWidth: 1,
  borderTopColor: palette.border,
  backgroundColor: palette.modal,
});

export const nestedSecondaryButtonStyle = palette => ({
  minHeight: 50,
  paddingHorizontal: 18,
  alignItems: 'center',
  justifyContent: 'center',
  borderRadius: 14,
  borderWidth: 1,
  borderColor: palette.border,
});

export const nestedPrimaryButtonStyle = (palette, disabled) => ({
  flex: 1,
  minHeight: 50,
  alignItems: 'center',
  justifyContent: 'center',
  borderRadius: 14,
  backgroundColor: disabled ? palette.border : palette.primary,
});

export const nestedButtonTextStyle = (palette, primary) => ({
  color: primary ? palette.white : palette.text,
  fontSize: 15,
  fontWeight: '800',
});

export const nestedStateStyle = _palette => ({
  minHeight: 220,
  alignItems: 'center',
  justifyContent: 'center',
  gap: 12,
  padding: 24,
});

export const nestedStateTextStyle = palette => ({
  color: palette.muted,
  fontSize: 14,
  textAlign: 'center',
});
