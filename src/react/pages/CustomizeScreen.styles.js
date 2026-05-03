const hexToRgba = (hex, alpha = 1) => {
  const cleanHex = String(hex || '').replace('#', '');

  if (!/^[0-9a-f]{6}$/i.test(cleanHex)) {
    return `rgba(31, 143, 189, ${alpha})`;
  }

  const red = parseInt(cleanHex.slice(0, 2), 16);
  const green = parseInt(cleanHex.slice(2, 4), 16);
  const blue = parseInt(cleanHex.slice(4, 6), 16);

  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
};

export const resolveCustomizePalette = colors => {
  const primary = colors?.primary || colors?.accent || '#1F8FBD';
  const secondary = colors?.secondary || '#0F2D4A';

  return {
    primary,
    secondary,
    primarySoft: hexToRgba(primary, 0.11),
    primaryBorder: hexToRgba(primary, 0.28),
    page: '#EAF1F6',
    modal: '#FFFFFF',
    panel: '#F7FBFE',
    panelStrong: '#EEF6FB',
    border: '#D6E5EF',
    borderSoft: '#E4EEF5',
    text: '#13283A',
    muted: '#60768A',
    faint: '#8AA0B2',
    danger: '#C2410C',
    shadow: '#0F2233',
    white: '#FFFFFF',
  };
};

export const customizeScreenRootStyle = ({palette, isLargeScreen}) => ({
  flex: 1,
  width: '100%',
  height: '100%',
  backgroundColor: isLargeScreen ? 'rgba(10, 18, 26, 0.48)' : palette.page,
  paddingHorizontal: isLargeScreen ? 28 : 0,
  paddingVertical: isLargeScreen ? 24 : 0,
  alignItems: 'center',
  justifyContent: isLargeScreen ? 'center' : 'flex-start',
});

export const customizeScreenBackdropStyle = ({
  isLargeScreen,
  modalHeight,
  modalWidth,
}) => ({
  width: isLargeScreen ? modalWidth : '100%',
  maxWidth: isLargeScreen ? modalWidth : '100%',
  height: isLargeScreen ? modalHeight : '100%',
  minHeight: isLargeScreen ? modalHeight : '100%',
  flex: isLargeScreen ? 0 : 1,
  maxHeight: isLargeScreen ? modalHeight : '100%',
  zIndex: 1,
});

export const customizeBackdropPressableStyle = {
  position: 'absolute',
  top: 0,
  right: 0,
  bottom: 0,
  left: 0,
  zIndex: 0,
};

export const customizeModalStyle = ({
  palette,
  isLargeScreen,
  modalHeight,
  modalWidth,
}) => ({
  ...(isLargeScreen
    ? {
        width: modalWidth,
        height: modalHeight,
        minHeight: modalHeight,
      }
    : {
        flex: 1,
        width: '100%',
        height: '100%',
        minHeight: '100%',
      }),
  flexDirection: isLargeScreen ? 'row' : 'column',
  overflow: 'hidden',
  backgroundColor: palette.modal,
  borderRadius: isLargeScreen ? 24 : 0,
  borderWidth: isLargeScreen ? 1 : 0,
  borderColor: palette.border,
  shadowColor: palette.shadow,
  shadowOffset: {width: 0, height: 18},
  shadowOpacity: isLargeScreen ? 0.24 : 0,
  shadowRadius: 34,
  elevation: isLargeScreen ? 12 : 0,
});

export const customizeMainColumnStyle = ({palette, isLargeScreen}) => ({
  flex: 1,
  backgroundColor: palette.modal,
  borderRightWidth: isLargeScreen ? 1 : 0,
  borderRightColor: palette.border,
});

export const customizeScrollStyle = {
  flex: 1,
};

export const customizeScrollContentStyle = ({isLargeScreen}) => ({
  paddingHorizontal: isLargeScreen ? 28 : 16,
  paddingTop: isLargeScreen ? 26 : 16,
  paddingBottom: isLargeScreen ? 32 : 116,
});

export const customizeHeaderStyle = ({isLargeScreen}) => ({
  flexDirection: isLargeScreen ? 'row' : 'column-reverse',
  gap: isLargeScreen ? 28 : 14,
  alignItems: isLargeScreen ? 'flex-start' : 'stretch',
  marginBottom: 20,
});

export const customizeHeaderContentStyle = {
  flex: 1,
  minWidth: 0,
};

export const customizeEyebrowStyle = ({palette}) => ({
  color: palette.primary,
  fontSize: 11,
  fontWeight: '800',
  letterSpacing: 0.8,
  textTransform: 'uppercase',
  marginBottom: 12,
});

export const customizeTitleRowStyle = {
  flexDirection: 'row',
  alignItems: 'flex-start',
  justifyContent: 'space-between',
  gap: 16,
};

export const customizeTitleStyle = ({palette, isLargeScreen}) => ({
  flex: 1,
  color: palette.text,
  fontSize: isLargeScreen ? 32 : 24,
  lineHeight: isLargeScreen ? 35 : 28,
  fontWeight: '900',
});

export const customizeCloseButtonStyle = ({palette}) => ({
  width: 38,
  height: 38,
  borderRadius: 19,
  alignItems: 'center',
  justifyContent: 'center',
  backgroundColor: palette.panel,
  borderWidth: 1,
  borderColor: palette.border,
});

