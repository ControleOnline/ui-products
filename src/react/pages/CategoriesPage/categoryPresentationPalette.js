import {useContext, useMemo} from 'react';
import {DefaultTableThemeContext} from '@controleonline/ui-default/src/react/components/table/useDefaultTableTheme';
import {resolveThemePalette} from '@controleonline/../../src/styles/branding';
import {colors} from '@controleonline/../../src/styles/colors';

// Resolved presentation owns surfaces; company colors still own the brand/actions.
export const resolveCategoryPresentationPalette = (palette, presentation, enabled) => {
  if (!enabled || !presentation) return palette;
  return {...palette,
    background: presentation.pageBackground || presentation.background || palette.background,
    cardBackground: presentation.cardBackground || palette.cardBackground,
    cardBorder: presentation.cardBorder || palette.cardBorder,
    border: presentation.cardBorder || palette.border,
    cardText: presentation.textPrimary || presentation.text || palette.cardText,
    text: presentation.textPrimary || presentation.text || palette.text,
    textSecondary: presentation.textMuted || presentation.textSecondary || palette.textSecondary,
  };
};

export const useCategoryPresentationPalette = (themeColors, companyColors, enabled) => {
  const presentation = useContext(DefaultTableThemeContext);
  return useMemo(() => resolveCategoryPresentationPalette(
    resolveThemePalette({...themeColors, ...companyColors}, colors), presentation, enabled,
  ), [themeColors, companyColors, presentation, enabled]);
};
