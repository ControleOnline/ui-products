export const buildCategoryButtonPalette = (companyColors, themeColors) => {
    const mergedThemeColors = {
      ...themeColors,
      ...(companyColors || {}),
    }

    return {
      buttonBackground: mergedThemeColors.buttonBackground,
      buttonBorder: mergedThemeColors.buttonBorder,
      buttonText: mergedThemeColors.buttonText,
      buttonIcon: mergedThemeColors.buttonIcon || mergedThemeColors.buttonText,
      buttonBackgroundSecondary: mergedThemeColors.buttonBackgroundSecondary,
      buttonBorderSecondary: mergedThemeColors.buttonBorderSecondary,
      buttonTextSecondary: mergedThemeColors.buttonTextSecondary,
      buttonIconSecondary:
        mergedThemeColors.buttonIconSecondary || mergedThemeColors.buttonTextSecondary,
      iconBackground: mergedThemeColors.iconBackground,
      iconColor: mergedThemeColors.iconColor,
      modalCloseIcon: mergedThemeColors.modalCloseIcon,
    }
}
