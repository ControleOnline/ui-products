import React from 'react';
import {View, useWindowDimensions} from 'react-native';
import DefaultSearch from '@controleonline/ui-default/src/react/components/filters/DefaultSearch';
import DefaultToolbarAction from '@controleonline/ui-default/src/react/components/table/DefaultToolbarAction';
import DefaultTableControls from '@controleonline/ui-default/src/react/components/table/DefaultTableControls';

// Keep the shared controls above the hierarchy, regardless of the active catalog view.
export default function PdvCatalogToolbar({palette, filters, onChangeFilters, onSearch,
  value, onCategories, showProductControls}) {
  const {width} = useWindowDimensions();
  const mobile = width <= 760;
  return <View testID="pdv-catalog-toolbar" style={{padding:12, gap:8,
    flexDirection:'row', flexWrap:'wrap', alignItems:'center',
    backgroundColor:palette.cardBackground, borderBottomWidth:1,
    borderBottomColor:palette.cardBorder || palette.border}}>
    <View style={{flexGrow:1, flexBasis:mobile?'100%':320, maxWidth:mobile?undefined:620}}>
      <DefaultSearch storeName="products" searchKey="search" placeholder="Buscar produto por nome ou código"
        filters={filters} onChangeFilters={onChangeFilters} onSearch={onSearch} value={value}
        style={{width:'100%', minHeight:44}}/>
    </View>
    <View style={{flexDirection:'row', alignItems:'center', flexWrap:'wrap', gap:8}}>
      <DefaultToolbarAction action={{key:'catalog-categories',icon:'grid',label:'Categorias',
        accessibilityLabel:'Ver categorias',onPress:onCategories,style:{minHeight:44}}}/>
      {showProductControls && <DefaultTableControls storeName="products"/>}
    </View>
  </View>;
}
