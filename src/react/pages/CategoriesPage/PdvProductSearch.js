import React, {useMemo} from 'react';
import {Text,View,useWindowDimensions} from 'react-native';
import DefaultToolbarAction from '@controleonline/ui-default/src/react/components/table/DefaultToolbarAction';
import DefaultSearch from '@controleonline/ui-default/src/react/components/filters/DefaultSearch';
import DefaultSearchModal from '@controleonline/ui-default/src/react/components/table/DefaultSearchModal';
import {styles} from '../Categories.styles';

export default function PdvProductSearch({native, waiter, visible, onOpen, onClose, filters, onChangeFilters, onSearch, value, palette={}}) {
  const {width}=useWindowDimensions();
  if (native) return <>
    {width<=760&&<View style={{minHeight:52,paddingHorizontal:12,paddingVertical:4,flexDirection:'row',alignItems:'center',justifyContent:'space-between',borderBottomWidth:1,borderBottomColor:palette.cardBorder||palette.border}}>
      <Text accessibilityRole="header" style={{fontSize:16,fontWeight:'700',color:palette.cardText||palette.text}}>PDV</Text>
      <DefaultToolbarAction action={{key:'product-search',icon:'search',accessibilityLabel:'Buscar produto',onPress:onOpen,color:palette.cardText||palette.text,
        style:{minWidth:44,minHeight:44,justifyContent:'center',backgroundColor:palette.cardBackground,borderColor:palette.cardBorder||palette.border}}}/>
    </View>}
    <DefaultSearchModal storeName="products" searchKey="search"
    title="Buscar produto" searchPlaceholder="Nome ou código do produto" visible={visible}
    filters={filters} onChangeFilters={onChangeFilters} value={value} onSearch={onSearch} onClose={onClose}/></>;
  if (!waiter) return null;
  return <View style={[styles.searchStickyShell, styles.searchStickyShellCompact, {paddingHorizontal:8,paddingVertical:10}]}>
    <DefaultSearch filters={filters} onChangeFilters={onChangeFilters} onSearch={onSearch}
      placeholder={global.t?.t?.('products','input','search') || 'Buscar produto'} searchKey="search"
      storeName="products" style={[styles.searchInputWrap,{width:'100%'}]} value={value}/>
  </View>;
}

export function useNativeCatalogActions(setSearchOpen, setCategory, setSearch, setDraft) {
  const {width}=useWindowDimensions();
  return useMemo(() => [
    {key:'product-search',icon:'search',accessibilityLabel:'Buscar produto',onPress:()=>setSearchOpen(true)},
    {key:'catalog-categories',icon:'grid',label:'Categorias',accessibilityLabel:'Ver categorias',onPress:()=>{setCategory('');setSearch('');setDraft('');}},
  ].filter(action=>width>760||action.key!=='product-search'), [width,setSearchOpen,setCategory,setSearch,setDraft]);
}
export function PdvEmptyCategoryHint({loading}) {
  return loading ? null : <View style={{flex:1}}><Text style={styles.pdvCategoryEmptyHint}>
    {global.t?.t?.('categories','helper','selectCategory') || 'Selecione uma categoria para ver os produtos.'}
  </Text></View>;
}
