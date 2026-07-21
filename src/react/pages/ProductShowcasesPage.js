import React, {useMemo, useState} from 'react';
import {View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useStore} from '@store';
import DefaultExternalFilters from '@controleonline/ui-default/src/react/components/filters/DefaultExternalFilters';
import DefaultTable from '@controleonline/ui-default/src/react/components/table/DefaultTable';
import {resolveThemePalette} from '@controleonline/../../src/styles/branding';
import {colors} from '@controleonline/../../src/styles/colors';
import styles from './ProductShowcasesPage.styles';

const ProductShowcasesPage = () => {
  const peopleStore = useStore('people');
  const themeStore = useStore('theme');
  const {currentCompany} = peopleStore.getters || {};
  const {colors: themeColors} = themeStore.getters || {};
  const [filters, setFilters] = useState({});

  const palette = useMemo(
    () =>
      resolveThemePalette(
        {...themeColors, ...(currentCompany?.theme?.colors || {})},
        colors,
      ),
    [currentCompany?.id, currentCompany?.theme?.colors, themeColors],
  );

  const requestParams = useMemo(() => {
    if (!currentCompany?.id) {
      return {};
    }

    return {
      'showcase.company': `/people/${currentCompany.id}`,
      'order[showcase.name]': 'ASC',
      'order[product.product]': 'ASC',
    };
  }, [currentCompany?.id]);

  return (
    <SafeAreaView
      edges={['bottom']}
      style={[styles.container, {backgroundColor: palette.background}]}>
      <View style={styles.content}>
        <DefaultExternalFilters
          accentColor={palette.primary}
          filters={filters}
          onChangeFilters={setFilters}
          storeName="product_showcase_items"
        />
        <DefaultTable
          accentColor={palette.primary}
          filters={filters}
          onFilterChange={setFilters}
          requestParams={requestParams}
          searchProps={{searchKey: 'search'}}
          showTotalItemsInCompactToolbar
          storeName="product_showcase_items"
        />
      </View>
    </SafeAreaView>
  );
};

export default ProductShowcasesPage;
