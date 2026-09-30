export const customizeSummaryColumnStyle = ({palette, isLargeScreen}) => ({
  width: isLargeScreen ? 310 : '100%',
  backgroundColor: palette.panel,
  padding: isLargeScreen ? 22 : 16,
});

export const customizeMobileSummaryWrapStyle = {
  marginBottom: 14,
};

export const customizeSummaryCardStyle = ({palette}) => ({
  borderRadius: 16,
  backgroundColor: palette.white,
  borderWidth: 1,
  borderColor: palette.border,
  padding: 16,
});

export const customizeSummaryHeaderStyle = {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 12,
};

export const customizeSummaryTitleStyle = ({palette}) => ({
  color: palette.text,
  fontSize: 14,
  fontWeight: '900',
});

export const customizeSummaryKickerStyle = ({palette}) => ({
  color: palette.muted,
  fontSize: 11,
});

export const customizeSummaryTotalStyle = ({palette}) => ({
  color: palette.text,
  fontSize: 30,
  lineHeight: 34,
  fontWeight: '900',
  marginTop: 12,
});

export const customizeSummaryLineStyle = ({palette}) => ({
  flexDirection: 'row',
  justifyContent: 'space-between',
  gap: 16,
  paddingTop: 11,
  marginTop: 11,
  borderTopWidth: 1,
  borderTopColor: palette.borderSoft,
});

export const customizeSummaryLabelStyle = ({palette}) => ({
  color: palette.muted,
  fontSize: 14,
});

export const customizeSummaryValueStyle = ({palette}) => ({
  color: palette.text,
  fontSize: 14,
  fontWeight: '900',
});

export const customizeSummaryGroupListStyle = {
  marginTop: 12,
  gap: 8,
};

export const customizeSummaryGroupItemStyle = ({palette}) => ({
  flexDirection: 'row',
  justifyContent: 'space-between',
  gap: 12,
  paddingVertical: 5,
  borderBottomWidth: 1,
  borderBottomColor: palette.borderSoft,
});

export const customizeSummaryGroupNameStyle = ({palette}) => ({
  flex: 1,
  color: palette.muted,
  fontSize: 12,
});

export const customizeSummaryGroupStateStyle = ({palette, valid}) => ({
  color: valid ? palette.primary : palette.danger,
  fontSize: 12,
  fontWeight: '800',
});

export const customizeQuantityRowStyle = {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'space-between',
  marginTop: 16,
};

export const customizeQuantityStepperStyle = {
  flexDirection: 'row',
  alignItems: 'center',
  gap: 8,
};

export const customizeQuantityStepperButtonStyle = ({
  palette,
  disabled = false,
}) => ({
  width: 34,
  height: 34,
  borderRadius: 17,
  alignItems: 'center',
  justifyContent: 'center',
  backgroundColor: disabled ? palette.panelStrong : palette.panel,
  borderWidth: 1,
  borderColor: disabled ? palette.borderSoft : palette.border,
  opacity: disabled ? 0.72 : 1,
});

export const customizeQuantityPillStyle = ({palette}) => ({
  paddingHorizontal: 12,
  paddingVertical: 7,
  borderRadius: 999,
  backgroundColor: palette.panel,
  borderWidth: 1,
  borderColor: palette.border,
});

export const customizeQuantityPillTextStyle = ({palette}) => ({
  color: palette.muted,
  fontSize: 12,
  fontWeight: '800',
});

export const customizeFooterStyle = ({palette, isLargeScreen}) => ({
  paddingHorizontal: isLargeScreen ? 0 : 16,
  paddingVertical: isLargeScreen ? 0 : 14,
  marginTop: isLargeScreen ? 14 : 0,
  backgroundColor: isLargeScreen ? 'transparent' : 'rgba(255, 255, 255, 0.96)',
  borderTopWidth: isLargeScreen ? 0 : 1,
  borderTopColor: palette.border,
});

export const customizeFooterFloatingStyle = ({palette}) => ({
  position: 'absolute',
  left: 0,
  right: 0,
  bottom: 0,
  paddingHorizontal: 16,
  paddingTop: 12,
  paddingBottom: 14,
  backgroundColor: 'rgba(255, 255, 255, 0.96)',
  borderTopWidth: 1,
  borderTopColor: palette.border,
});

export const customizeSubmitButtonStyle = ({palette, disabled}) => ({
  minHeight: 48,
  borderRadius: 14,
  alignItems: 'center',
  justifyContent: 'center',
  backgroundColor: disabled ? palette.border : palette.primary,
  borderWidth: 1,
  borderColor: disabled ? palette.border : palette.primary,
});

export const customizeSubmitButtonTextStyle = ({palette, disabled}) => ({
  color: disabled ? palette.faint : palette.white,
  fontSize: 14,
  fontWeight: '900',
});
