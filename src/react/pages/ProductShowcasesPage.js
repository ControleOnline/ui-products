import React, {useMemo, useState} from 'react';
import {Text, TouchableOpacity, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Feather';
import {useStore} from '@store';
import DefaultExternalFilters from '@controleonline/ui-default/src/react/components/filters/DefaultExternalFilters';
import DefaultTable from '@controleonline/ui-default/src/react/components/table/DefaultTable';
import {resolveThemePalette} from '@controleonline/../../src/styles/branding';
import {colors} from '@controleonline/../../src/styles/colors';
import {createStyles} from './ProductShowcasesPage.styles';

const TABS = [
  {key: 'showcases', label: 'Vitrines', icon: 'shopping-bag'},
  {key: 'items', label: 'Produtos', icon: 'package'},
];

const ProductShowcasesPage = () => {
  const peopleStore = useStore('people');
  const themeStore = useStore('theme');
  const {currentCompany} = peopleStore.getters || {};
  const {colors: themeColors} = themeStore.getters || {};
  const [activeTab, setActiveTab] = useState('showcases');
  const [showcaseFilters, setShowcaseFilters] = useState({});
  const [itemFilters, setItemFilters] = useState({});

  const palette = useMemo(() => {
    const mergedColors = {...themeColors, ...(currentCompany?.theme?.colors || {})};
    const resolvedPalette = resolveThemePalette(mergedColors, colors);

    return {
      pageBackground: mergedColors.pageBackground || resolvedPalette.background,
      cardBackground: mergedColors.cardBackground || resolvedPalette.cardBackground || resolvedPalette.surface,
      cardBorder: mergedColors.cardBorder || resolvedPalette.cardBorder || resolvedPalette.divider,
      textPrimary: mergedColors.textPrimary || resolvedPalette.text,
      textSecondary: mergedColors.textSecondary || resolvedPalette.textSecondary || resolvedPalette.text,
      buttonBackground: mergedColors.buttonBackground || resolvedPalette.primary,
      buttonBackgroundSecondary:
        mergedColors.buttonBackgroundSecondary || resolvedPalette.cardBackground || resolvedPalette.surface,
      buttonBorder: mergedColors.buttonBorder || resolvedPalette.primary,
      buttonBorderSecondary:
        mergedColors.buttonBorderSecondary || resolvedPalette.cardBorder || resolvedPalette.divider,
      buttonText: mergedColors.buttonText || resolvedPalette.buttonText,
      buttonTextSecondary:
        mergedColors.buttonTextSecondary || resolvedPalette.textSecondary || resolvedPalette.text,
    };
  }, [currentCompany?.id, currentCompany?.theme?.colors, themeColors]);
  const styles = useMemo(() => createStyles(palette), [palette]);

  const tabSurfaceColor = palette.buttonBackground;
  const tabSecondarySurfaceColor = palette.buttonBackgroundSecondary || palette.cardBackground;
  const tabHighlightColor = palette.buttonText;
  const tabBorderColor = palette.buttonBorderSecondary || palette.cardBorder;

  const showcaseRequestParams = useMemo(() => {
    if (!currentCompany?.id) {
      return {};
    }

    return {
      company: `/people/${currentCompany.id}`,
      'order[name]': 'ASC',
    };
  }, [currentCompany?.id]);

  const itemRequestParams = useMemo(() => {
    if (!currentCompany?.id) {
      return {};
    }

    return {
      'showcase.company': `/people/${currentCompany.id}`,
      'order[sortOrder]': 'ASC',
      'order[product.product]': 'ASC',
    };
  }, [currentCompany?.id]);

  const renderTab = tab => {
    const isActive = tab.key === activeTab;

    return (
      <TouchableOpacity
        key={tab.key}
        activeOpacity={0.88}
        onPress={() => setActiveTab(tab.key)}
        style={[
          styles.tabChip,
          {
            backgroundColor: isActive ? tabSurfaceColor : tabSecondarySurfaceColor,
            borderColor: isActive ? palette.buttonBorder : tabBorderColor,
          },
        ]}>
        <Icon
          name={tab.icon}
          size={14}
          color={isActive ? tabHighlightColor : palette.buttonTextSecondary || palette.textSecondary}
        />
        <Text
          style={[
            styles.tabChipText,
            {color: isActive ? tabHighlightColor : palette.buttonTextSecondary || palette.textSecondary},
          ]}>
          {tab.label}
        </Text>
      </TouchableOpacity>
    );
  };

  if (!currentCompany?.id) {
    return (
      <SafeAreaView
        edges={['bottom']}
        style={[styles.container, {backgroundColor: palette.pageBackground}]}>
        <View style={styles.centerState}>
          <Icon name="building" size={32} color={palette.textSecondary} />
          <Text style={styles.centerStateTitle}>Selecione uma empresa</Text>
          <Text style={styles.centerStateText}>
            As vitrines e produtos precisam de uma empresa ativa para carregar os dados.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      edges={['bottom']}
      style={[styles.container, {backgroundColor: palette.pageBackground}]}>
      <View style={styles.topBar}>
        <View style={styles.tabsRow}>{TABS.map(renderTab)}</View>
      </View>

      <View style={styles.tablesContainer}>
        {activeTab === 'showcases' ? (
          <>
            <DefaultExternalFilters
              accentColor={palette.buttonBackground}
              filters={showcaseFilters}
              onChangeFilters={setShowcaseFilters}
              storeName="product_showcases"
            />
            <DefaultTable
              accentColor={palette.buttonBackground}
              filters={showcaseFilters}
              onFilterChange={setShowcaseFilters}
              requestParams={showcaseRequestParams}
              searchProps={{searchKey: 'search'}}
              showTotalItemsInCompactToolbar
              storeName="product_showcases"
            />
          </>
        ) : (
          <>
            <DefaultExternalFilters
              accentColor={palette.buttonBackground}
              filters={itemFilters}
              onChangeFilters={setItemFilters}
              storeName="product_showcase_items"
            />
            <DefaultTable
              accentColor={palette.buttonBackground}
              filters={itemFilters}
              onFilterChange={setItemFilters}
              requestParams={itemRequestParams}
              searchProps={{searchKey: 'search'}}
              showTotalItemsInCompactToolbar
              storeName="product_showcase_items"
            />
          </>
        )}
      </View>
    </SafeAreaView>
  );
};

export default ProductShowcasesPage;
