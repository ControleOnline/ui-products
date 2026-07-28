import React, {useMemo, useState} from 'react';
import {Text, TouchableOpacity, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useStore} from '@store';
import DefaultExternalFilters from '@controleonline/ui-default/src/react/components/filters/DefaultExternalFilters';
import DefaultTable from '@controleonline/ui-default/src/react/components/table/DefaultTable';
import {resolveThemePalette} from '@controleonline/../../src/styles/branding';
import {colors} from '@controleonline/../../src/styles/colors';
import styles from './ProductShowcasesPage.styles';

const TABS = [
  {key: 'showcases', label: 'Vitrines'},
  {key: 'items', label: 'Produtos'},
];

const ProductShowcasesPage = () => {
  const peopleStore = useStore('people');
  const themeStore = useStore('theme');
  const {currentCompany} = peopleStore.getters || {};
  const {colors: themeColors} = themeStore.getters || {};
  const [activeTab, setActiveTab] = useState('showcases');
  const [showcaseFilters, setShowcaseFilters] = useState({});
  const [itemFilters, setItemFilters] = useState({});

  const palette = useMemo(
    () =>
      resolveThemePalette(
        {...themeColors, ...(currentCompany?.theme?.colors || {})},
        colors,
      ),
    [currentCompany?.id, currentCompany?.theme?.colors, themeColors],
  );

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
      'order[showcase.name]': 'ASC',
      'order[product.product]': 'ASC',
    };
  }, [currentCompany?.id]);

  const renderTab = tab => {
    const isActive = tab.key === activeTab;

    return (
      <TouchableOpacity
        key={tab.key}
        activeOpacity={0.85}
        onPress={() => setActiveTab(tab.key)}
        style={[
          styles.tabButton,
          {
            backgroundColor: isActive ? palette.primary : palette.cardBackground || palette.surface,
            borderColor: isActive ? palette.primary : palette.cardBorder || palette.divider,
          },
        ]}>
        <Text
          style={[
            styles.tabButtonText,
            {color: isActive ? palette.buttonText : palette.textSecondary || palette.text},
          ]}>
          {tab.label}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView
      edges={['bottom']}
      style={[styles.container, {backgroundColor: palette.background}]}>
      <View style={styles.content}>
        <View style={styles.tabsRow}>{TABS.map(renderTab)}</View>
        {activeTab === 'showcases' ? (
          <>
            <DefaultExternalFilters
              accentColor={palette.primary}
              filters={showcaseFilters}
              onChangeFilters={setShowcaseFilters}
              storeName="product_showcases"
            />
            <DefaultTable
              accentColor={palette.primary}
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
              accentColor={palette.primary}
              filters={itemFilters}
              onChangeFilters={setItemFilters}
              storeName="product_showcase_items"
            />
            <DefaultTable
              accentColor={palette.primary}
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