export const customizeDescriptionStyle = ({palette, isLargeScreen}) => ({
  color: palette.muted,
  fontSize: isLargeScreen ? 14 : 13,
  lineHeight: isLargeScreen ? 20 : 18,
  marginTop: 14,
  maxWidth: 560,
});

export const customizeChipRowStyle = {
  flexDirection: 'row',
  flexWrap: 'wrap',
  gap: 8,
  marginTop: 18,
};

export const customizeChipStyle = ({palette}) => ({
  paddingHorizontal: 10,
  paddingVertical: 6,
  borderRadius: 999,
  backgroundColor: palette.panel,
  borderWidth: 1,
  borderColor: palette.border,
});

export const customizeChipTextStyle = ({palette}) => ({
  color: palette.muted,
  fontSize: 12,
  fontWeight: '700',
});

export const customizeHeroImageWrapStyle = ({palette, isLargeScreen}) => ({
  width: isLargeScreen ? 330 : '100%',
  height: isLargeScreen ? 222 : 220,
  borderRadius: 18,
  overflow: 'hidden',
  backgroundColor: palette.panelStrong,
  borderWidth: 1,
  borderColor: palette.border,
});

export const customizeHeroImageStyle = {
  width: '100%',
  height: '100%',
};

export const customizeHeroPlaceholderStyle = ({palette}) => ({
  width: '100%',
  height: '100%',
  alignItems: 'center',
  justifyContent: 'center',
  backgroundColor: palette.primarySoft,
});

export const customizeHeroPlaceholderTextStyle = ({palette}) => ({
  color: palette.primary,
  fontSize: 34,
  fontWeight: '900',
});

export const customizeGroupsStackStyle = {
  gap: 12,
};

export const customizeGroupCardStyle = ({palette, isInvalid}) => ({
  overflow: 'hidden',
  borderRadius: 16,
  backgroundColor: palette.panel,
  borderWidth: 1,
  borderColor: isInvalid ? hexToRgba(palette.danger, 0.38) : palette.border,
});

export const customizeGroupHeaderStyle = ({palette}) => ({
  paddingHorizontal: 14,
  paddingTop: 13,
  paddingBottom: 10,
  borderBottomWidth: 1,
  borderBottomColor: palette.borderSoft,
});

export const customizeGroupTitleRowStyle = {
  flexDirection: 'row',
  alignItems: 'flex-start',
  justifyContent: 'space-between',
  gap: 12,
};

export const customizeGroupTitleStyle = ({palette}) => ({
  flex: 1,
  color: palette.text,
  fontSize: 15,
  lineHeight: 19,
  fontWeight: '900',
});

export const customizeGroupRuleStyle = ({palette}) => ({
  color: palette.muted,
  fontSize: 11,
  fontWeight: '700',
  textAlign: 'right',
});

export const customizeGroupMetaStyle = ({palette}) => ({
  color: palette.muted,
  fontSize: 12,
  marginTop: 4,
});

export const customizeGroupErrorStyle = ({palette}) => ({
  color: palette.danger,
  fontSize: 12,
  marginTop: 7,
  fontWeight: '800',
});

export const customizeOptionsStackStyle = {
  padding: 10,
  gap: 8,
};

export const customizeOptionTouchableStyle = ({palette, selected, disabled}) => ({
  opacity: disabled ? 0.48 : 1,
  flexDirection: 'row',
  alignItems: 'center',
  gap: 12,
  minHeight: 58,
  paddingHorizontal: 12,
  paddingVertical: 9,
  borderRadius: 12,
  backgroundColor: selected ? palette.primarySoft : palette.white,
  borderWidth: 1,
  borderColor: selected ? palette.primaryBorder : palette.borderSoft,
});

export const customizeOptionControlStyle = ({palette, selected}) => ({
  width: 22,
  height: 22,
  borderRadius: 11,
  borderWidth: 2,
  borderColor: selected ? palette.primary : palette.faint,
  backgroundColor: selected ? palette.primary : palette.white,
  alignItems: 'center',
  justifyContent: 'center',
});

export const customizeOptionControlInnerStyle = ({palette}) => ({
  width: 8,
  height: 8,
  borderRadius: 4,
  backgroundColor: palette.white,
});

export const customizeOptionImageWrapStyle = ({palette}) => ({
  width: 36,
  height: 36,
  borderRadius: 9,
  overflow: 'hidden',
  alignItems: 'center',
  justifyContent: 'center',
  backgroundColor: palette.panelStrong,
  borderWidth: 1,
  borderColor: palette.borderSoft,
});

export const customizeOptionImageStyle = {
  width: '100%',
  height: '100%',
};

export const customizeOptionPlaceholderTextStyle = ({palette}) => ({
  color: palette.primary,
  fontWeight: '900',
  fontSize: 13,
});

export const customizeOptionBodyStyle = {
  flex: 1,
  minWidth: 0,
};

export const customizeOptionNameStyle = ({palette}) => ({
  color: palette.text,
  fontSize: 14,
  fontWeight: '700',
});

export const customizeOptionMetaStyle = ({palette}) => ({
  color: palette.muted,
  fontSize: 11,
  marginTop: 3,
});

export const customizeOptionPriceStyle = ({palette, selected}) => ({
  color: selected ? palette.primary : palette.muted,
  fontSize: 13,
  fontWeight: '900',
  marginLeft: 8,
});

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
